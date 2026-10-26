//! Instaladores oficiais, sem login ou alteração dos perfis de shell.
use crate::{
    adapters::{Invocation, executable},
    error::{AppError, Result},
    process::Runner,
    state,
};
use serde_json::{Value, json};
use sha2::{Digest, Sha512};
use std::{
    fs,
    io::Read,
    os::unix::fs::{OpenOptionsExt, PermissionsExt},
    path::{Path, PathBuf},
};

const AGY_BASE: &str = "https://antigravity-cli-auto-updater-974169037036.us-central1.run.app";

pub fn source(id: &str) -> Result<&'static str> {
    match id {
        "mise" => Ok("https://mise.run"),
        "homebrew" => Ok("https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh"),
        "herdr" => Ok("https://herdr.dev/install.sh"),
        "codex" => Ok("https://chatgpt.com/codex/install.sh"),
        "claude" => Ok("https://claude.ai/install.sh"),
        "opencode" => Ok("https://opencode.ai/install"),
        "kimi" => Ok("https://code.kimi.com/kimi-code/install.sh"),
        "antigravity" => Ok(AGY_BASE),
        _ => Err(AppError::unsupported("Fornecedor não reconhecido")),
    }
}

/// O artefato Linux amd64 atual usa PCLMUL; recusar antes do download evita SIGILL.
pub fn validate_cpu(id: &str) -> Result<()> {
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    if id == "antigravity" && !std::is_x86_feature_detected!("pclmulqdq") {
        return Err(AppError::unsupported(
            "Antigravity Linux amd64 exige PCLMUL no processador; recurso indisponível nesta máquina",
        ));
    }
    let _ = id;
    Ok(())
}

struct Staging(PathBuf);
impl Staging {
    fn new() -> Result<Self> {
        let home = home()?;
        let root = home.join(".cache/setupvibe");
        state::private_dir(&root)?;
        let path = root.join(uuid::Uuid::new_v4().to_string());
        state::private_dir(&path)?;
        Ok(Self(path))
    }
}
impl Drop for Staging {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

fn home() -> Result<PathBuf> {
    let home = std::env::var_os("HOME")
        .map(PathBuf::from)
        .filter(|p| p.is_absolute())
        .ok_or_else(|| AppError::precondition("HOME absoluto é obrigatório"))?;
    Ok(home)
}

/// Downloads usam somente HTTPS, limite de tamanho e o timeout do executor.
pub fn download(url: &str, destination: &Path, runner: &Runner, limit: u64) -> Result<()> {
    if !url.starts_with("https://") {
        return Err(AppError::precondition("Download exige HTTPS"));
    }
    let curl = executable("curl").ok_or_else(|| AppError::precondition("curl ausente"))?;
    fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .mode(0o600)
        .open(destination)?;
    runner.checked(
        &curl.to_string_lossy(),
        &[
            "--fail".into(),
            "--silent".into(),
            "--show-error".into(),
            "--location".into(),
            "--proto".into(),
            "=https".into(),
            "--proto-redir".into(),
            "=https".into(),
            "--connect-timeout".into(),
            "15".into(),
            "--max-time".into(),
            runner.timeout.as_secs().to_string(),
            "--max-filesize".into(),
            limit.to_string(),
            "--output".into(),
            destination.to_string_lossy().into(),
            url.into(),
        ],
    )?;
    let size = fs::metadata(destination)?.len();
    if size == 0 || size > limit {
        return Err(AppError::precondition("Tamanho inválido do download"));
    }
    Ok(())
}

fn prerequisites(id: &str, runner: &Runner) -> Result<()> {
    if cfg!(target_os = "linux") {
        let required = [
            ("curl", "curl"),
            ("bash", "bash"),
            ("tar", "tar"),
            ("gzip", "gzip"),
            ("unzip", "unzip"),
            ("xz", "xz-utils"),
        ];
        let mut packages: Vec<String> = required
            .iter()
            .filter(|(command, _)| executable(command).is_none())
            .map(|(_, p)| (*p).into())
            .collect();
        if id == "homebrew" {
            packages.extend(["build-essential", "procps", "file", "git"].map(String::from));
        }
        if !packages.is_empty() {
            packages.push("ca-certificates".into());
            crate::adapters::apply(
                &Invocation {
                    executable: "apt-get".into(),
                    privileged: true,
                    args: [
                        vec![
                            "install".into(),
                            "--yes".into(),
                            "--no-install-recommends".into(),
                            "-o".into(),
                            "Dpkg::Options::=--force-confold".into(),
                        ],
                        packages,
                    ]
                    .concat(),
                },
                runner,
            )?;
        }
    }
    Ok(())
}

pub fn install(id: &str, runner: &Runner) -> Result<()> {
    let url = source(id)?;
    validate_cpu(id)?;
    if id == "homebrew" && unsafe { libc::geteuid() } == 0 {
        return Err(AppError::precondition(
            "Homebrew exige usuário sem privilégios de root",
        ));
    }
    prerequisites(id, runner)?;
    let staging = Staging::new()?;
    if id == "antigravity" {
        return antigravity(&staging.0, runner);
    }
    let script = staging.0.join("installer.sh");
    download(url, &script, runner, 8 * 1024 * 1024)?;
    let text = fs::read_to_string(&script)?;
    if !text.starts_with("#!") {
        return Err(AppError::precondition("Resposta não é um instalador shell"));
    }
    let home = home()?;
    // Codex vê seu destino no PATH e não escreve um bloco no perfil do usuário.
    let mut paths = vec![home.join(".local/bin")];
    paths.extend(std::env::split_paths(
        &std::env::var_os("PATH").unwrap_or_default(),
    ));
    let path = std::env::join_paths(paths).map_err(|_| AppError::invalid("PATH inválido"))?;
    let mut args = vec![
        "NONINTERACTIVE=1".into(),
        "CI=1".into(),
        "CODEX_NON_INTERACTIVE=1".into(),
        "KIMI_NO_MODIFY_PATH=1".into(),
        format!("PATH={}", path.to_string_lossy()),
        "/bin/bash".into(),
        script.to_string_lossy().into_owned(),
    ];
    if id == "opencode" {
        args.push("--no-modify-path".into());
    }
    if id == "claude" {
        args.push("stable".into());
    }
    runner.checked("/usr/bin/env", &args)?;
    Ok(())
}

/// Usa o manifesto oficial sem executar o configurador de aliases do Antigravity.
fn antigravity(staging: &Path, runner: &Runner) -> Result<()> {
    let os = if cfg!(target_os = "macos") {
        "darwin"
    } else {
        "linux"
    };
    let arch = if cfg!(target_arch = "aarch64") {
        "arm64"
    } else {
        "amd64"
    };
    let manifest = staging.join("manifest.json");
    download(
        &format!("{AGY_BASE}/manifests/{os}_{arch}.json"),
        &manifest,
        runner,
        1024 * 1024,
    )?;
    let value: Value = serde_json::from_slice(&fs::read(manifest)?)?;
    let url = value["url"]
        .as_str()
        .ok_or_else(|| AppError::precondition("Manifesto sem URL"))?;
    let expected = value["sha512"]
        .as_str()
        .filter(|s| s.len() == 128 && s.bytes().all(|b| b.is_ascii_hexdigit()))
        .ok_or_else(|| AppError::precondition("Manifesto sem SHA-512 válido"))?;
    let payload = staging.join("payload");
    download(url, &payload, runner, 1024 * 1024 * 1024)?;
    let mut hash = Sha512::new();
    let mut file = fs::File::open(&payload)?;
    let mut buffer = [0u8; 65536];
    loop {
        let n = file.read(&mut buffer)?;
        if n == 0 {
            break;
        }
        hash.update(&buffer[..n]);
    }
    if format!("{:x}", hash.finalize()) != expected.to_ascii_lowercase() {
        return Err(AppError::precondition("SHA-512 do Antigravity não confere"));
    }
    let binary = if url.split('?').next().unwrap_or(url).ends_with(".tar.gz") {
        runner.checked(
            "tar",
            &[
                "-xzf".into(),
                payload.to_string_lossy().into(),
                "-C".into(),
                staging.to_string_lossy().into(),
                "antigravity".into(),
            ],
        )?;
        staging.join("antigravity")
    } else {
        payload
    };
    if !fs::symlink_metadata(&binary)?.is_file() {
        return Err(AppError::precondition("Artefato deve ser arquivo regular"));
    }
    let destination = home()?.join(".local/bin");
    fs::create_dir_all(&destination)?;
    let candidate = destination.join(format!(".agy-{}", uuid::Uuid::new_v4()));
    fs::copy(&binary, &candidate)?;
    fs::set_permissions(&candidate, fs::Permissions::from_mode(0o755))?;
    if let Err(error) = runner.checked(&candidate.to_string_lossy(), &["--version".into()]) {
        let _ = fs::remove_file(&candidate);
        return Err(error);
    }
    fs::rename(candidate, destination.join("agy"))?;
    Ok(())
}

pub fn updates(id: &str) -> Result<Value> {
    Ok(
        json!({"component":id,"owner":format!("vendor:{id}"),"available":null,
        "source":source(id)?,"note":"O fornecedor resolve a versão no install/update; consulta não presume atualização disponível"}),
    )
}

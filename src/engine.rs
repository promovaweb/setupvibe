//! Instalação do Engine oficial sem remover pacotes conflitantes ou dados existentes.
use crate::{
    adapters::{self, Invocation},
    domain::Platform,
    error::{AppError, Result},
    process::Runner,
    state,
};
use std::{fs, path::PathBuf};

pub fn install(runner: &Runner, update: bool) -> Result<()> {
    let platform = Platform::detect()?;
    let suite = match (platform.distribution.as_str(), platform.version.as_str()) {
        ("debian", "12") => "bookworm",
        ("debian", "13") => "trixie",
        ("ubuntu", "24.04") => "noble",
        _ => {
            return Err(AppError::unsupported(
                "Docker Engine sem repositório para esta distribuição",
            ));
        }
    };
    if !update {
        for package in [
            "docker.io",
            "docker-compose",
            "docker-compose-v2",
            "docker-doc",
            "docker-buildx",
            "podman-docker",
            "containerd",
            "runc",
        ] {
            let result = runner.run(
                "dpkg-query",
                &["-W".into(), "-f=${db:Status-Status}".into(), package.into()],
                None,
            )?;
            if result.code == 0 && result.stdout == "installed" {
                return Err(AppError::precondition(format!(
                    "Pacote conflitante {package} preservado; migração exige tratamento separado"
                )));
            }
        }
        apt(runner, &["ca-certificates", "curl"], false)?;
        let official = fs::read_dir("/etc/apt/sources.list.d")?
            .filter_map(std::result::Result::ok)
            .any(|e| {
                fs::read_to_string(e.path()).is_ok_and(|s| {
                    s.contains(&format!(
                        "https://download.docker.com/linux/{}",
                        platform.distribution
                    ))
                })
            });
        if !official {
            let home = std::env::var_os("HOME")
                .map(PathBuf::from)
                .ok_or_else(|| AppError::precondition("HOME ausente"))?;
            let dir = home
                .join(".cache/setupvibe")
                .join(uuid::Uuid::new_v4().to_string());
            state::private_dir(&dir)?;
            let outcome = (|| -> Result<()> {
                let key = dir.join("docker.asc");
                crate::vendor::download(
                    &format!(
                        "https://download.docker.com/linux/{}/gpg",
                        platform.distribution
                    ),
                    &key,
                    runner,
                    1024 * 1024,
                )?;
                if !fs::read_to_string(&key)?.starts_with("-----BEGIN PGP PUBLIC KEY BLOCK-----") {
                    return Err(AppError::precondition("Chave Docker inválida"));
                }
                let arch = if platform.architecture == "aarch64" {
                    "arm64"
                } else {
                    "amd64"
                };
                let source = format!(
                    "Types: deb\nURIs: https://download.docker.com/linux/{}\nSuites: {suite}\nComponents: stable\nArchitectures: {arch}\nSigned-By: /etc/apt/keyrings/setupvibe-docker.asc\n",
                    platform.distribution
                );
                let sources = dir.join("docker.sources");
                fs::write(&sources, source)?;
                for target in [
                    "/etc/apt/keyrings/setupvibe-docker.asc",
                    "/etc/apt/sources.list.d/setupvibe-docker.sources",
                ] {
                    if std::path::Path::new(target).symlink_metadata().is_ok() {
                        return Err(AppError::precondition(
                            "Arquivo APT SetupVibe já existe; preservado para revisão",
                        ));
                    }
                }
                privileged(
                    runner,
                    "install",
                    &["-d", "-m", "0755", "/etc/apt/keyrings"],
                )?;
                privileged(
                    runner,
                    "install",
                    &[
                        "-m",
                        "0644",
                        &key.to_string_lossy(),
                        "/etc/apt/keyrings/setupvibe-docker.asc",
                    ],
                )?;
                privileged(
                    runner,
                    "install",
                    &[
                        "-m",
                        "0644",
                        &sources.to_string_lossy(),
                        "/etc/apt/sources.list.d/setupvibe-docker.sources",
                    ],
                )?;
                Ok(())
            })();
            let _ = fs::remove_dir_all(&dir);
            outcome?;
        }
    }
    apt(
        runner,
        &[
            "docker-ce",
            "docker-ce-cli",
            "containerd.io",
            "docker-buildx-plugin",
            "docker-compose-plugin",
        ],
        update,
    )?;
    if std::path::Path::new("/run/systemd/system").is_dir() {
        privileged(runner, "systemctl", &["enable", "--now", "docker"])?;
    }
    Ok(())
}

fn privileged(runner: &Runner, exe: &str, args: &[&str]) -> Result<()> {
    adapters::apply(
        &Invocation {
            executable: exe.into(),
            args: args.iter().map(|v| (*v).into()).collect(),
            privileged: true,
        },
        runner,
    )
}
fn apt(runner: &Runner, packages: &[&str], update: bool) -> Result<()> {
    let mut args = vec![
        "install",
        "--yes",
        "--no-install-recommends",
        "-o",
        "Dpkg::Options::=--force-confold",
        "-o",
        "DPkg::Lock::Timeout=60",
    ];
    if update {
        args.push("--only-upgrade");
    }
    args.extend(packages);
    privileged(runner, "apt-get", &args)
}

//! Supervisão nativa com recibo de propriedade e configuração explícita.
use crate::{
    adapters::executable,
    domain::{Edition, Os},
    error::{AppError, Result},
    metrics,
    process::Runner,
    state::{self, Observation},
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fs::{self, OpenOptions},
    io::Write,
    os::unix::fs::{DirBuilderExt, MetadataExt, OpenOptionsExt},
    path::{Path, PathBuf},
};

const UNIT: &str = "setupvibe-collector.service";
const LABEL: &str = "dev.setupvibe.collector";
const MARKER: &str = "setupvibe-managed-collector-v2";

#[derive(Debug, Clone, Copy, Serialize, Deserialize, clap::ValueEnum, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Scope {
    User,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Config {
    pub schema_version: u32,
    pub os: Os,
    pub scope: Scope,
    pub edition: Edition,
    pub data_dir: PathBuf,
    pub binary: PathBuf,
    pub home: PathBuf,
    pub interval: u64,
    pub environment: BTreeMap<String, String>,
    pub version: String,
    pub unit_hash: String,
    pub binary_hash: String,
}

fn home() -> Result<PathBuf> {
    let home = PathBuf::from(
        std::env::var_os("HOME").ok_or_else(|| AppError::precondition("HOME ausente"))?,
    );
    path_text(&home)?;
    Ok(home)
}
fn path_text(path: &Path) -> Result<&str> {
    let text = path
        .to_str()
        .filter(|s| path.is_absolute() && !s.chars().any(char::is_control))
        .ok_or_else(|| {
            AppError::invalid("Caminho deve ser absoluto, UTF-8 e sem caracteres de controle")
        })?;
    if path
        .components()
        .any(|c| matches!(c, std::path::Component::ParentDir))
    {
        return Err(AppError::invalid("Caminho não pode conter .."));
    }
    Ok(text)
}
fn unit_path(os: Os, scope: Scope, home: &Path) -> Result<PathBuf> {
    match (os, scope) {
        (Os::Linux, Scope::User) => Ok(home.join(".config/systemd/user").join(UNIT)),
        (Os::Linux, Scope::System) => Ok(PathBuf::from("/etc/systemd/system").join(UNIT)),
        (Os::Macos, Scope::User) => Ok(home
            .join("Library/LaunchAgents")
            .join(format!("{LABEL}.plist"))),
        _ => Err(AppError::unsupported(
            "macOS usa LaunchAgent do usuário; Server macOS não suportada",
        )),
    }
}
fn receipt(path: &Path) -> PathBuf {
    path.with_extension("setupvibe.json")
}
fn hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
fn quote(value: &str) -> String {
    format!(
        "\"{}\"",
        value
            .replace('\\', "\\\\")
            .replace('"', "\\\"")
            .replace('%', "%%")
    )
}
fn xml(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

pub fn configuration(
    directory: &Path,
    edition: Edition,
    os: Os,
    scope: Option<Scope>,
    interval: u64,
) -> Result<Config> {
    path_text(directory)?;
    if !(1..=3600).contains(&interval) {
        return Err(AppError::invalid(
            "Intervalo deve ficar entre 1 e 3600 segundos",
        ));
    }
    if os == Os::Macos && edition == Edition::Server {
        return Err(AppError::unsupported("Server exige Linux"));
    }
    let home = home()?;
    let scope = scope.unwrap_or(if edition == Edition::Server {
        Scope::System
    } else {
        Scope::User
    });
    unit_path(os, scope, &home)?;
    let mut environment = BTreeMap::from([
        ("HOME".into(), path_text(&home)?.into()),
        (
            "PATH".into(),
            format!(
                "{}/.local/bin:{}/.docker/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
                home.display(),
                home.display()
            ),
        ),
    ]);
    for key in ["DOCKER_HOST", "DOCKER_CONTEXT"] {
        if let Ok(value) = std::env::var(key)
            && !value.is_empty()
        {
            if value.chars().any(char::is_control)
                || (key == "DOCKER_HOST" && !value.starts_with("unix:///"))
            {
                return Err(AppError::invalid(
                    "Coletor supervisionado exige contexto Docker local sem caracteres de controle",
                ));
            }
            environment.insert(key.into(), value);
        }
    }
    Ok(Config {
        schema_version: 1,
        os,
        scope,
        edition,
        data_dir: directory.into(),
        binary: directory.join("collector/bin/setupvibe"),
        home,
        interval,
        environment,
        version: crate::VERSION.into(),
        unit_hash: String::new(),
        binary_hash: String::new(),
    })
}

pub fn render(config: &Config) -> Result<String> {
    let args = vec![
        path_text(&config.binary)?.into(),
        "--data-dir".into(),
        path_text(&config.data_dir)?.into(),
        "--edition".into(),
        match config.edition {
            Edition::Desktop => "desktop",
            Edition::Server => "server",
        }
        .into(),
        "--output".into(),
        "json".into(),
        "collector".into(),
        "run".into(),
        "--interval".into(),
        config.interval.to_string(),
        "--yes".into(),
    ];
    match config.os {
        Os::Linux => {
            let environment = config
                .environment
                .iter()
                .map(|(k, v)| format!("Environment={}\n", quote(&format!("{k}={v}"))))
                .collect::<String>();
            Ok(format!(
                "# {MARKER}\n[Unit]\nDescription=Coletor de métricas do SetupVibe 2\nAfter=network.target\nStartLimitIntervalSec=60\nStartLimitBurst=5\n\n[Service]\nType=exec\nExecStart={}\n{environment}Restart=on-failure\nRestartSec=5\nSuccessExitStatus=130\nTimeoutStopSec=15\nKillMode=control-group\nUMask=0077\nNoNewPrivileges=true\n\n[Install]\nWantedBy={}\n",
                args.iter()
                    .enumerate()
                    .map(|(i, a)| quote(&if i == 0 {
                        a.clone()
                    } else {
                        a.replace('$', "$$")
                    }))
                    .collect::<Vec<_>>()
                    .join(" "),
                if config.scope == Scope::System {
                    "multi-user.target"
                } else {
                    "default.target"
                }
            ))
        }
        Os::Macos => {
            let args = args
                .iter()
                .map(|a| format!("<string>{}</string>", xml(a)))
                .collect::<String>();
            let environment = config
                .environment
                .iter()
                .map(|(k, v)| format!("<key>{}</key><string>{}</string>", xml(k), xml(v)))
                .collect::<String>();
            Ok(format!(
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n<!-- {MARKER} -->\n<plist version=\"1.0\"><dict><key>Label</key><string>{LABEL}</string><key>ProgramArguments</key><array>{args}</array><key>EnvironmentVariables</key><dict>{environment}</dict><key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>5</integer><key>Umask</key><integer>63</integer><key>ExitTimeOut</key><integer>15</integer></dict></plist>\n"
            ))
        }
    }
}

fn read_config(path: &Path) -> Result<Config> {
    let bytes = fs::read(receipt(path))?;
    if bytes.len() > 32768 {
        return Err(AppError::precondition("Recibo de supervisão excessivo"));
    }
    let config: Config = serde_json::from_slice(&bytes)?;
    if config.schema_version != 1 || unit_path(config.os, config.scope, &config.home)? != path {
        return Err(AppError::precondition("Recibo de supervisão incompatível"));
    }
    path_text(&config.data_dir)?;
    path_text(&config.binary)?;
    if config.binary != config.data_dir.join("collector/bin/setupvibe") {
        return Err(AppError::precondition(
            "Executável do recibo fora do diretório gerenciado",
        ));
    }
    let content = fs::read(path)?;
    if hash(&content) != config.unit_hash || !String::from_utf8_lossy(&content).contains(MARKER) {
        return Err(AppError::precondition(
            "Unidade modificada externamente; preserve e revise antes de alterar",
        ));
    }
    if config.binary.exists() && hash(&fs::read(&config.binary)?) != config.binary_hash {
        return Err(AppError::precondition(
            "Executável supervisionado foi modificado externamente",
        ));
    }
    Ok(config)
}

fn candidates() -> Result<Vec<PathBuf>> {
    let home = home()?;
    Ok(if cfg!(target_os = "macos") {
        vec![unit_path(Os::Macos, Scope::User, &home)?]
    } else {
        vec![
            unit_path(Os::Linux, Scope::User, &home)?,
            unit_path(Os::Linux, Scope::System, &home)?,
        ]
    })
}

pub fn installed() -> Result<Option<(PathBuf, Config)>> {
    let paths = candidates()?
        .into_iter()
        .filter(|p| p.exists())
        .collect::<Vec<_>>();
    if paths.len() > 1 {
        return Err(AppError::precondition(
            "Mais de uma unidade de coletor encontrada; revise a coexistência antes de alterar",
        ));
    }
    paths
        .first()
        .map(|path| Ok((path.clone(), read_config(path)?)))
        .transpose()
}

pub fn observation() -> Result<Observation> {
    let paths = candidates()?
        .into_iter()
        .filter(|p| p.exists())
        .collect::<Vec<_>>();
    if paths.len() > 1 {
        return Err(AppError::precondition(
            "Coletores de usuário e sistema coexistem",
        ));
    }
    let config = paths.first().and_then(|p| read_config(p).ok());
    Ok(Observation {
        component: "collector".into(),
        owner: paths.first().map(|_| {
            if config.is_some() {
                "native:collector"
            } else {
                "external"
            }
            .into()
        }),
        path: paths.first().map(|p| p.to_string_lossy().into()),
        version: config.as_ref().map(|c| c.version.clone()),
        present: !paths.is_empty(),
        managed: config.is_some(),
        observed_at: state::now(),
    })
}

pub fn preview(config: &Config) -> Result<Value> {
    Ok(
        json!({"unit_path":unit_path(config.os,config.scope,&config.home)?,"unit":render(config)?,"binary":config.binary,"scope":config.scope,"interval_seconds":config.interval,"starts_on_install":true,"note":"Serviço de usuário Linux depende de sessão/linger já configurado; LaunchAgent depende de login gráfico"}),
    )
}

fn manager(
    config: &Config,
    runner: &Runner,
    args: &[&str],
) -> Result<crate::process::ProcessOutput> {
    let name = if config.os == Os::Linux {
        "systemctl"
    } else {
        "launchctl"
    };
    let executable =
        executable(name).ok_or_else(|| AppError::precondition(format!("{name} não encontrado")))?;
    let mut argv = Vec::new();
    if config.os == Os::Linux && config.scope == Scope::User {
        argv.push("--user".into());
    }
    argv.extend(args.iter().map(|v| (*v).into()));
    runner.run(&executable.to_string_lossy(), &argv, None)
}
fn checked(config: &Config, runner: &Runner, args: &[&str]) -> Result<()> {
    let result = manager(config, runner, args)?;
    if result.code != 0 {
        return Err(AppError::precondition(format!(
            "Supervisor retornou {}: {}",
            result.code,
            result.stderr.trim()
        )));
    }
    Ok(())
}
fn target() -> String {
    format!("gui/{}/{LABEL}", unsafe { libc::geteuid() })
}
fn domain() -> String {
    format!("gui/{}", unsafe { libc::geteuid() })
}

pub fn status(directory: &Path, runner: &Runner) -> Result<Value> {
    let observation = observation()?;
    let mut result = json!({"installation":observation,"active":false,"manager_available":false});
    if let Some((_, config)) = installed()? {
        result["data_directory_matches"] = json!(config.data_dir == directory);
        result["scope"] = json!(config.scope);
        result["interval_seconds"] = json!(config.interval);
        let response = if config.os == Os::Linux {
            manager(
                &config,
                runner,
                &[
                    "show",
                    UNIT,
                    "--property=ActiveState,SubState,MainPID,UnitFileState",
                    "--no-pager",
                ],
            )
        } else {
            manager(&config, runner, &["print", &target()])
        };
        match response {
            Ok(response) => {
                result["manager_available"] = json!(response.code == 0);
                if config.os == Os::Linux {
                    let properties: BTreeMap<_, _> = response
                        .stdout
                        .lines()
                        .filter_map(|l| l.split_once('='))
                        .collect();
                    result["active"] = json!(properties.get("ActiveState") == Some(&"active"));
                    result["state"] = json!(properties.get("ActiveState"));
                    result["sub_state"] = json!(properties.get("SubState"));
                    result["pid"] = json!(
                        properties
                            .get("MainPID")
                            .and_then(|s| s.parse::<u32>().ok())
                            .filter(|v| *v > 0)
                    );
                    result["enabled"] = json!(
                        properties.get("UnitFileState").is_some_and(|v| [
                            "enabled",
                            "enabled-runtime"
                        ]
                        .contains(v))
                    );
                } else {
                    result["active"] = json!(
                        response.code == 0
                            && response
                                .stdout
                                .lines()
                                .any(|l| l.trim() == "state = running")
                    );
                    result["loaded"] = json!(response.code == 0);
                    result["pid"] = json!(response.stdout.lines().find_map(|l| {
                        l.trim()
                            .strip_prefix("pid = ")
                            .and_then(|s| s.parse::<u32>().ok())
                    }));
                }
            }
            Err(error) => result["diagnostic"] = json!(error),
        }
    }
    result["metrics"] = metrics::current(
        directory,
        &metrics::Query {
            scope: Some("host".into()),
            id: None,
            limit: 1,
            offset: 0,
            max_age: 30,
        },
    )?;
    Ok(result)
}

fn wait_status(directory: &Path, runner: &Runner, active: bool) -> Result<Value> {
    let started = std::time::Instant::now();
    loop {
        let result = status(directory, runner)?;
        if result["active"] == active {
            return Ok(result);
        }
        if crate::process::CANCELLED.load(std::sync::atomic::Ordering::SeqCst) {
            return Err(AppError::new(130, "Confirmação do supervisor cancelada"));
        }
        if started.elapsed() >= std::time::Duration::from_secs(5) {
            return Err(AppError::precondition(
                "Supervisor não confirmou o estado solicitado; consulte collector status e logs",
            ));
        }
        std::thread::sleep(std::time::Duration::from_millis(100));
    }
}

/// Substitui apenas arquivo regular próprio. O nome temporário nunca é reutilizado.
fn atomic(path: &Path, bytes: &[u8], mode: u32) -> Result<()> {
    let parent = path
        .parent()
        .ok_or_else(|| AppError::invalid("Destino sem diretório"))?;
    for ancestor in parent.ancestors() {
        let metadata = match fs::symlink_metadata(ancestor) {
            Ok(m) => m,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => continue,
            Err(e) => return Err(e.into()),
        };
        if !metadata.is_dir() || metadata.mode() & 0o022 != 0 && metadata.mode() & 0o1000 == 0 {
            return Err(AppError::precondition(
                "Diretório de supervisor não pode ser symlink ou permitir escrita de terceiros",
            ));
        }
    }
    fs::DirBuilder::new()
        .recursive(true)
        .mode(0o700)
        .create(parent)?;
    if let Ok(meta) = fs::symlink_metadata(path)
        && (!meta.is_file() || meta.uid() != unsafe { libc::geteuid() })
    {
        return Err(AppError::precondition(
            "Destino de supervisor não pertence ao usuário ou não é arquivo regular",
        ));
    }
    let temporary = parent.join(format!(".setupvibe-{}", uuid::Uuid::new_v4()));
    let result = (|| -> Result<()> {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(mode)
            .open(&temporary)?;
        file.write_all(bytes)?;
        file.sync_all()?;
        fs::rename(&temporary, path)?;
        Ok(())
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    result
}

pub fn install(mut config: Config, runner: &Runner, update: bool) -> Result<Value> {
    let path = unit_path(config.os, config.scope, &config.home)?;
    if config.os == Os::Linux && config.scope == Scope::System && unsafe { libc::geteuid() } != 0 {
        return Err(AppError::precondition(
            "Serviço de sistema exige executar como root com diretório de dados próprio",
        ));
    }
    let existing = installed()?;
    if existing.is_none() && config.binary.exists() {
        return Err(AppError::precondition(
            "Executável de coletor sem recibo; não será sobrescrito ou adotado",
        ));
    }
    if let Some((old_path, old)) = existing {
        if old_path != path || old.data_dir != config.data_dir {
            return Err(AppError::precondition(
                "Coletor já usa outro escopo ou diretório; não será substituído",
            ));
        }
        if !update {
            config = old;
        } // Repetir install preserva intervalo e ambiente.
    } else if update {
        return Err(AppError::precondition("Coletor ausente; use install"));
    }
    // Comprova disponibilidade do gerente antes de gravar os arquivos.
    if config.os == Os::Linux {
        checked(&config, runner, &["show-environment"])?;
    } else {
        checked(&config, runner, &["print", &domain()])?;
    }
    state::private_dir(&config.data_dir)?;
    let content = render(&config)?;
    config.unit_hash = hash(content.as_bytes());
    if update || !config.binary.exists() {
        let bytes = fs::read(std::env::current_exe()?)?;
        config.binary_hash = hash(&bytes);
        config.version = crate::VERSION.into();
        atomic(&config.binary, &bytes, 0o700)?;
    }
    atomic(&path, content.as_bytes(), 0o600)?;
    atomic(&receipt(&path), &serde_json::to_vec_pretty(&config)?, 0o600)?;
    if config.os == Os::Linux {
        checked(&config, runner, &["daemon-reload"])?;
        checked(&config, runner, &["enable", "--now", UNIT])?;
        if update {
            checked(&config, runner, &["restart", UNIT])?;
        }
    } else {
        let loaded = manager(&config, runner, &["print", &target()])?.code == 0;
        if loaded && update {
            checked(&config, runner, &["bootout", &target()])?;
        }
        if !loaded || update {
            checked(
                &config,
                runner,
                &["bootstrap", &domain(), path_text(&path)?],
            )?;
        }
    }
    wait_status(&config.data_dir, runner, true)
}

pub fn control(directory: &Path, action: &str, runner: &Runner, preview: bool) -> Result<Value> {
    let (path, config) =
        installed()?.ok_or_else(|| AppError::precondition("Coletor não instalado"))?;
    if config.data_dir != directory {
        return Err(AppError::precondition(
            "Diretório informado difere do serviço; consulte collector status",
        ));
    }
    if !["start", "stop", "restart"].contains(&action) {
        return Err(AppError::invalid("Controle de coletor inválido"));
    }
    if preview {
        return Ok(json!({"preview":true,"action":action,"unit_path":path}));
    }
    if config.os == Os::Linux {
        checked(&config, runner, &[action, UNIT])?;
    } else {
        let loaded = manager(&config, runner, &["print", &target()])?.code == 0;
        match action {
            "stop" if loaded => checked(&config, runner, &["bootout", &target()])?,
            "start" | "restart" if !loaded => checked(
                &config,
                runner,
                &["bootstrap", &domain(), path_text(&path)?],
            )?,
            "restart" => checked(&config, runner, &["kickstart", "-k", &target()])?,
            _ => {}
        }
    }
    wait_status(directory, runner, action != "stop")
}

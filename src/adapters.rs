//! Adaptadores de gerenciadores. Descoberta comprova a origem antes de atualizar.
use crate::{
    catalog::{Component, Manager},
    domain::{Action, Platform},
    error::{AppError, Result},
    planner::Step,
    process::{Runner, find_executable},
    state::{Observation, now},
};
use serde::Serialize;
use serde_json::{Value, json};
use std::{
    collections::BTreeSet,
    os::unix::fs::PermissionsExt,
    path::{Path, PathBuf},
};

fn executable_file(path: &Path) -> bool {
    path.metadata()
        .is_ok_and(|m| m.is_file() && m.permissions().mode() & 0o111 != 0)
}

pub fn command_name(id: &str) -> &str {
    match id {
        "homebrew" => "brew",
        "antigravity" => "agy",
        "python" => "python3",
        "rust" => "rustc",
        "ansible" => "ansible",
        other => other,
    }
}

pub fn executable(name: &str) -> Option<PathBuf> {
    find_executable(name).or_else(|| {
        let home = std::env::var_os("HOME")?;
        [
            PathBuf::from(&home).join(".local/bin"),
            PathBuf::from(&home).join(".cargo/bin"),
            PathBuf::from(&home).join(".opencode/bin"),
            PathBuf::from(&home).join(".kimi-code/bin"),
            PathBuf::from(&home).join(".docker/bin"),
            PathBuf::from("/Applications/Docker.app/Contents/Resources/bin"),
            PathBuf::from("/opt/homebrew/bin"),
            PathBuf::from("/home/linuxbrew/.linuxbrew/bin"),
            PathBuf::from("/usr/local/bin"),
        ]
        .into_iter()
        .map(|d| d.join(name))
        .find(|p| executable_file(p))
    })
}

fn args(values: &[&str]) -> Vec<String> {
    values.iter().map(|s| (*s).into()).collect()
}
fn canonical(path: &Path) -> PathBuf {
    path.canonicalize().unwrap_or_else(|_| path.to_owned())
}

/// Confere versão literal ou prefixo numérico no JSON global e no executável observado.
pub fn verify_target_version(step: &Step, observed: &Observation, runner: &Runner) -> Result<()> {
    let Some(requested) = step.target_version.as_deref() else {
        return Ok(());
    };
    if observed.owner.as_deref() != Some(&format!("mise:{}", step.package)) {
        return Err(AppError::precondition(
            "Versão alvo exige executável pertencente ao mise",
        ));
    }
    let mise = executable("mise").ok_or_else(|| AppError::precondition("mise ausente"))?;
    let data = runner.json(
        &mise.to_string_lossy(),
        &args(&["ls", "--global", "--installed", "--json", &step.package]),
        None,
    )?;
    let records = data
        .as_array()
        .or_else(|| data.get(&step.package).and_then(Value::as_array))
        .ok_or_else(|| AppError::precondition("Schema inesperado de mise ls"))?;
    let verified = records.iter().any(|record| {
        let version = record["version"].as_str().unwrap_or("");
        let matches = version == requested
            || version
                .strip_prefix(requested)
                .is_some_and(|v| v.starts_with('.'));
        matches
            && record["install_path"].as_str().is_some_and(|root| {
                observed.path.as_deref().is_some_and(|p| {
                    canonical(Path::new(p)).starts_with(canonical(Path::new(root)))
                })
            })
    });
    if !verified {
        return Err(AppError::precondition(format!(
            "Versão global observada não corresponde a {requested}; install preserva existentes, use update para trocar a versão"
        )));
    }
    Ok(())
}

pub fn inspect(
    component: &Component,
    platform: &Platform,
    runner: &Runner,
    prior: Option<&Observation>,
) -> Result<Observation> {
    if component.id == "collector" {
        return crate::supervisor::observation();
    }
    let target = component
        .platforms
        .iter()
        .find(|t| t.os == platform.os)
        .ok_or_else(|| AppError::unsupported("Componente sem plataforma"))?;
    if target.manager == Manager::Docker {
        return crate::services::observation(&component.id, runner);
    }
    let name = command_name(&component.id);
    let mut path = executable(name);
    if component.id == "tailscale" && platform.os == crate::domain::Os::Macos {
        let app = PathBuf::from("/Applications/Tailscale.app/Contents/MacOS/Tailscale");
        if executable_file(&app) {
            if path
                .as_ref()
                .is_some_and(|p| canonical(p) != canonical(&app))
            {
                return Err(AppError::precondition(
                    "Variantes Tailscale CLI e aplicativo coexistem; selecione a origem antes de alterar",
                ));
            }
            path = Some(app);
        }
    }
    let mut mise_records = Vec::new();
    if target.manager == Manager::Mise
        && let Some(mise) = executable("mise")
    {
        let output = runner.checked(
            &mise.to_string_lossy(),
            &args(&["ls", "--global", "--installed", "--json", &target.package]),
        )?;
        let data: Value = serde_json::from_str(&output.stdout)?;
        mise_records = data
            .as_array()
            .cloned()
            .or_else(|| data.get(&target.package).and_then(Value::as_array).cloned())
            .ok_or_else(|| AppError::precondition("Schema inesperado de mise ls"))?;
        if path.is_none() {
            path = mise_records
                .iter()
                .filter_map(|v| v.get("install_path").and_then(Value::as_str))
                .map(|p| Path::new(p).join("bin").join(name))
                .find(|p| executable_file(p));
        }
    }
    let Some(path) = path else {
        return Ok(Observation {
            component: component.id.clone(),
            owner: None,
            path: None,
            version: None,
            present: false,
            managed: false,
            observed_at: now(),
        });
    };
    let resolved = canonical(&path);
    let mut owners = BTreeSet::new();
    for record in &mise_records {
        if let Some(root) = record.get("install_path").and_then(Value::as_str)
            && resolved.starts_with(canonical(Path::new(root)))
        {
            owners.insert(format!("mise:{}", target.package));
        }
    }
    if resolved
        .components()
        .any(|c| c.as_os_str() == "Cellar" || c.as_os_str() == "Caskroom")
        && let Some(brew) = executable("brew")
    {
        let output = runner.run(
            &brew.to_string_lossy(),
            &args(&["info", "--json=v2", "--installed"]),
            None,
        )?;
        if output.code == 0 {
            let data: Value = serde_json::from_str(&output.stdout)?;
            if let Some(formulae) = data.get("formulae").and_then(Value::as_array) {
                for formula in formulae {
                    let name = formula.get("name").and_then(Value::as_str).unwrap_or("");
                    if name != target.package && name != component.id {
                        continue;
                    }
                    if formula
                        .get("installed")
                        .and_then(Value::as_array)
                        .is_none_or(Vec::is_empty)
                    {
                        continue;
                    }
                    let prefix =
                        runner.run(&brew.to_string_lossy(), &args(&["--prefix", name]), None)?;
                    if prefix.code == 0
                        && resolved.starts_with(canonical(Path::new(prefix.stdout.trim())))
                    {
                        owners.insert(format!("brew:{name}"));
                    }
                }
            }
        }
    }
    if let Some(dpkg) = find_executable("dpkg-query") {
        for candidate in [&path, &resolved] {
            let output = runner.run(
                &dpkg.to_string_lossy(),
                &["-S".into(), candidate.to_string_lossy().into()],
                None,
            )?;
            if output.code == 0 {
                for line in output.stdout.lines() {
                    if let Some((package, file)) = line.split_once(": ") {
                        let package = package.split(':').next().unwrap_or(package);
                        if canonical(Path::new(file)) == resolved
                            && package
                                .bytes()
                                .all(|b| b.is_ascii_alphanumeric() || b".+-".contains(&b))
                        {
                            owners.insert(format!("system:{package}"));
                        }
                    }
                }
            }
        }
    }
    if component.id == "docker"
        && resolved.starts_with("/Applications/Docker.app/")
        && let Some(brew) = executable("brew")
    {
        let data = runner.json(
            &brew.to_string_lossy(),
            &args(&["info", "--cask", "--json=v2", "docker-desktop"]),
            None,
        )?;
        if data["casks"].as_array().is_some_and(|a| {
            a.iter().any(|c| {
                c["token"] == "docker-desktop"
                    && c["installed"].as_str().is_some_and(|v| !v.is_empty())
            })
        }) {
            owners.insert("brew:docker-desktop".into());
        }
    }
    if owners.is_empty()
        && let Some(prior) = prior
        && prior.managed
        && prior
            .path
            .as_deref()
            .is_some_and(|p| canonical(Path::new(p)) == resolved)
        && prior
            .owner
            .as_deref()
            .is_some_and(|o| o.starts_with("vendor:"))
    {
        owners.insert(prior.owner.clone().unwrap_or_default());
    }
    let owner = if owners.len() == 1 {
        owners.into_iter().next()
    } else if owners.is_empty() {
        Some("external".into())
    } else {
        Some("ambiguous".into())
    };
    let version_args = match component.id.as_str() {
        "go" | "tailscale" => args(&["version"]),
        "java" => args(&["-version"]),
        _ => args(&["--version"]),
    };
    let output = runner.run(&path.to_string_lossy(), &version_args, None)?;
    if output.code != 0 {
        return Err(AppError::precondition(format!(
            "{} existe, mas a verificação falhou: {}",
            component.id,
            output.stderr.trim()
        )));
    }
    let version = if output.stdout.trim().is_empty() {
        output.stderr.trim()
    } else {
        output.stdout.trim()
    };
    Ok(Observation {
        component: component.id.clone(),
        managed: prior.is_some_and(|p| {
            p.managed
                && p.owner == owner
                && p.path
                    .as_deref()
                    .is_some_and(|p| canonical(Path::new(p)) == resolved)
        }),
        owner,
        path: Some(path.to_string_lossy().into()),
        version: Some(version.lines().next().unwrap_or("").to_owned()),
        present: true,
        observed_at: now(),
    })
}

#[derive(Debug, Clone, Serialize)]
pub struct Invocation {
    pub executable: String,
    pub args: Vec<String>,
    pub privileged: bool,
}

pub fn invocation(step: &Step, observed: &Observation) -> Result<Invocation> {
    if step.action == Action::Update && !observed.present {
        return Err(AppError::precondition("Componente ausente; use install"));
    }
    let (manager, package) = if observed.present && step.action == Action::Update {
        let owner = observed.owner.as_deref().unwrap_or("external");
        owner.split_once(':').ok_or_else(|| {
            AppError::precondition("Proprietário não comprovado; atualização recusada")
        })?
    } else {
        (
            match step.manager {
                Manager::System => "system",
                Manager::Brew => "brew",
                Manager::Mise => "mise",
                Manager::Vendor => "vendor",
                Manager::Docker => "docker",
                Manager::Native => "native",
            },
            step.package.as_str(),
        )
    };
    if let Some(version) = &step.target_version {
        if version.is_empty()
            || version.len() > 100
            || !version
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b"._+-".contains(&b))
        {
            return Err(AppError::invalid("Versão alvo inválida"));
        }
        if manager != "mise" {
            return Err(AppError::unsupported(
                "Versão alvo explícita disponível somente para mise nesta etapa",
            ));
        }
    }
    match manager {
        "native" if step.component == "collector" => Ok(Invocation {
            executable: "setupvibe-collector".into(),
            args: vec![
                if step.action == Action::Update {
                    "update"
                } else {
                    "install"
                }
                .into(),
            ],
            privileged: false,
        }),
        "system" if step.component == "tailscale" && !observed.present => Ok(Invocation {
            executable: "setupvibe-tailscale".into(),
            args: vec!["install".into()],
            privileged: true,
        }),
        "system" if step.component == "docker" && package.starts_with("docker-ce") => {
            Ok(Invocation {
                executable: "setupvibe-docker-engine".into(),
                args: vec![if step.action == Action::Update {
                    "update".into()
                } else {
                    "install".into()
                }],
                privileged: true,
            })
        }
        "system" => {
            if step.action == Action::Update && !observed.present {
                return Err(AppError::precondition(
                    "Componente ausente; instale antes de atualizar",
                ));
            }
            let mut command = args(&[
                "-o",
                "DPkg::Lock::Timeout=60",
                "-o",
                "Dpkg::Options::=--force-confold",
                "install",
                "--yes",
                "--no-install-recommends",
            ]);
            if step.action == Action::Update {
                command.push("--only-upgrade".into());
            }
            command.push(package.into());
            Ok(Invocation {
                executable: "apt-get".into(),
                args: command,
                privileged: true,
            })
        }
        "brew" => Ok(Invocation {
            executable: "brew".into(),
            args: args(&[
                if step.action == Action::Update {
                    "upgrade"
                } else {
                    "install"
                },
                package,
            ]),
            privileged: false,
        }),
        "mise" => {
            let command = if step.action == Action::Update && step.target_version.is_none() {
                args(&["upgrade", "--global", package, "--yes"])
            } else {
                args(&[
                    "use",
                    "--global",
                    "--yes",
                    &format!(
                        "{package}@{}",
                        step.target_version.as_deref().unwrap_or("latest")
                    ),
                ])
            };
            Ok(Invocation {
                executable: "mise".into(),
                args: command,
                privileged: false,
            })
        }
        "docker" => Ok(Invocation {
            executable: "setupvibe-service".into(),
            args: vec![step.component.clone()],
            privileged: false,
        }),
        "vendor" => {
            crate::vendor::source(&step.component)?;
            crate::vendor::validate_cpu(&step.component)?;
            Ok(Invocation {
                executable: "setupvibe-vendor".into(),
                args: vec![step.component.clone()],
                privileged: false,
            })
        }
        _ => Err(AppError::unsupported(format!(
            "Adaptador específico pendente: {manager}"
        ))),
    }
}

pub fn apply(invocation: &Invocation, runner: &Runner) -> Result<()> {
    if invocation.executable == "setupvibe-tailscale" {
        return crate::tailscale::install_linux(runner);
    }
    if invocation.executable == "setupvibe-docker-engine" {
        return crate::engine::install(
            runner,
            invocation.args.first().is_some_and(|s| s == "update"),
        );
    }
    if invocation.executable == "setupvibe-vendor" {
        return crate::vendor::install(
            invocation
                .args
                .first()
                .ok_or_else(|| AppError::invalid("Fornecedor ausente"))?,
            runner,
        );
    }
    let path = executable(&invocation.executable).ok_or_else(|| {
        AppError::precondition(format!("Gerenciador ausente: {}", invocation.executable))
    })?;
    let command = if invocation.privileged {
        // geteuid consulta a identidade efetiva, sem alterar permissões.
        if unsafe { libc::geteuid() } == 0 {
            Invocation {
                executable: "/usr/bin/env".into(),
                args: [
                    vec![
                        "DEBIAN_FRONTEND=noninteractive".into(),
                        path.to_string_lossy().into(),
                    ],
                    invocation.args.clone(),
                ]
                .concat(),
                privileged: false,
            }
        } else {
            Invocation {
                executable: "sudo".into(),
                args: [
                    args(&["-n", "/usr/bin/env", "DEBIAN_FRONTEND=noninteractive"]),
                    vec![path.to_string_lossy().into()],
                    invocation.args.clone(),
                ]
                .concat(),
                privileged: false,
            }
        }
    } else {
        Invocation {
            executable: path.to_string_lossy().into(),
            ..invocation.clone()
        }
    };
    if invocation.executable == "apt-get" && invocation.args.iter().any(|a| a == "install") {
        let prefix = command.args.len() - invocation.args.len();
        let mut refresh = command.args[..prefix].to_vec();
        refresh.extend(args(&["update", "-o", "DPkg::Lock::Timeout=60"]));
        runner.checked(&command.executable, &refresh)?;
    }
    runner.checked(&command.executable, &command.args)?;
    if cfg!(target_os = "macos")
        && invocation.executable == "brew"
        && invocation.args == args(&["install", "tailscale"])
    {
        apply(
            &Invocation {
                executable: "brew".into(),
                args: args(&["services", "start", "tailscale"]),
                privileged: true,
            },
            runner,
        )?;
    }
    Ok(())
}

pub fn updates(observed: &Observation, runner: &Runner) -> Result<Value> {
    let owner = observed.owner.as_deref().unwrap_or("external");
    let (manager, package) = owner.split_once(':').ok_or_else(|| {
        AppError::precondition("Origem desconhecida para consulta de atualização")
    })?;
    match manager {
        "mise" => {
            let output = runner.checked(
                &executable("mise")
                    .ok_or_else(|| AppError::precondition("mise ausente"))?
                    .to_string_lossy(),
                &args(&["outdated", "--global", "--json", package]),
            )?;
            let data: Value = serde_json::from_str(&output.stdout)?;
            if !data.is_object() {
                return Err(AppError::precondition("Schema inesperado de mise outdated"));
            }
            Ok(
                json!({"component":observed.component,"owner":owner,"update":data.get(package),"available":data.get(package).is_some()}),
            )
        }
        "brew" => {
            let output = runner.checked(
                &executable("brew")
                    .ok_or_else(|| AppError::precondition("brew ausente"))?
                    .to_string_lossy(),
                &args(&["outdated", "--json=v2", package]),
            )?;
            let data: Value = serde_json::from_str(&output.stdout)?;
            let formulae = data
                .get("formulae")
                .and_then(Value::as_array)
                .ok_or_else(|| AppError::precondition("Schema inesperado de brew outdated"))?;
            let casks = data
                .get("casks")
                .and_then(Value::as_array)
                .ok_or_else(|| AppError::precondition("Schema inesperado de brew outdated"))?;
            Ok(
                json!({"component":observed.component,"owner":owner,"update":data,"available":!formulae.is_empty()||!casks.is_empty()}),
            )
        }
        "system" => {
            let output = runner.checked("apt-cache", &args(&["policy", package]))?;
            let field = |name: &str| {
                output
                    .stdout
                    .lines()
                    .find_map(|l| l.trim().strip_prefix(name).map(|v| v.trim().to_owned()))
            };
            let installed = field("Installed:")
                .ok_or_else(|| AppError::precondition("APT sem versão instalada"))?;
            let candidate = field("Candidate:")
                .ok_or_else(|| AppError::precondition("APT sem versão candidata"))?;
            Ok(
                json!({"component":observed.component,"owner":owner,"installed":installed,"candidate":candidate,"available":candidate!="(none)"&&installed!=candidate,"note":"Base APT local; esta consulta não executa apt-get update"}),
            )
        }
        "docker" => crate::services::updates(&observed.component, runner),
        "vendor" => crate::vendor::updates(&observed.component),
        "native" => Ok(
            json!({"component":observed.component,"available":observed.version.as_deref()!=Some(crate::VERSION),"installed":observed.version,"candidate":crate::VERSION,"source":"Executável SetupVibe atual; sem consulta remota de release"}),
        ),
        _ => Err(AppError::unsupported(
            "Consulta de atualização requer adaptador específico",
        )),
    }
}

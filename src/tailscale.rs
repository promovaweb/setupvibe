//! Escopo restrito: pacote e daemon, sem autenticação ou configuração da rede.
use crate::{
    adapters::{self, Invocation},
    domain::Platform,
    error::{AppError, Result},
    process::Runner,
    state,
};
use std::{fs, path::PathBuf};

pub fn verification(observed: &state::Observation, runner: &Runner) -> serde_json::Value {
    use serde_json::json;
    let mut value = json!(observed);
    let status = observed
        .path
        .as_deref()
        .ok_or_else(|| AppError::precondition("Binário ausente"))
        .and_then(|p| runner.json(p, &["status".into(), "--json".into()], None));
    value["verification"] = json!(if observed.present {
        "installation_ok"
    } else {
        "not_installed"
    });
    value["diagnostic"] = match status {
        Ok(status) => {
            let backend = status["BackendState"].as_str().unwrap_or("Unknown");
            json!({"available":true,"backend_state":backend,"service_state":"running","authentication_state":match backend {"Running"=>"authenticated","NeedsLogin"=>"needs_login","NeedsMachineAuth"=>"needs_approval",_=>"unknown"}})
        }
        Err(error) => {
            json!({"available":false,"service_state":"unavailable","authentication_state":"unknown","reason":error.message})
        }
    };
    value
}

pub fn install_linux(runner: &Runner) -> Result<()> {
    let platform = Platform::detect()?;
    let suite = match (platform.distribution.as_str(), platform.version.as_str()) {
        ("debian", "12") => "bookworm",
        ("debian", "13") => "trixie",
        ("ubuntu", "24.04") => "noble",
        _ => {
            return Err(AppError::unsupported(
                "Tailscale sem adaptador para esta distribuição",
            ));
        }
    };
    let apt = |packages: &[&str]| -> Result<()> {
        privileged(
            runner,
            "apt-get",
            &[
                vec![
                    "install",
                    "--yes",
                    "--no-install-recommends",
                    "-o",
                    "Dpkg::Options::=--force-confold",
                    "-o",
                    "DPkg::Lock::Timeout=60",
                ],
                packages.to_vec(),
            ]
            .concat(),
        )
    };
    let existing = fs::read_dir("/etc/apt/sources.list.d")?
        .filter_map(std::result::Result::ok)
        .any(|e| {
            fs::read_to_string(e.path()).is_ok_and(|s| s.contains("https://pkgs.tailscale.com/"))
        });
    if !existing {
        apt(&["curl", "ca-certificates"])?;
        let home = std::env::var_os("HOME")
            .map(PathBuf::from)
            .ok_or_else(|| AppError::precondition("HOME ausente"))?;
        let dir = home
            .join(".cache/setupvibe")
            .join(uuid::Uuid::new_v4().to_string());
        state::private_dir(&dir)?;
        let result = (|| -> Result<()> {
            let key = dir.join("tailscale.gpg");
            crate::vendor::download(
                &format!(
                    "https://pkgs.tailscale.com/stable/{}/{suite}.noarmor.gpg",
                    platform.distribution
                ),
                &key,
                runner,
                1024 * 1024,
            )?;
            let bytes = fs::read(&key)?;
            if bytes.len() < 128 || bytes[0] & 0x80 == 0 {
                return Err(AppError::precondition("Chave Tailscale inválida"));
            }
            let source = dir.join("tailscale.sources");
            fs::write(
                &source,
                format!(
                    "Types: deb\nURIs: https://pkgs.tailscale.com/stable/{}\nSuites: {suite}\nComponents: main\nSigned-By: /usr/share/keyrings/setupvibe-tailscale.gpg\n",
                    platform.distribution
                ),
            )?;
            for path in [
                "/usr/share/keyrings/setupvibe-tailscale.gpg",
                "/etc/apt/sources.list.d/setupvibe-tailscale.sources",
            ] {
                if std::path::Path::new(path).symlink_metadata().is_ok() {
                    return Err(AppError::precondition(
                        "Arquivo APT Tailscale já existe; preservado para revisão",
                    ));
                }
            }
            privileged(
                runner,
                "install",
                &["-d", "-m", "0755", "/usr/share/keyrings"],
            )?;
            privileged(
                runner,
                "install",
                &[
                    "-m",
                    "0644",
                    &key.to_string_lossy(),
                    "/usr/share/keyrings/setupvibe-tailscale.gpg",
                ],
            )?;
            privileged(
                runner,
                "install",
                &[
                    "-m",
                    "0644",
                    &source.to_string_lossy(),
                    "/etc/apt/sources.list.d/setupvibe-tailscale.sources",
                ],
            )?;
            Ok(())
        })();
        let _ = fs::remove_dir_all(&dir);
        result?;
    }
    apt(&["tailscale"])?;
    if std::path::Path::new("/run/systemd/system").is_dir() {
        privileged(runner, "systemctl", &["enable", "--now", "tailscaled"])?;
    }
    Ok(())
}

fn privileged(runner: &Runner, command: &str, args: &[&str]) -> Result<()> {
    adapters::apply(
        &Invocation {
            executable: command.into(),
            args: args.iter().map(|s| (*s).into()).collect(),
            privileged: true,
        },
        runner,
    )
}

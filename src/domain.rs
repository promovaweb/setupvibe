//! Identidades de edição, plataforma e operação compartilhadas pelas interfaces.
use crate::error::{AppError, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, clap::ValueEnum)]
#[serde(rename_all = "lowercase")]
pub enum Edition {
    Desktop,
    Server,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, clap::ValueEnum)]
#[serde(rename_all = "lowercase")]
pub enum Os {
    Linux,
    Macos,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Action {
    Install,
    Verify,
    Update,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Platform {
    pub os: Os,
    pub architecture: String,
    pub distribution: String,
    pub version: String,
}

impl Platform {
    /// Detecta sem alterar o host. Distro desconhecida pode ser consultada, mas não instalada.
    pub fn detect() -> Result<Self> {
        let os = match std::env::consts::OS {
            "linux" => Os::Linux,
            "macos" => Os::Macos,
            other => {
                return Err(AppError::unsupported(format!(
                    "Sistema não suportado: {other}"
                )));
            }
        };
        let (distribution, version) = if os == Os::Linux {
            let release = std::fs::read_to_string("/etc/os-release")?;
            let field = |name: &str| {
                release
                    .lines()
                    .find_map(|line| {
                        let (key, value) = line.split_once('=')?;
                        (key == name).then(|| value.trim_matches('"').to_owned())
                    })
                    .unwrap_or_default()
            };
            (field("ID"), field("VERSION_ID"))
        } else {
            let output = std::process::Command::new("/usr/bin/sw_vers")
                .arg("-productVersion")
                .output()?;
            if !output.status.success() {
                return Err(AppError::precondition(
                    "Não foi possível identificar a versão do macOS",
                ));
            }
            (
                "macos".into(),
                String::from_utf8_lossy(&output.stdout).trim().into(),
            )
        };
        Ok(Self {
            os,
            architecture: std::env::consts::ARCH.into(),
            distribution,
            version,
        })
    }

    pub fn validate_target(&self, edition: Edition) -> Result<()> {
        if !["x86_64", "aarch64"].contains(&self.architecture.as_str()) {
            return Err(AppError::unsupported("Arquitetura sem adaptador"));
        }
        let supported = match self.os {
            Os::Linux => match self.distribution.as_str() {
                "debian" => ["12", "13"].contains(&self.version.as_str()),
                "ubuntu" => self.version == "24.04",
                _ => false,
            },
            Os::Macos => {
                edition == Edition::Desktop
                    && self
                        .version
                        .split('.')
                        .next()
                        .and_then(|v| v.parse::<u32>().ok())
                        .is_some_and(|v| v >= 14)
            }
        };
        if supported {
            Ok(())
        } else {
            Err(AppError::unsupported(format!(
                "Plataforma não habilitada para {edition:?}: {} {}",
                self.distribution, self.version
            )))
        }
    }
}

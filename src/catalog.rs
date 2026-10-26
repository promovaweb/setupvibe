//! Catálogo embarcado estrito: dados descrevem capacidades, nunca shell executável.
use crate::{
    domain::{Action, Edition, Os},
    error::{AppError, Result},
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Manager {
    System,
    Brew,
    Mise,
    Vendor,
    Docker,
    Native,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Target {
    pub os: Os,
    pub architectures: Vec<String>,
    pub manager: Manager,
    pub package: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase", deny_unknown_fields)]
pub enum OptionSpec {
    Integer {
        min: i64,
        max: i64,
        default: i64,
    },
    Choice {
        values: Vec<String>,
        default: String,
    },
}
impl OptionSpec {
    pub fn default_value(&self) -> Value {
        match self {
            Self::Integer { default, .. } => (*default).into(),
            Self::Choice { default, .. } => default.clone().into(),
        }
    }
    pub fn accepts(&self, value: &Value) -> bool {
        match self {
            Self::Integer { min, max, .. } => {
                value.as_i64().is_some_and(|v| v >= *min && v <= *max)
            }
            Self::Choice { values, .. } => value
                .as_str()
                .is_some_and(|v| values.iter().any(|x| x == v)),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Component {
    pub id: String,
    pub name: String,
    pub category: String,
    pub editions: Vec<Edition>,
    pub platforms: Vec<Target>,
    pub dependencies: Vec<String>,
    pub operations: Vec<Action>,
    pub options: BTreeMap<String, OptionSpec>,
    pub template_refs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Catalog {
    pub schema_version: u32,
    pub catalog_version: String,
    pub categories: BTreeMap<String, String>,
    pub templates: Vec<String>,
    pub components: Vec<Component>,
}

pub const SERVER_COMPONENTS: &[&str] =
    &["docker", "portainer", "git", "gh", "tailscale", "collector"];

impl Catalog {
    pub fn embedded() -> Result<Self> {
        Self::parse(include_str!("../catalog/components.json"))
    }

    pub fn parse(source: &str) -> Result<Self> {
        let catalog: Self = serde_json::from_str(source)?;
        catalog.validate()?;
        Ok(catalog)
    }

    pub fn get(&self, id: &str) -> Result<&Component> {
        self.components
            .iter()
            .find(|c| c.id == id)
            .ok_or_else(|| AppError::invalid(format!("Componente desconhecido: {id}")))
    }

    pub fn validate(&self) -> Result<()> {
        if self.schema_version != 1 || self.catalog_version.is_empty() || self.components.is_empty()
        {
            return Err(AppError::invalid("Versão ou conteúdo do catálogo inválido"));
        }
        let mut ids = BTreeSet::new();
        let known_templates = [
            "portainer-server",
            "portainer-agent",
            "postgresql",
            "redis",
            "mailpit",
            "collector-service",
        ];
        if self
            .templates
            .iter()
            .any(|t| !known_templates.contains(&t.as_str()))
        {
            return Err(AppError::invalid("Template sem implementação conhecida"));
        }
        for component in &self.components {
            if !valid_id(&component.id) || !ids.insert(&component.id) {
                return Err(AppError::invalid("ID inválido ou duplicado"));
            }
            if !self.categories.contains_key(&component.category)
                || component.editions.is_empty()
                || component.platforms.is_empty()
                || component.operations.is_empty()
            {
                return Err(AppError::invalid(format!(
                    "Definição incompleta: {}",
                    component.id
                )));
            }
            if component.editions.contains(&Edition::Server)
                && !SERVER_COMPONENTS.contains(&component.id.as_str())
            {
                return Err(AppError::invalid(format!(
                    "Componente proibido na Server: {}",
                    component.id
                )));
            }
            let mut systems = BTreeSet::new();
            for target in &component.platforms {
                if !systems.insert(format!("{:?}", target.os))
                    || target.architectures.is_empty()
                    || target
                        .architectures
                        .iter()
                        .any(|a| !["x86_64", "aarch64"].contains(&a.as_str()))
                    || target.package.is_empty()
                    || target.package.chars().any(char::is_control)
                    || target.package.starts_with('-')
                {
                    return Err(AppError::invalid(format!(
                        "Plataforma inválida: {}",
                        component.id
                    )));
                }
            }
            for (name, option) in &component.options {
                if !valid_id(name) || !option.accepts(&option.default_value()) {
                    return Err(AppError::invalid(format!(
                        "Opção inválida: {}.{name}",
                        component.id
                    )));
                }
            }
            for template in &component.template_refs {
                if !self.templates.contains(template) {
                    return Err(AppError::invalid(format!("Template ausente: {template}")));
                }
            }
        }
        for component in &self.components {
            for dependency in &component.dependencies {
                let dep = self.get(dependency)?;
                if component.editions.iter().any(|e| !dep.editions.contains(e)) {
                    return Err(AppError::invalid(format!(
                        "Dependência incompatível com edição: {dependency}"
                    )));
                }
            }
            self.visit(
                &component.id,
                &mut BTreeSet::new(),
                &mut BTreeSet::new(),
                &mut Vec::new(),
            )?;
        }
        Ok(())
    }

    /// Ordenação topológica estável, com detecção de ciclos por caminho ativo.
    pub fn visit(
        &self,
        id: &str,
        active: &mut BTreeSet<String>,
        done: &mut BTreeSet<String>,
        ordered: &mut Vec<String>,
    ) -> Result<()> {
        if done.contains(id) {
            return Ok(());
        }
        if !active.insert(id.into()) {
            return Err(AppError::invalid(format!("Ciclo de dependências: {id}")));
        }
        for dependency in &self.get(id)?.dependencies {
            self.visit(dependency, active, done, ordered)?;
        }
        active.remove(id);
        done.insert(id.into());
        ordered.push(id.into());
        Ok(())
    }
}

pub fn valid_id(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 64
        && value
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
}

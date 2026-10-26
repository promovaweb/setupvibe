//! Planejamento sem efeitos persistentes, reutilizado por CLI e TUI.
use crate::{
    catalog::{Catalog, Manager},
    domain::{Action, Edition, Platform},
    error::{AppError, Result},
};
use serde::Serialize;
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug, Clone, Serialize)]
pub struct Step {
    pub component: String,
    pub action: Action,
    pub manager: Manager,
    pub package: String,
    pub dependencies: Vec<String>,
    pub options: BTreeMap<String, Value>,
    pub target_version: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Plan {
    pub schema_version: u32,
    pub catalog_version: String,
    pub edition: Edition,
    pub platform: Platform,
    pub requested: Vec<String>,
    pub steps: Vec<Step>,
}

impl Plan {
    pub fn build(
        catalog: &Catalog,
        edition: Edition,
        platform: Platform,
        requested: &[String],
        action: Action,
        options: &BTreeMap<String, Value>,
    ) -> Result<Self> {
        if requested.is_empty() {
            return Err(AppError::invalid("Selecione pelo menos um componente"));
        }
        // Primeiro recusa a solicitação inteira; dependências nunca contornam a edição.
        for id in requested {
            if !catalog.get(id)?.editions.contains(&edition) {
                return Err(AppError::unsupported(format!(
                    "Componente {id} indisponível na edição {edition:?}"
                )));
            }
        }
        platform.validate_target(edition)?;
        let mut ordered = Vec::new();
        let mut done = BTreeSet::new();
        let mut roots = requested.to_vec();
        roots.sort();
        roots.dedup();
        for id in &roots {
            catalog.visit(id, &mut BTreeSet::new(), &mut done, &mut ordered)?;
        }
        // O bootstrap é dependência da plataforma, sem ampliar o escopo Server.
        let needs_brew = ordered.iter().any(|id| {
            catalog.get(id).is_ok_and(|c| {
                c.platforms
                    .iter()
                    .any(|t| t.os == platform.os && t.manager == Manager::Brew)
            })
        });
        if needs_brew {
            ordered.retain(|id| id != "homebrew");
            ordered.insert(0, "homebrew".into());
        }
        let mut steps = Vec::new();
        for id in ordered {
            let component = catalog.get(&id)?;
            if !component.editions.contains(&edition) {
                return Err(AppError::unsupported(format!(
                    "Dependência {id} indisponível"
                )));
            }
            let step_action = if roots.contains(&id) {
                action
            } else {
                Action::Install
            };
            if !component.operations.contains(&step_action) {
                return Err(AppError::unsupported(format!(
                    "Operação indisponível: {id}"
                )));
            }
            let target = component
                .platforms
                .iter()
                .find(|t| t.os == platform.os && t.architectures.contains(&platform.architecture))
                .ok_or_else(|| {
                    AppError::unsupported(format!("{id} não disponível nesta plataforma"))
                })?;
            let mut values: BTreeMap<_, _> = component
                .options
                .iter()
                .map(|(key, spec)| (key.clone(), spec.default_value()))
                .collect();
            if roots.contains(&id) {
                for (key, value) in options {
                    let spec = component.options.get(key).ok_or_else(|| {
                        AppError::invalid(format!("Opção desconhecida para {id}: {key}"))
                    })?;
                    if !spec.accepts(value) {
                        return Err(AppError::invalid(format!("Valor inválido para {id}.{key}")));
                    }
                    values.insert(key.clone(), value.clone());
                }
            }
            if id == "portainer"
                && values.get("role").and_then(Value::as_str) == Some("agent")
                && !options.contains_key("port")
            {
                values.insert("port".into(), serde_json::json!(9001));
            }
            let mut dependencies = component.dependencies.clone();
            if target.manager == Manager::Brew && !dependencies.iter().any(|d| d == "homebrew") {
                dependencies.push("homebrew".into());
            }
            steps.push(Step {
                component: id,
                action: step_action,
                manager: target.manager,
                package: target.package.clone(),
                dependencies,
                options: values,
                target_version: None,
            });
        }
        Ok(Self {
            schema_version: 1,
            catalog_version: catalog.catalog_version.clone(),
            edition,
            platform,
            requested: roots,
            steps,
        })
    }
}

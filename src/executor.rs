//! Executor compartilhado: observação, exclusividade, aplicação e verificação por etapa.
use crate::{
    adapters,
    catalog::Catalog,
    domain::Action,
    error::{AppError, Result},
    output::Output,
    planner::Plan,
    process::{CANCELLED, Runner},
    state::{Database, HostLock, StateLock, Store},
};
use serde_json::{Value, json};
use std::{collections::BTreeSet, path::Path};

/// Dependências só são aplicadas para instalações ausentes, nunca por uma atualização.
fn effective_plan(
    catalog: &Catalog,
    plan: &Plan,
    directory: &Path,
    runner: &Runner,
) -> Result<Plan> {
    let mut effective = plan.clone();
    if plan
        .steps
        .iter()
        .all(|s| plan.requested.contains(&s.component))
    {
        return Ok(effective);
    }
    let prior = Store::read(directory, Database::State)?
        .map(|s| s.observations())
        .transpose()?
        .unwrap_or_default();
    let mut needed: BTreeSet<String> = plan.requested.iter().cloned().collect();
    let mut pending = Vec::new();
    for root in &plan.requested {
        let step = plan
            .steps
            .iter()
            .find(|s| &s.component == root)
            .expect("raiz planejada");
        if step.action == Action::Install {
            let observed = adapters::inspect(
                catalog.get(root)?,
                &plan.platform,
                runner,
                prior.iter().find(|o| &o.component == root),
            );
            // Uma consulta que falha não autoriza instalar dependências às cegas.
            let docker_missing = step.manager == crate::catalog::Manager::Docker
                && adapters::executable("docker").is_none();
            if docker_missing || observed.is_ok_and(|o| !o.present) {
                pending.extend(step.dependencies.iter().cloned());
            }
        }
    }
    while let Some(id) = pending.pop() {
        if needed.insert(id.clone()) {
            let step = plan
                .steps
                .iter()
                .find(|s| s.component == id)
                .expect("dependência planejada");
            pending.extend(step.dependencies.iter().cloned());
        }
    }
    effective.steps.retain(|s| needed.contains(&s.component));
    for step in &mut effective.steps {
        step.dependencies.retain(|id| needed.contains(id));
    }
    Ok(effective)
}

pub fn preview(catalog: &Catalog, plan: &Plan, directory: &Path, runner: &Runner) -> Result<Value> {
    let effective = effective_plan(catalog, plan, directory, runner)?;
    let plan = &effective;
    let prior = Store::read(directory, Database::State)?
        .map(|s| s.observations())
        .transpose()?
        .unwrap_or_default();
    let mut observations = Vec::new();
    for step in &plan.steps {
        if step.manager == crate::catalog::Manager::Docker
            && adapters::executable("docker").is_none()
            && plan
                .steps
                .iter()
                .any(|s| s.component == "docker" && s.action == Action::Install)
        {
            observations.push(json!({"component":step.component,"observed":null,"deferred":true,
                "command":{"executable":"setupvibe-service","args":[step.component],"options":step.options,
                "precondition":"Descoberta e conflitos serão conferidos após instalar Docker; recursos externos não serão adotados"}}));
            continue;
        }
        let component = catalog.get(&step.component)?;
        let old = prior.iter().find(|o| o.component == step.component);
        match adapters::inspect(component, &plan.platform, runner, old) {
            Ok(observed) => {
                let command = if step.action == Action::Verify
                    || (step.action == Action::Install
                        && observed.present
                        && step.component != "collector")
                {
                    match adapters::verify_target_version(step, &observed, runner) {
                        Ok(()) => json!(null),
                        Err(error) => json!({"error":error}),
                    }
                } else {
                    match adapters::invocation(step, &observed) {
                        Ok(command) => {
                            let mut value = json!(command);
                            if step.component == "collector" {
                                let config = crate::supervisor::configuration(
                                    directory,
                                    plan.edition,
                                    plan.platform.os,
                                    None,
                                    step.options
                                        .get("interval")
                                        .and_then(Value::as_u64)
                                        .unwrap_or(5),
                                )?;
                                value["supervisor"] = crate::supervisor::preview(&config)?;
                            }
                            if step.manager == crate::catalog::Manager::Docker {
                                value["service"] = match crate::services::preview(
                                    step,
                                    directory,
                                    plan.edition,
                                    runner,
                                ) {
                                    Ok(v) => v,
                                    Err(e) => {
                                        value["error"] = json!(e);
                                        json!(null)
                                    }
                                };
                            }
                            if step.component == "tailscale" && step.action == Action::Update {
                                value["impact"] = json!({"connection_may_interrupt":true,"note":"Se SSH depende do Tailscale, mantenha um acesso alternativo; não há garantia de continuidade"});
                            }
                            if command.executable == "apt-get" {
                                value["preparation"] =
                                    json!(["apt-get", "update", "-o", "DPkg::Lock::Timeout=60"]);
                            }
                            value
                        }
                        Err(error) => json!({"error":error}),
                    }
                };
                observations.push(
                    json!({"component":step.component,"observed":observed,"command":command}),
                );
            }
            Err(error) => observations.push(json!({"component":step.component,"error":error})),
        }
    }
    let ready = observations
        .iter()
        .all(|o| o.get("error").is_none() && o.pointer("/command/error").is_none());
    Ok(json!({"dry_run":true,"ready":ready,"plan":plan,"observations":observations}))
}

pub fn execute(
    catalog: &Catalog,
    plan: &Plan,
    directory: &Path,
    runner: &Runner,
    output: Output,
) -> Result<Value> {
    let _host_lock = HostLock::acquire()?;
    let effective = effective_plan(catalog, plan, directory, runner)?;
    let plan = &effective;
    let _lock = StateLock::acquire(directory, "operations")?;
    let mut store = Store::write(directory, Database::State)?;
    store.reconcile_interrupted()?;
    let id = store.begin_operation(plan)?;
    output.event("operation_started", json!({"operation_id":id,"plan":plan}))?;
    let mut failed = BTreeSet::new();
    let mut results = Vec::new();
    let mut successes = 0usize;
    let mut last_code = 1;
    for step in &plan.steps {
        if CANCELLED.load(std::sync::atomic::Ordering::SeqCst) {
            store.step(&id, &step.component, "cancelled", 130)?;
            failed.insert(step.component.clone());
            last_code = 130;
            results.push(json!({"component":step.component,"status":"cancelled","exit_code":130}));
            continue;
        }
        if step.dependencies.iter().any(|d| failed.contains(d)) {
            failed.insert(step.component.clone());
            store.step(&id, &step.component, "skipped", 4)?;
            results.push(json!({"component":step.component,"status":"skipped","reason":"Dependência falhou","exit_code":4}));
            continue;
        }
        store.step(&id, &step.component, "running", 0)?;
        output.event(
            "step_started",
            json!({"operation_id":id,"component":step.component}),
        )?;
        let result = (|| -> Result<Value> {
            let prior = store.observations()?;
            let prior = prior.iter().find(|o| o.component == step.component);
            let component = catalog.get(&step.component)?;
            let before = adapters::inspect(component, &plan.platform, runner, prior)?;
            if prior.is_some_and(|old| {
                old.managed
                    && old.present
                    && before.present
                    && (old.owner != before.owner || old.path != before.path)
            }) {
                return Err(AppError::precondition(
                    "Origem ou caminho mudou desde a última observação; revise antes de alterar",
                ));
            }
            if step.action == Action::Verify
                || (step.action == Action::Install
                    && before.present
                    && step.component != "collector")
            {
                if !before.present {
                    return Err(AppError::precondition("Componente não instalado"));
                }
                adapters::verify_target_version(step, &before, runner)?;
                store.observe(&before)?;
                return Ok(
                    json!({"component":step.component,"status":"unchanged","observed":before}),
                );
            }
            if step.action == Action::Update && !before.present {
                return Err(AppError::precondition("Componente ausente; use install"));
            }
            let command = adapters::invocation(step, &before)?;
            if step.component == "collector" {
                let config = if step.action == Action::Update {
                    let (_, mut config) = crate::supervisor::installed()?
                        .ok_or_else(|| AppError::precondition("Coletor ausente"))?;
                    if config.data_dir != directory {
                        return Err(AppError::precondition(
                            "Diretório difere do coletor instalado",
                        ));
                    }
                    config.version = crate::VERSION.into();
                    config
                } else {
                    crate::supervisor::configuration(
                        directory,
                        plan.edition,
                        plan.platform.os,
                        None,
                        step.options
                            .get("interval")
                            .and_then(Value::as_u64)
                            .unwrap_or(5),
                    )?
                };
                crate::supervisor::install(config, runner, step.action == Action::Update)?;
            } else if step.manager == crate::catalog::Manager::Docker {
                crate::services::apply(step, directory, plan.edition, runner)?;
            } else {
                adapters::apply(&command, runner)?;
            }
            let mut after = adapters::inspect(component, &plan.platform, runner, prior)?;
            if !after.present {
                return Err(AppError::precondition(
                    "Instalador terminou, mas o componente não foi encontrado",
                ));
            }
            adapters::verify_target_version(step, &after, runner)?;
            if command.executable == "setupvibe-vendor" && (!before.present || before.managed) {
                after.owner = Some(format!("vendor:{}", step.component));
            }
            after.managed = !before.present || before.managed;
            store.observe(&after)?;
            Ok(json!({"component":step.component,"status":"succeeded","observed":after}))
        })();
        match result {
            Ok(value) => {
                successes += 1;
                store.step(&id, &step.component, "succeeded", 0)?;
                output.event("step_completed", value.clone())?;
                results.push(value);
            }
            Err(error) => {
                last_code = error.code;
                failed.insert(step.component.clone());
                store.step(
                    &id,
                    &step.component,
                    if error.code == 130 {
                        "cancelled"
                    } else {
                        "failed"
                    },
                    error.code,
                )?;
                let value = json!({"component":step.component,"status":"failed","error":error});
                output.event("step_failed", value.clone())?;
                results.push(value);
            }
        }
    }
    let code = if last_code == 130 {
        130
    } else if failed.is_empty() {
        0
    } else if successes > 0 {
        5
    } else {
        last_code
    };
    let status = match code {
        0 => "succeeded",
        5 => "partial",
        130 => "cancelled",
        _ => "failed",
    };
    store.finish_operation(&id, status, code)?;
    Ok(json!({"operation_id":id,"status":status,"results":results,"exit_code":code}))
}

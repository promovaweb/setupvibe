//! Topologia Portainer em Swarm e controle de serviços desejados, nunca de tasks isoladas.
use crate::{
    docker::{Docker, validate_id},
    domain::Edition,
    error::{AppError, Result},
    planner::Step,
    process::{CANCELLED, Runner},
    state::{self, Database, Observation, Store},
};
use serde_json::{Value, json};
use std::{
    path::Path,
    sync::atomic::Ordering,
    time::{Duration, Instant},
};
const STACK: &str = "setupvibe-portainer";
const LABEL: &str = "dev.setupvibe.managed";
const COMPONENT: &str = "dev.setupvibe.component";

fn pinned_image(docker: &Docker<'_>, image: &str) -> Result<String> {
    let manifest = docker.json(&[
        "buildx",
        "imagetools",
        "inspect",
        "--format",
        "{{json .Manifest}}",
        image,
    ])?;
    let digest = manifest["digest"]
        .as_str()
        .filter(|d| {
            d.strip_prefix("sha256:")
                .is_some_and(|h| h.len() == 64 && h.bytes().all(|b| b.is_ascii_hexdigit()))
        })
        .ok_or_else(|| {
            AppError::precondition("Registro não retornou digest SHA-256 para fixar a imagem")
        })?;
    Ok(format!("{image}@{digest}"))
}

pub fn raw_services(docker: &Docker<'_>) -> Result<Vec<Value>> {
    if docker.info()?["Swarm"]["ControlAvailable"] != true {
        return Ok(Vec::new());
    }
    let ids = docker.command(&["service".into(), "ls".into(), "--quiet".into()])?;
    let mut services = Vec::new();
    for id in ids.stdout.lines().filter(|s| !s.is_empty()) {
        services.push(inspect_raw(id, docker)?);
    }
    Ok(services)
}
pub fn inspect_raw(id: &str, docker: &Docker<'_>) -> Result<Value> {
    validate_id(id)?;
    docker
        .json(&["service", "inspect", id])?
        .as_array()
        .and_then(|v| v.first())
        .cloned()
        .ok_or_else(|| AppError::precondition("Serviço Swarm não encontrado"))
}
pub fn public(v: &Value) -> Value {
    let managed = v["Spec"]["Labels"][LABEL] == "true";
    json!({"kind":"swarm_service","id":v["ID"],"name":v["Spec"]["Name"],"image":v["Spec"]["TaskTemplate"]["ContainerSpec"]["Image"],"mode":v["Spec"]["Mode"],"ports":v["Endpoint"]["Ports"],"update_status":v["UpdateStatus"],"managed":managed,"component":v["Spec"]["Labels"][COMPONENT],"role":v["Spec"]["Labels"]["dev.setupvibe.role"],"capabilities":{"restart":managed,"start":managed&&v["Spec"]["Mode"]["Replicated"].is_object(),"stop":managed&&v["Spec"]["Mode"]["Replicated"].is_object()}})
}
pub fn portainer(runner: &Runner) -> Result<Option<Observation>> {
    let docker = Docker::new(runner)?;
    let all = raw_services(&docker)?;
    let services: Vec<_> = all
        .iter()
        .filter(|v| {
            v["Spec"]["TaskTemplate"]["ContainerSpec"]["Image"]
                .as_str()
                .is_some_and(|s| s.starts_with("portainer/"))
        })
        .collect();
    if services.is_empty() {
        return Ok(None);
    }
    if services.iter().any(|v| {
        v["Spec"]["Labels"][LABEL] != "true" || v["Spec"]["Labels"][COMPONENT] != "portainer"
    }) {
        return Err(AppError::precondition(
            "Portainer Swarm externo detectado; instalação preservada sem adoção",
        ));
    }
    if services.len() > 2 {
        return Err(AppError::precondition(
            "Múltiplas topologias Portainer detectadas",
        ));
    }
    let service = services
        .iter()
        .find(|v| v["Spec"]["Labels"]["dev.setupvibe.role"] == "server")
        .unwrap_or(&services[0]);
    Ok(Some(Observation {
        component: "portainer".into(),
        owner: Some("docker:portainer".into()),
        path: service["ID"].as_str().map(|s| format!("swarm:{s}")),
        version: service["Spec"]["TaskTemplate"]["ContainerSpec"]["Image"]
            .as_str()
            .map(str::to_owned),
        present: true,
        managed: true,
        observed_at: state::now(),
    }))
}
pub fn selected(step: &Step, runner: &Runner) -> Result<bool> {
    if step.component != "portainer" {
        return Ok(false);
    }
    let mode = step
        .options
        .get("deployment")
        .and_then(Value::as_str)
        .unwrap_or("auto");
    if mode == "standalone" {
        return Ok(false);
    }
    let docker = Docker::new(runner)?;
    let swarm = docker.info()?["Swarm"].clone();
    if mode == "swarm" || swarm["LocalNodeState"] == "active" {
        if swarm["ControlAvailable"] != true {
            return Err(AppError::precondition(
                "Implante a topologia Swarm a partir de um manager",
            ));
        }
        return Ok(true);
    }
    Ok(false)
}
fn require_owned(v: &Value, edition: Edition) -> Result<()> {
    if v["Spec"]["Labels"][LABEL] != "true" || v["Spec"]["Labels"][COMPONENT] != "portainer" {
        return Err(AppError::precondition(
            "Serviço Swarm externo: controle recusado",
        ));
    }
    let _ = edition;
    Ok(())
}
fn wait_service(docker: &Docker<'_>, id: &str) -> Result<()> {
    let start = Instant::now();
    loop {
        if CANCELLED.load(Ordering::SeqCst) {
            return Err(AppError::new(
                130,
                "Acompanhamento Swarm cancelado; consulte update_status",
            ));
        }
        let service = inspect_raw(id, docker)?;
        if service["UpdateStatus"]["State"]
            .as_str()
            .is_some_and(|s| s.contains("paused") || s.contains("rollback"))
        {
            return Err(AppError::precondition(
                "Atualização Swarm pausada ou revertida; consulte service inspect",
            ));
        }
        let tasks = docker.api(
            "GET",
            &format!("/tasks?filters=%7B%22service%22:%5B%22{id}%22%5D%7D"),
            None,
        )?;
        let desired: Vec<_> = tasks
            .as_array()
            .ok_or_else(|| AppError::precondition("Resposta de tasks inválida"))?
            .iter()
            .filter(|t| t["DesiredState"] == "running")
            .collect();
        let expected =
            if let Some(replicas) = service["Spec"]["Mode"]["Replicated"]["Replicas"].as_u64() {
                replicas
            } else {
                docker
                    .api("GET", "/nodes", None)?
                    .as_array()
                    .ok_or_else(|| AppError::precondition("Lista de nós inválida"))?
                    .iter()
                    .filter(|n| {
                        n["Spec"]["Availability"] == "active"
                            && n["Status"]["State"] == "ready"
                            && n["Description"]["Platform"]["OS"] == "linux"
                    })
                    .count() as u64
            };
        if desired.len() as u64 >= expected
            && service["UpdateStatus"]["State"] != "updating"
            && desired.iter().all(|t| {
                t["Status"]["State"] == "running"
                    && t["Spec"]["ContainerSpec"]["Image"]
                        == service["Spec"]["TaskTemplate"]["ContainerSpec"]["Image"]
                    && t["Spec"]["ForceUpdate"] == service["Spec"]["TaskTemplate"]["ForceUpdate"]
            })
        {
            return Ok(());
        }
        if start.elapsed() > docker.runner.timeout {
            return Err(AppError::new(6, "Tempo limite aguardando tasks Swarm"));
        }
        std::thread::sleep(Duration::from_millis(500));
    }
}
pub fn plan(step: &Step, runner: &Runner) -> Result<Value> {
    let docker = Docker::new(runner)?;
    docker.socket()?;
    let info = docker.info()?;
    if info["Swarm"]["ControlAvailable"] != true {
        return Err(AppError::precondition("Operação exige manager Swarm"));
    }
    if info["DockerRootDir"] != "/var/lib/docker" {
        return Err(AppError::unsupported(
            "Template Swarm exige DockerRootDir padrão em todos os nós",
        ));
    }
    let role = step.options["role"].as_str().unwrap_or("server");
    if step.options["bind"] != "0.0.0.0" {
        return Err(AppError::precondition(
            "Swarm publica portas em todas as interfaces; informe --option bind=0.0.0.0 após revisar",
        ));
    }
    let node = info["Swarm"]["NodeID"]
        .as_str()
        .ok_or_else(|| AppError::precondition("Manager sem NodeID"))?;
    let port = step.options["port"]
        .as_u64()
        .ok_or_else(|| AppError::invalid("Porta ausente"))?;
    for v in docker.containers()? {
        if v["HostConfig"]["PortBindings"]
            .as_object()
            .is_some_and(|p| {
                p.values().any(|entries| {
                    entries.as_array().is_some_and(|a| {
                        a.iter().any(|b| {
                            b["HostPort"].as_str().and_then(|s| s.parse::<u64>().ok()) == Some(port)
                        })
                    })
                })
            })
        {
            return Err(AppError::precondition(format!(
                "Porta {port} reservada por container"
            )));
        }
    }
    for v in raw_services(&docker)? {
        let name = v["Spec"]["Name"].as_str().unwrap_or("");
        if name.starts_with(STACK) {
            require_owned(&v, Edition::Server)?;
        }
        if v["Spec"]["Labels"][COMPONENT] != "portainer"
            && v["Endpoint"]["Ports"]
                .as_array()
                .is_some_and(|a| a.iter().any(|p| p["PublishedPort"].as_u64() == Some(port)))
        {
            return Err(AppError::precondition(format!(
                "Porta {port} reservada por serviço Swarm"
            )));
        }
    }
    let network_name = format!("{STACK}_agent");
    let networks = docker.command(&[
        "network".into(),
        "ls".into(),
        "--format".into(),
        "{{.Name}}".into(),
    ])?;
    if networks.stdout.lines().any(|n| n == network_name) {
        let n = docker.json(&["network", "inspect", &network_name])?;
        if n[0]["Labels"][LABEL] != "true" || n[0]["Labels"][COMPONENT] != "portainer" {
            return Err(AppError::precondition(
                "Rede existente não pertence ao SetupVibe; preservada",
            ));
        }
    }
    Ok(
        json!({"deployment":"swarm","stack":STACK,"role":role,"server_node":node,"server_replicas":if role=="server"{1}else{0},"agent_mode":"global","port":port,"bind":"0.0.0.0","preserve_volumes":true}),
    )
}
pub fn deploy(step: &Step, runner: &Runner) -> Result<()> {
    let plan = plan(step, runner)?;
    let docker = Docker::new(runner)?;
    if portainer(runner)?.is_some() {
        return Err(AppError::precondition(
            "Portainer Swarm já existe; use update",
        ));
    }
    let role = plan["role"].as_str().unwrap_or("server");
    let node = plan["server_node"].as_str().unwrap_or("");
    let labels = |role: &str| json!({LABEL:"true",COMPONENT:"portainer","dev.setupvibe.role":role,"dev.setupvibe.schema":"1"});
    let mut services = serde_json::Map::new();
    services.insert("agent".into(),json!({"image":"portainer/agent:lts","environment":{"AGENT_CLUSTER_ADDR":"tasks.setupvibe-portainer_agent"},"volumes":["/var/run/docker.sock:/var/run/docker.sock","/var/lib/docker/volumes:/var/lib/docker/volumes"],"networks":["agent"],"labels":labels("agent"),"deploy":{"mode":"global","labels":labels("agent"),"placement":{"constraints":["node.platform.os == linux"]},"update_config":{"parallelism":1,"failure_action":"rollback"}}}));
    if role == "agent" {
        services.get_mut("agent").expect("agent inserido")["ports"] = json!([{"target":9001,"published":step.options["port"],"protocol":"tcp","mode":"host"}]);
    }
    let mut volumes = json!({});
    if role == "server" {
        // Volume local fica fixado ao manager de origem; não fingir storage distribuído.
        crate::services::ensure_volume(&docker, "setupvibe-portainer-data", "portainer", false)?;
        services.insert("server".into(),json!({"image":"portainer/portainer-ce:lts","command":["-H","tcp://tasks.setupvibe-portainer_agent:9001","--tlsskipverify"],"volumes":["data:/data"],"networks":["agent"],"ports":[{"target":9443,"published":step.options["port"],"protocol":"tcp","mode":"host"}],"labels":labels("server"),"deploy":{"mode":"replicated","replicas":1,"labels":labels("server"),"placement":{"constraints":[format!("node.id == {node}")]},"update_config":{"parallelism":1,"failure_action":"rollback","order":"stop-first"}}}));
        volumes = json!({"data":{"external":true,"name":"setupvibe-portainer-data"}});
    }
    for service in services.values_mut() {
        let image = service["image"]
            .as_str()
            .ok_or_else(|| AppError::invalid("Template sem imagem"))?;
        service["image"] = json!(pinned_image(&docker, image)?);
    }
    let config = json!({"version":"3.8","services":services,"networks":{"agent":{"driver":"overlay","attachable":false,"labels":labels("network")}},"volumes":volumes});
    let binary = crate::adapters::executable("docker")
        .ok_or_else(|| AppError::precondition("Docker ausente"))?;
    let out = runner.run(
        &binary.to_string_lossy(),
        &[
            "stack".into(),
            "deploy".into(),
            "--compose-file".into(),
            "-".into(),
            "--resolve-image".into(),
            "always".into(),
            STACK.into(),
        ],
        Some(&serde_json::to_vec(&config)?),
    )?;
    if out.code != 0 {
        return Err(AppError::new(1, out.stderr));
    }
    for service in raw_services(&docker)?
        .iter()
        .filter(|v| v["Spec"]["Labels"][COMPONENT] == "portainer")
    {
        wait_service(&docker, service["ID"].as_str().unwrap_or(""))?;
    }
    Ok(())
}
pub fn update(runner: &Runner) -> Result<()> {
    let docker = Docker::new(runner)?;
    docker.socket()?;
    for v in raw_services(&docker)?
        .iter()
        .filter(|v| v["Spec"]["Labels"][COMPONENT] == "portainer")
    {
        require_owned(v, Edition::Server)?;
        let id = v["ID"]
            .as_str()
            .ok_or_else(|| AppError::precondition("Serviço sem ID"))?;
        let image = if v["Spec"]["Labels"]["dev.setupvibe.role"] == "server" {
            "portainer/portainer-ce:lts"
        } else {
            "portainer/agent:lts"
        };
        let image = pinned_image(&docker, image)?;
        docker.command(&[
            "service".into(),
            "update".into(),
            "--detach".into(),
            "--image".into(),
            image,
            "--force".into(),
            id.into(),
        ])?;
        wait_service(&docker, id)?;
    }
    Ok(())
}
pub fn control(
    id: &str,
    action: &str,
    edition: Edition,
    runner: &Runner,
    directory: &Path,
    dry: bool,
) -> Result<Value> {
    let docker = Docker::new(runner)?;
    docker.socket()?;
    let v = inspect_raw(id, &docker)?;
    require_owned(&v, edition)?;
    let id = v["ID"]
        .as_str()
        .ok_or_else(|| AppError::precondition("Serviço sem ID"))?;
    let mut spec = v["Spec"].clone();
    let key = format!("swarm-replicas:{id}");
    match action {
        "stop" | "start" => {
            let replicas=spec["Mode"]["Replicated"]["Replicas"].as_u64().ok_or_else(||AppError::unsupported("Serviço global não aceita start/stop por réplicas; restart permanece disponível"))?;
            if action == "stop" {
                if !dry && replicas > 0 {
                    Store::write(directory,Database::State)?.connection.execute("INSERT INTO config(key,value) VALUES(?1,?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",rusqlite::params![key,replicas.to_string()])?;
                }
                spec["Mode"]["Replicated"]["Replicas"] = json!(0);
            } else {
                use rusqlite::OptionalExtension;
                let saved = Store::read(directory, Database::State)?
                    .map(|s| {
                        s.connection
                            .query_row("SELECT value FROM config WHERE key=?1", [&key], |r| {
                                r.get::<_, String>(0)
                            })
                            .optional()
                    })
                    .transpose()?
                    .flatten()
                    .and_then(|s| s.parse::<u64>().ok())
                    .unwrap_or(replicas.max(1));
                spec["Mode"]["Replicated"]["Replicas"] = json!(saved);
            }
        }
        "restart" => {
            spec["TaskTemplate"]["ForceUpdate"] =
                json!(spec["TaskTemplate"]["ForceUpdate"].as_u64().unwrap_or(0) + 1)
        }
        _ => return Err(AppError::invalid("Controle Swarm inválido")),
    }
    if dry {
        return Ok(
            json!({"dry_run":true,"action":action,"service":public(&v),"desired_mode":spec["Mode"]}),
        );
    }
    let revision = v["Version"]["Index"]
        .as_u64()
        .ok_or_else(|| AppError::precondition("Serviço sem revisão"))?;
    docker.api(
        "POST",
        &format!("/services/{id}/update?version={revision}"),
        Some(&spec),
    )?;
    if action != "stop" {
        wait_service(&docker, id)?;
    }
    Ok(public(&inspect_raw(id, &docker)?))
}

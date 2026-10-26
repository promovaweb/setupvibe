//! Serviços compartilhados com volumes persistentes e substituição reversível do container.
use crate::{
    docker::{Docker, public_container, validate_id},
    domain::{Action, Edition},
    error::{AppError, Result},
    planner::Step,
    process::{CANCELLED, Runner},
    state::{self, Observation},
};
use serde_json::{Value, json};
use std::{
    fs,
    io::Write,
    net::TcpListener,
    os::unix::fs::OpenOptionsExt,
    path::Path,
    sync::atomic::Ordering,
    time::{Duration, Instant},
};

const MANAGED: &str = "dev.setupvibe.managed";
const COMPONENT: &str = "dev.setupvibe.component";

fn allowed(v: &Value, edition: Edition) -> Result<()> {
    let id = v["Config"]["Labels"][COMPONENT].as_str().unwrap_or("");
    if edition == Edition::Server && id != "portainer" {
        return Err(AppError::unsupported("Controle indisponível nesta edição"));
    }
    if v["Config"]["Labels"][MANAGED] != "true"
        || !["portainer", "postgresql", "redis", "mailpit"].contains(&id)
    {
        return Err(AppError::precondition(
            "Container externo: controle exige propriedade SetupVibe",
        ));
    }
    Ok(())
}

fn find(id: &str, runner: &Runner) -> Result<Option<Value>> {
    let docker = Docker::new(runner)?;
    let prefix = match id {
        "portainer" => "portainer/",
        "postgresql" => "postgres:",
        "redis" => "redis:",
        "mailpit" => "axllent/mailpit:",
        _ => return Err(AppError::invalid("Serviço desconhecido")),
    };
    let matches: Vec<_> = docker
        .containers()?
        .into_iter()
        .filter(|v| {
            if !v["Config"]["Labels"]["com.docker.swarm.service.id"].is_null() {
                return false;
            }
            v["Name"] == format!("/setupvibe-{id}")
                || v["Config"]["Labels"][COMPONENT] == id
                || v["Config"]["Image"]
                    .as_str()
                    .is_some_and(|s| s.starts_with(prefix))
        })
        .collect();
    if matches.len() > 1 {
        return Err(AppError::precondition(
            "Múltiplas instalações do serviço; consulte service list e resolva a seleção",
        ));
    }
    Ok(matches.into_iter().next())
}

pub fn observation(id: &str, runner: &Runner) -> Result<Observation> {
    if id == "portainer"
        && let Some(value) = crate::swarm_services::portainer(runner)?
    {
        if find(id, runner)?.is_some() {
            return Err(AppError::precondition(
                "Portainer standalone e Swarm coexistem; selecione a topologia antes de alterar",
            ));
        }
        return Ok(value);
    }
    let value = find(id, runner)?;
    Ok(Observation {
        component: id.into(),
        owner: value.as_ref().map(|v| {
            if v["Config"]["Labels"][MANAGED] == "true" && v["Config"]["Labels"][COMPONENT] == id {
                format!("docker:{id}")
            } else {
                "external".into()
            }
        }),
        path: value
            .as_ref()
            .and_then(|v| v["Id"].as_str())
            .map(str::to_owned),
        version: value
            .as_ref()
            .and_then(|v| v["Image"].as_str())
            .map(str::to_owned),
        present: value.is_some(),
        managed: value.as_ref().is_some_and(|v| {
            v["Config"]["Labels"][MANAGED] == "true" && v["Config"]["Labels"][COMPONENT] == id
        }),
        observed_at: state::now(),
    })
}

pub fn list(runner: &Runner) -> Result<Value> {
    let docker = Docker::new(runner)?;
    let containers = docker
        .containers()?
        .iter()
        .map(public_container)
        .collect::<Vec<_>>();
    let swarm = docker.info()?["Swarm"].clone();
    let mut services = Vec::new();
    if swarm["ControlAvailable"] == true {
        let ids = docker.command(&["service".into(), "ls".into(), "--quiet".into()])?;
        for id in ids.stdout.lines().filter(|s| !s.is_empty()) {
            validate_id(id)?;
            let v = docker.json(&["service", "inspect", id])?;
            let v = &v[0];
            services.push(crate::swarm_services::public(v));
        }
    }
    let summaries = |kind: &str| -> Result<Vec<Value>> {
        let output = docker.command(&[
            kind.into(),
            "ls".into(),
            "--format".into(),
            "{{json .}}".into(),
        ])?;
        let mut result = Vec::new();
        for line in output.stdout.lines().filter(|s| !s.is_empty()) {
            let v: Value = serde_json::from_str(line)?;
            result.push(json!({"id":v["ID"],"name":v["Name"],"driver":v["Driver"],"scope":v["Scope"],"managed":v["Labels"].as_str().is_some_and(|s|s.split(',').any(|l|l=="dev.setupvibe.managed=true"))}));
        }
        Ok(result)
    };
    let networks = summaries("network")?;
    let volumes = summaries("volume")?;
    let endpoint = docker.endpoint()?;
    let endpoint = if let Some((_, host)) = endpoint.rsplit_once('@') {
        format!(
            "{}://[identidade omitida]@{host}",
            endpoint.split("://").next().unwrap_or("docker")
        )
    } else {
        endpoint
    };
    let mut stacks = std::collections::BTreeSet::new();
    for v in crate::swarm_services::raw_services(&docker)? {
        if let Some(name) = v["Spec"]["Labels"]["com.docker.stack.namespace"].as_str() {
            stacks.insert(name.to_owned());
        }
    }
    Ok(
        json!({"containers":containers,"swarm_services":services,"networks":networks,"volumes":volumes,"stacks":stacks,"docker_endpoint":endpoint,"observed_at":state::now()}),
    )
}

pub fn inspect(id: &str, runner: &Runner) -> Result<Value> {
    let docker = Docker::new(runner)?;
    match docker.inspect_raw(id) {
        Ok(v) => Ok(public_container(&v)),
        Err(_) => Ok(crate::swarm_services::public(
            &crate::swarm_services::inspect_raw(id, &docker)?,
        )),
    }
}

pub fn control(
    id: &str,
    action: &str,
    edition: Edition,
    runner: &Runner,
    dry: bool,
    directory: &Path,
) -> Result<Value> {
    if !["start", "stop", "restart"].contains(&action) {
        return Err(AppError::invalid("Operação de serviço inválida"));
    }
    let docker = Docker::new(runner)?;
    docker.socket()?;
    let value = match docker.inspect_raw(id) {
        Ok(v) => v,
        Err(_) => {
            return crate::swarm_services::control(id, action, edition, runner, directory, dry);
        }
    };
    if !value["Config"]["Labels"]["com.docker.swarm.service.id"].is_null() {
        return Err(AppError::precondition(
            "Controle o serviço Swarm, não uma task isolada",
        ));
    }
    allowed(&value, edition)?;
    if dry {
        return Ok(json!({"dry_run":true,"action":action,"service":public_container(&value)}));
    }
    let actual = value["Id"]
        .as_str()
        .ok_or_else(|| AppError::precondition("Container sem ID"))?;
    docker.command(&[action.into(), actual.into()])?;
    Ok(public_container(&docker.inspect_raw(actual)?))
}

pub fn logs(id: &str, since: Option<&str>, tail: u32, runner: &Runner) -> Result<Value> {
    validate_id(id)?;
    let docker = Docker::new(runner)?;
    let is_swarm = match docker.inspect_raw(id) {
        Ok(_) => false,
        Err(_) => {
            crate::swarm_services::inspect_raw(id, &docker)?;
            true
        }
    };
    let mut args = vec![
        "logs".into(),
        "--timestamps".into(),
        "--tail".into(),
        tail.to_string(),
    ];
    if is_swarm {
        args.insert(0, "service".into());
    }
    if let Some(since) = since {
        chrono::DateTime::parse_from_rfc3339(since)
            .map_err(|_| AppError::invalid("--since exige RFC3339"))?;
        args.extend(["--since".into(), since.into()]);
    }
    args.push(id.into());
    let output = docker.command(&args)?;
    Ok(
        json!({"id":id,"stdout":output.stdout,"stderr":output.stderr,"truncated":output.truncated,"tail":tail}),
    )
}

pub fn follow_logs(
    id: &str,
    since: Option<&str>,
    tail: u32,
    runner: &Runner,
    output: crate::output::Output,
) -> Result<Value> {
    use crate::output::Output;
    if output == Output::Json {
        return Err(AppError::invalid("--follow exige --output ndjson ou text"));
    }
    validate_id(id)?;
    let docker = Docker::new(runner)?;
    let is_swarm = match docker.inspect_raw(id) {
        Ok(_) => false,
        Err(_) => {
            crate::swarm_services::inspect_raw(id, &docker)?;
            true
        }
    };
    let binary = crate::adapters::executable("docker")
        .ok_or_else(|| AppError::precondition("Docker ausente"))?;
    let mut args = vec![
        "logs".into(),
        "--follow".into(),
        "--timestamps".into(),
        "--tail".into(),
        tail.to_string(),
    ];
    if is_swarm {
        args.insert(0, "service".into());
    }
    if let Some(s) = since {
        chrono::DateTime::parse_from_rfc3339(s)
            .map_err(|_| AppError::invalid("--since exige RFC3339"))?;
        args.extend(["--since".into(), s.into()]);
    }
    args.push(id.into());
    runner.follow(&binary.to_string_lossy(), &args, |stream, line| {
        if output == Output::Ndjson {
            output.event("log", json!({"id":id,"stream":stream,"line":line}))
        } else {
            use std::io::Write;
            std::io::stdout()
                .write_all(line.as_bytes())
                .map_err(AppError::from)
        }
    })?;
    Ok(json!({"id":id,"finished":true}))
}

fn labels(id: &str, role: &str) -> Value {
    json!({MANAGED:"true",COMPONENT:id,"dev.setupvibe.role":role,"dev.setupvibe.schema":"1"})
}

fn template(id: &str, role: &str) -> Result<Value> {
    let text = match (id, role) {
        ("portainer", "server") => include_str!("../catalog/templates/portainer-server.json"),
        ("portainer", "agent") => include_str!("../catalog/templates/portainer-agent.json"),
        ("postgresql", _) => include_str!("../catalog/templates/postgresql.json"),
        ("redis", _) => include_str!("../catalog/templates/redis.json"),
        ("mailpit", _) => include_str!("../catalog/templates/mailpit.json"),
        _ => return Err(AppError::invalid("Template inexistente")),
    };
    Ok(serde_json::from_str(text)?)
}

pub(crate) fn ensure_volume(docker: &Docker<'_>, name: &str, id: &str, dry: bool) -> Result<()> {
    let names = docker.command(&["volume".into(), "ls".into(), "--quiet".into()])?;
    if names.stdout.lines().any(|n| n == name) {
        let v = docker.json(&["volume", "inspect", name])?;
        if v[0]["Labels"][MANAGED] != "true" || v[0]["Labels"][COMPONENT] != id {
            return Err(AppError::precondition(
                "Volume existente não pertence ao SetupVibe; preservado",
            ));
        }
    } else if !dry {
        docker.api(
            "POST",
            "/volumes/create",
            Some(&json!({"Name":name,"Labels":labels(id,"")})),
        )?;
    }
    Ok(())
}

fn password(directory: &Path) -> Result<std::path::PathBuf> {
    let root = directory.join("secrets");
    state::private_dir(&root)?;
    let file = root.join("postgresql-password");
    match fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .mode(0o600)
        .custom_flags(libc::O_NOFOLLOW)
        .open(&file)
    {
        Ok(mut f) => {
            f.write_all(uuid::Uuid::new_v4().simple().to_string().as_bytes())?;
            f.sync_all()?;
        }
        Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
            use std::os::unix::fs::MetadataExt;
            let m = fs::symlink_metadata(&file)?;
            if !m.is_file() || m.mode() & 0o077 != 0 || m.uid() != unsafe { libc::geteuid() } {
                return Err(AppError::precondition(
                    "Arquivo de senha deve ser regular e privado",
                ));
            }
        }
        Err(e) => return Err(e.into()),
    }
    Ok(file)
}

fn create_config(step: &Step, directory: &Path, docker: &Docker<'_>, dry: bool) -> Result<Value> {
    let id = &step.component;
    let role = step
        .options
        .get("role")
        .and_then(Value::as_str)
        .unwrap_or("");
    let template = template(id, role)?;
    let bind = step
        .options
        .get("bind")
        .and_then(Value::as_str)
        .unwrap_or("127.0.0.1");
    let port = step.options["port"]
        .as_u64()
        .ok_or_else(|| AppError::invalid("Porta ausente"))?;
    let mut mappings = vec![(
        port,
        template["port"]
            .as_u64()
            .ok_or_else(|| AppError::invalid("Template sem porta"))?,
    )];
    if id == "mailpit" {
        mappings.push((step.options["smtp-port"].as_u64().unwrap_or(1025), 1025));
    }
    let existing = docker.containers()?;
    let mut seen = std::collections::BTreeSet::new();
    let mut bindings = serde_json::Map::new();
    let mut exposed = serde_json::Map::new();
    for (host, container) in mappings {
        if !seen.insert(host) {
            return Err(AppError::precondition("Duas portas do plano colidem"));
        }
        if existing.iter().any(|v| {
            v["HostConfig"]["PortBindings"]
                .as_object()
                .is_some_and(|ports| {
                    ports.values().any(|entries| {
                        entries.as_array().is_some_and(|a| {
                            a.iter().any(|p| {
                                p["HostPort"].as_str().and_then(|p| p.parse::<u64>().ok())
                                    == Some(host)
                            })
                        })
                    })
                })
        }) {
            return Err(AppError::precondition(format!(
                "Porta {host} já reservada por container"
            )));
        }
        let _probe = TcpListener::bind((bind, host as u16))
            .map_err(|_| AppError::precondition(format!("Porta {host} indisponível")))?;
        bindings.insert(
            format!("{container}/tcp"),
            json!([{"HostIp":bind,"HostPort":host.to_string()}]),
        );
        exposed.insert(format!("{container}/tcp"), json!({}));
    }
    let mut mounts = Vec::new();
    if let Some(target) = template["data"].as_str() {
        let volume = format!("setupvibe-{id}-data");
        ensure_volume(docker, &volume, id, dry)?;
        mounts.push(json!({"Type":"volume","Source":volume,"Target":target}));
    }
    if id == "portainer" {
        let info = docker.info()?;
        if info["SecurityOptions"].as_array().is_some_and(|a| {
            a.iter()
                .any(|v| v.as_str().is_some_and(|s| s.contains("rootless")))
        }) {
            return Err(AppError::unsupported(
                "Portainer requer adaptação de mounts para Docker rootless",
            ));
        }
        mounts.push(
            json!({"Type":"bind","Source":"/var/run/docker.sock","Target":"/var/run/docker.sock"}),
        );
        if role == "agent" {
            let root = info["DockerRootDir"]
                .as_str()
                .ok_or_else(|| AppError::precondition("Docker sem diretório de dados"))?;
            mounts.push(json!({"Type":"bind","Source":format!("{root}/volumes"),"Target":"/var/lib/docker/volumes"}));
        }
    }
    let mut env = template["env"].as_array().cloned().unwrap_or_default();
    if id == "postgresql" {
        let file = if dry {
            directory.join("secrets/postgresql-password")
        } else {
            password(directory)?
        };
        mounts.push(json!({"Type":"bind","Source":file,"Target":"/run/secrets/postgresql-password","ReadOnly":true}));
        env.push(json!(
            "POSTGRES_PASSWORD_FILE=/run/secrets/postgresql-password"
        ));
    }
    let mut config = json!({"Image":template["image"],"Labels":labels(id,role),"Env":env,"ExposedPorts":exposed,
        "HostConfig":{"Mounts":mounts,"PortBindings":bindings,"RestartPolicy":{"Name":"unless-stopped"}}});
    if !template["cmd"].is_null() {
        config["Cmd"] = template["cmd"].clone();
    }
    if !template["health"].is_null() {
        config["Healthcheck"] = json!({"Test":template["health"],"Interval":5_000_000_000u64,"Timeout":3_000_000_000u64,"Retries":12,"StartPeriod":5_000_000_000u64});
    }
    Ok(config)
}

fn wait_running(docker: &Docker<'_>, id: &str) -> Result<()> {
    let start = Instant::now();
    loop {
        if CANCELLED.load(Ordering::SeqCst) {
            return Err(AppError::new(130, "Operação cancelada"));
        }
        let value = docker.inspect_raw(id)?;
        let state = value["State"]["Status"].as_str().unwrap_or("unknown");
        let health = value["State"]["Health"]["Status"].as_str();
        if state == "running"
            && (health == Some("healthy")
                || health.is_none() && start.elapsed() > Duration::from_secs(2))
        {
            return Ok(());
        }
        if ["exited", "dead"].contains(&state) || health == Some("unhealthy") {
            return Err(AppError::precondition(
                "Container não ficou saudável; consulte logs",
            ));
        }
        if start.elapsed() > docker.runner.timeout {
            return Err(AppError::new(6, "Tempo limite aguardando serviço"));
        }
        std::thread::sleep(Duration::from_millis(250));
    }
}

pub fn apply(step: &Step, directory: &Path, edition: Edition, runner: &Runner) -> Result<()> {
    let docker = Docker::new(runner)?;
    docker.socket()?;
    if step.component == "portainer" {
        if crate::swarm_services::portainer(runner)?.is_some() {
            return crate::swarm_services::update(runner);
        }
        if crate::swarm_services::selected(step, runner)? {
            return crate::swarm_services::deploy(step, runner);
        }
    }
    let old = find(&step.component, runner)?;
    let name = format!("setupvibe-{}", step.component);
    let mut config;
    if let Some(old) = &old {
        allowed(old, edition)?;
        if step.action != Action::Update {
            return Ok(());
        }
        config = old["Config"].clone();
        config["HostConfig"] = old["HostConfig"].clone();
        // Preserva aliases de redes; endereços alocados dinamicamente não são copiados.
        let mut endpoints = serde_json::Map::new();
        if let Some(networks) = old["NetworkSettings"]["Networks"].as_object() {
            for (name, n) in networks {
                endpoints.insert(
                    name.clone(),
                    json!({"Aliases":n["Aliases"],"IPAMConfig":n["IPAMConfig"]}),
                );
            }
        }
        config["NetworkingConfig"] = json!({"EndpointsConfig":endpoints});
    } else {
        config = create_config(step, directory, &docker, false)?;
    }
    let image = config["Image"]
        .as_str()
        .ok_or_else(|| AppError::precondition("Imagem ausente"))?
        .to_owned();
    docker.command(&["pull".into(), image])?;
    let old_id = old.as_ref().and_then(|v| v["Id"].as_str());
    let was_running = old.as_ref().is_none_or(|v| v["State"]["Running"] == true);
    let old_name = old
        .as_ref()
        .and_then(|v| v["Name"].as_str())
        .unwrap_or(&name)
        .trim_start_matches('/');
    let backup = format!("{name}-backup-{}", uuid::Uuid::new_v4().simple());
    if let Some(id) = old_id {
        if was_running {
            docker.command(&["stop".into(), id.into()])?;
        }
        if let Err(e) = docker.command(&["rename".into(), id.into(), backup]) {
            if was_running {
                let _ = docker.command(&["start".into(), id.into()]);
            }
            return Err(e);
        }
    }
    let mut created = None;
    let result = (|| -> Result<()> {
        let response = docker.api(
            "POST",
            &format!("/containers/create?name={name}"),
            Some(&config),
        )?;
        let id = response["Id"]
            .as_str()
            .ok_or_else(|| AppError::precondition("Docker não retornou ID"))?
            .to_owned();
        created = Some(id.clone());
        if was_running {
            docker.api("POST", &format!("/containers/{id}/start"), None)?;
            wait_running(&docker, &id)?;
        }
        Ok(())
    })();
    if let Err(error) = result {
        // Cancelamento interrompe a operação, mas permite restaurar o container anterior.
        let cancelled = CANCELLED.swap(false, Ordering::SeqCst);
        let mut rollback_errors = Vec::new();
        if let Some(id) = created
            && let Err(e) = docker.command(&["rm".into(), "--force".into(), id])
        {
            rollback_errors.push(e.message);
        }
        if let Some(id) = old_id {
            if let Err(e) = docker.command(&["rename".into(), id.into(), old_name.into()]) {
                rollback_errors.push(e.message);
            }
            if was_running && let Err(e) = docker.command(&["start".into(), id.into()]) {
                rollback_errors.push(e.message);
            }
        }
        CANCELLED.fetch_or(cancelled, Ordering::SeqCst);
        return Err(AppError::new(
            error.code,
            format!(
                "{}; restauração: {}",
                error.message,
                if rollback_errors.is_empty() {
                    "concluída (volumes preservados)".into()
                } else {
                    rollback_errors.join("; ")
                }
            ),
        ));
    }
    if let Some(id) = old_id {
        docker.command(&["rm".into(), id.into()])?;
    }
    Ok(())
}

pub fn updates(id: &str, runner: &Runner) -> Result<Value> {
    if id == "portainer" && crate::swarm_services::portainer(runner)?.is_some() {
        let docker = Docker::new(runner)?;
        let mut updates = Vec::new();
        let mut available = false;
        for service in crate::swarm_services::raw_services(&docker)?
            .iter()
            .filter(|v| v["Spec"]["Labels"][COMPONENT] == "portainer")
        {
            let current = service["Spec"]["TaskTemplate"]["ContainerSpec"]["Image"]
                .as_str()
                .ok_or_else(|| AppError::precondition("Serviço sem imagem"))?;
            let image = current.split('@').next().unwrap_or(current);
            let manifest = docker.json(&[
                "buildx",
                "imagetools",
                "inspect",
                "--format",
                "{{json .Manifest}}",
                image,
            ])?;
            let digest = manifest["digest"].as_str();
            let changed = digest.map(|d| !current.ends_with(d));
            available |= changed == Some(true);
            updates.push(json!({"service_id":service["ID"],"current_image":current,"manifest":manifest,"available":changed}));
        }
        return Ok(
            json!({"component":id,"owner":"docker:portainer","available":available,"services":updates}),
        );
    }
    let value = find(id, runner)?.ok_or_else(|| AppError::precondition("Serviço não instalado"))?;
    let image = value["Config"]["Image"]
        .as_str()
        .ok_or_else(|| AppError::precondition("Imagem ausente"))?;
    let docker = Docker::new(runner)?;
    let local = docker.json(&["image", "inspect", image])?;
    // Consulta remota não puxa nem recria imagens; o digest remoto pode ser multiarch.
    let remote = docker.json(&[
        "buildx",
        "imagetools",
        "inspect",
        "--format",
        "{{json .Manifest}}",
        image,
    ])?;
    let digest = remote["digest"].as_str();
    let available = digest.map(|d| {
        local[0]["Id"] != value["Image"]
            || !local[0]["RepoDigests"]
                .as_array()
                .is_some_and(|a| a.iter().any(|v| v.as_str().is_some_and(|s| s.ends_with(d))))
    });
    Ok(
        json!({"component":id,"owner":format!("docker:{id}"),"image":image,"running_image_id":value["Image"],"remote_manifest":remote,"available":available}),
    )
}

pub fn preview(step: &Step, directory: &Path, edition: Edition, runner: &Runner) -> Result<Value> {
    let docker = Docker::new(runner)?;
    docker.socket()?;
    if step.component == "portainer"
        && step.action == Action::Update
        && crate::swarm_services::portainer(runner)?.is_some()
    {
        return Ok(
            json!({"deployment":"swarm","action":"update","preserve_configuration":true,"preserve_volumes":true,"services":crate::swarm_services::raw_services(&docker)?.iter().filter(|v|v["Spec"]["Labels"][COMPONENT]=="portainer").map(crate::swarm_services::public).collect::<Vec<_>>()}),
        );
    }
    if step.component == "portainer" && crate::swarm_services::selected(step, runner)? {
        return crate::swarm_services::plan(step, runner);
    }
    if let Some(current) = find(&step.component, runner)? {
        if step.action == Action::Update {
            allowed(&current, edition)?;
        }
        return Ok(
            json!({"current":public_container(&current),"action":step.action,"preserve_configuration":true,"preserve_volumes":true}),
        );
    }
    let config = create_config(step, directory, &docker, true)?;
    Ok(
        json!({"image":config["Image"],"ports":config["HostConfig"]["PortBindings"],"mounts":config["HostConfig"]["Mounts"],"healthcheck":config["Healthcheck"],"action":step.action,"note":"Portas verificadas agora; Docker confirma novamente ao criar"}),
    )
}

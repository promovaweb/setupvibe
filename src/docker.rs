//! Cliente Docker: JSON em memória e API por socket Unix, sem token em argv.
use crate::{
    adapters::executable,
    error::{AppError, Result},
    process::{ProcessOutput, Runner},
};
use serde_json::{Value, json};

pub struct Docker<'a> {
    pub runner: &'a Runner,
    binary: String,
    endpoint: std::cell::RefCell<Option<String>>,
}
impl<'a> Docker<'a> {
    pub fn new(runner: &'a Runner) -> Result<Self> {
        Ok(Self {
            runner,
            endpoint: std::cell::RefCell::new(None),
            binary: executable("docker")
                .ok_or_else(|| AppError::precondition("Docker não instalado"))?
                .to_string_lossy()
                .into(),
        })
    }
    pub fn command(&self, args: &[String]) -> Result<ProcessOutput> {
        self.runner.checked(&self.binary, args)
    }
    pub fn json(&self, args: &[&str]) -> Result<Value> {
        self.runner.json(
            &self.binary,
            &args.iter().map(|s| (*s).into()).collect::<Vec<_>>(),
            None,
        )
    }
    pub fn info(&self) -> Result<Value> {
        self.json(&["info", "--format", "{{json .}}"])
    }
    pub fn endpoint(&self) -> Result<String> {
        if let Some(endpoint) = self.endpoint.borrow().as_ref() {
            return Ok(endpoint.clone());
        }
        let endpoint = if let Ok(host) = std::env::var("DOCKER_HOST")
            && std::env::var("DOCKER_CONTEXT")
                .ok()
                .is_none_or(|v| v.is_empty())
        {
            host
        } else {
            self.json(&[
                "context",
                "inspect",
                "--format",
                "{{json .Endpoints.docker.Host}}",
            ])?
            .as_str()
            .ok_or_else(|| AppError::precondition("Contexto Docker sem endpoint"))?
            .to_owned()
        };
        *self.endpoint.borrow_mut() = Some(endpoint.clone());
        Ok(endpoint)
    }
    pub fn socket(&self) -> Result<String> {
        let endpoint = self.endpoint()?;
        let path = endpoint
            .strip_prefix("unix://")
            .filter(|p| p.starts_with('/'))
            .ok_or_else(|| {
                AppError::unsupported(
                    "Operações de serviço e Swarm exigem contexto Docker local por socket Unix",
                )
            })?;
        Ok(path.into())
    }
    pub fn api(&self, method: &str, path: &str, body: Option<&Value>) -> Result<Value> {
        let socket = self.socket()?;
        let curl = executable("curl")
            .ok_or_else(|| AppError::precondition("curl necessário para API Docker local"))?;
        let common = vec![
            "--fail-with-body".into(),
            "--silent".into(),
            "--show-error".into(),
            "--max-time".into(),
            self.runner.timeout.as_secs().to_string(),
            "--unix-socket".into(),
            socket,
        ];
        let version = self.runner.json(
            &curl.to_string_lossy(),
            &[common.clone(), vec!["http://localhost/version".into()]].concat(),
            None,
        )?;
        let api = version["ApiVersion"]
            .as_str()
            .ok_or_else(|| AppError::precondition("Docker sem versão da API"))?;
        let minor = api
            .strip_prefix("1.")
            .and_then(|v| v.parse::<u32>().ok())
            .ok_or_else(|| AppError::unsupported("API Docker desconhecida"))?
            .min(53);
        let minimum = version["MinAPIVersion"]
            .as_str()
            .unwrap_or("1.24")
            .strip_prefix("1.")
            .and_then(|v| v.parse::<u32>().ok())
            .unwrap_or(54);
        if minor < 41 || minimum > 53 {
            return Err(AppError::unsupported(
                "API Docker fora do intervalo 1.41–1.53",
            ));
        }
        let mut args = [
            common,
            vec![
                "--request".into(),
                method.into(),
                "--header".into(),
                "Content-Type: application/json".into(),
                format!("http://localhost/v1.{minor}{path}"),
            ],
        ]
        .concat();
        let bytes = body.map(serde_json::to_vec).transpose()?;
        if bytes.is_some() {
            args.extend(["--data-binary".into(), "@-".into()]);
        }
        self.runner
            .json(&curl.to_string_lossy(), &args, bytes.as_deref())
    }
    pub fn containers(&self) -> Result<Vec<Value>> {
        let result = self.command(&[
            "ps".into(),
            "--all".into(),
            "--quiet".into(),
            "--no-trunc".into(),
        ])?;
        let mut values = Vec::new();
        for id in result.stdout.lines().filter(|s| !s.is_empty()) {
            validate_id(id)?;
            values.push(self.inspect_raw(id)?);
        }
        Ok(values)
    }
    pub fn inspect_raw(&self, id: &str) -> Result<Value> {
        validate_id(id)?;
        self.json(&["container", "inspect", id])?
            .as_array()
            .and_then(|v| v.first())
            .cloned()
            .ok_or_else(|| AppError::precondition("Container não encontrado"))
    }
}

pub fn validate_id(id: &str) -> Result<()> {
    if id.is_empty()
        || id.len() > 128
        || id.starts_with('-')
        || !id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"_.-".contains(&b))
    {
        return Err(AppError::invalid("Identificador Docker inválido"));
    }
    Ok(())
}

pub fn public_container(v: &Value) -> Value {
    let labels = &v["Config"]["Labels"];
    json!({"kind":"container","id":v["Id"],"name":v["Name"].as_str().unwrap_or("").trim_start_matches('/'),
        "image":v["Config"]["Image"],"image_id":v["Image"],"state":v["State"]["Status"],
        "health":v["State"]["Health"]["Status"],"started_at":v["State"]["StartedAt"],
        "ports":v["NetworkSettings"]["Ports"],"mounts":v["Mounts"],
        "managed":labels["dev.setupvibe.managed"]=="true","component":labels["dev.setupvibe.component"],
        "role":labels["dev.setupvibe.role"],"resources":{"memory_limit_bytes":v["HostConfig"]["Memory"],"nano_cpus":v["HostConfig"]["NanoCpus"]}})
}

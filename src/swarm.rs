//! Operações explícitas de Swarm; tokens entram somente pelo corpo da API local.
use crate::{
    docker::Docker,
    error::{AppError, Result},
    process::Runner,
};
use serde_json::{Value, json};

pub fn status(runner: &Runner) -> Result<Value> {
    let info = Docker::new(runner)?.info()?;
    let s = &info["Swarm"];
    Ok(
        json!({"local_state":s["LocalNodeState"],"node_id":s["NodeID"],"node_address":s["NodeAddr"],"manager":s["ControlAvailable"],"nodes":s["Nodes"],"managers":s["Managers"],"observed_at":crate::state::now()}),
    )
}
pub fn init(address: &str, runner: &Runner, dry: bool) -> Result<Value> {
    address
        .parse::<std::net::IpAddr>()
        .map_err(|_| AppError::invalid("--advertise-addr exige endereço IP explícito"))?;
    let docker = Docker::new(runner)?;
    docker.socket()?;
    if docker.info()?["Swarm"]["LocalNodeState"] != "inactive" {
        return Err(AppError::precondition("Swarm já configurado; preservado"));
    }
    if dry {
        return Ok(json!({"dry_run":true,"action":"swarm_init","advertise_address":address}));
    }
    docker.api(
        "POST",
        "/swarm/init",
        Some(&json!({"ListenAddr":"0.0.0.0:2377","AdvertiseAddr":address,"ForceNewCluster":false})),
    )?;
    status(runner)
}
pub fn join(manager: &str, token: &str, runner: &Runner, dry: bool) -> Result<Value> {
    if manager.parse::<std::net::SocketAddr>().is_err() {
        return Err(AppError::invalid("Gerenciador exige IP:porta"));
    }
    if !dry
        && (!token.starts_with("SWMTKN-")
            || token.len() > 2048
            || token.bytes().any(|b| b.is_ascii_whitespace()))
    {
        return Err(AppError::invalid("Token Swarm inválido"));
    }
    let docker = Docker::new(runner)?;
    docker.socket()?;
    if docker.info()?["Swarm"]["LocalNodeState"] != "inactive" {
        return Err(AppError::precondition("Swarm já configurado; preservado"));
    }
    if dry {
        return Ok(
            json!({"dry_run":true,"action":"swarm_join","manager":manager,"token_source":"stdin"}),
        );
    }
    docker.api(
        "POST",
        "/swarm/join",
        Some(&json!({"ListenAddr":"0.0.0.0:2377","RemoteAddrs":[manager],"JoinToken":token})),
    )?;
    status(runner)
}

//! Processo independente: o host e o Docker usam conexões e ciclos separados.
use crate::{
    docker::{Docker, validate_id},
    error::{AppError, Result},
    metrics::set_health,
    process::{CANCELLED, Runner},
    state::{self, Database, StateLock, Store},
};
use chrono::Utc;
use rusqlite::params;
use serde_json::{Value, json};
use std::{
    collections::{BTreeMap, BTreeSet},
    path::Path,
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
    thread,
    time::{Duration, Instant},
};
use sysinfo::{Disks, System};

fn stopped(stop: &AtomicBool) -> bool {
    stop.load(Ordering::SeqCst) || CANCELLED.load(Ordering::SeqCst)
}
fn wait(stop: &AtomicBool, deadline: Instant) {
    while !stopped(stop) && Instant::now() < deadline {
        thread::sleep(
            Duration::from_millis(50).min(deadline.saturating_duration_since(Instant::now())),
        );
    }
}

/// O limite de amostras se aplica a ciclos do host; Docker encerra o ciclo em curso.
pub fn run(directory: &Path, interval: u64, samples: Option<u64>) -> Result<Value> {
    if !(1..=3600).contains(&interval) || samples == Some(0) {
        return Err(AppError::invalid(
            "Intervalo ou quantidade de amostras inválida",
        ));
    }
    let _lock = StateLock::acquire(directory, "collector")?;
    let mut host = Store::write(directory, Database::Metrics)?;
    let docker_store = Store::write(directory, Database::Metrics)?;
    let session = uuid::Uuid::new_v4().to_string();
    host.connection.execute(
        "INSERT INTO collection_sessions(id,started_at,interval_seconds) VALUES(?1,?2,?3)",
        params![session, state::now(), interval as i64],
    )?;
    set_health(&host, "collector", None)?;
    let stop = Arc::new(AtomicBool::new(false));
    let docker_stop = stop.clone();
    let docker_session = session.clone();
    let worker =
        thread::spawn(move || docker_loop(docker_store, &docker_session, interval, &docker_stop));
    let result = host_loop(&mut host, &session, interval, samples, &stop);
    stop.store(true, Ordering::SeqCst);
    let docker_result = worker
        .join()
        .map_err(|_| AppError::new(1, "Thread Docker terminou inesperadamente"))?;
    set_health(&host, "collector", Some("stopped"))?;
    let count = result?;
    docker_result?;
    if CANCELLED.load(Ordering::SeqCst) {
        return Err(AppError::new(130, "Coleta encerrada por sinal"));
    }
    Ok(
        json!({"session_id":session,"host_cycles":count,"interval_seconds":interval,"retention_days":7,"stopped":true}),
    )
}

fn host_loop(
    store: &mut Store,
    session: &str,
    interval: u64,
    limit: Option<u64>,
    stop: &AtomicBool,
) -> Result<u64> {
    let mut system = System::new();
    let mut disks = Disks::new();
    let mut count = 0;
    let mut previous: Option<chrono::DateTime<Utc>> = None;
    let mut known = BTreeSet::new();
    loop {
        if stopped(stop) {
            break;
        }
        let started = Instant::now();
        let at = Utc::now();
        let elapsed = previous.map(|p| (at - p).num_milliseconds() as f64 / 1000.);
        let gap = elapsed.is_some_and(|v| v > interval as f64 * 2. || v < 0.);
        system.refresh_cpu_usage();
        system.refresh_memory();
        disks.refresh(true);
        let cpu = if count == 0 || gap {
            None
        } else {
            Some(system.global_cpu_usage())
        };
        let tx = store.connection.transaction()?;
        let stamp = at.to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        let write = |scope: &str, id: &str, payload: Value| -> Result<()> {
            tx.execute(
                "INSERT INTO samples(scope,resource,sampled_at,payload) VALUES(?1,?2,?3,?4)",
                params![scope, id, stamp, serde_json::to_string(&payload)?],
            )?;
            Ok(())
        };
        write(
            "host",
            "host",
            json!({"available":true,"session_id":session,"interval_seconds":interval,"gap_seconds":if gap {elapsed}else{None},"clock_reversed":elapsed.is_some_and(|v|v<0.),"cpu_percent":cpu,"cpu_status":if cpu.is_some(){"measured"}else{"warming_up"},"logical_cpus":system.cpus().len(),"memory_total_bytes":system.total_memory(),"memory_used_bytes":system.used_memory(),"memory_available_bytes":system.available_memory(),"swap_total_bytes":system.total_swap(),"swap_used_bytes":system.used_swap()}),
        )?;
        let mut current = BTreeSet::new();
        for disk in &disks {
            let id = disk.mount_point().to_string_lossy().to_string();
            current.insert(id.clone());
            let usage = disk.usage();
            // Contadores nulos não comprovam suporte de I/O em todos os SOs/filesystems.
            let io = if count == 0 || gap || usage.total_read_bytes + usage.total_written_bytes == 0
            {
                None
            } else {
                elapsed.filter(|s|*s>0.).map(|s|json!({"read_bytes_per_second":usage.read_bytes as f64/s,"written_bytes_per_second":usage.written_bytes as f64/s,"total_read_bytes":usage.total_read_bytes,"total_written_bytes":usage.total_written_bytes}))
            };
            write(
                "disk",
                &id,
                json!({"available":true,"session_id":session,"interval_seconds":interval,"gap_seconds":if gap {elapsed}else{None},"device":disk.name().to_string_lossy(),"mount_point":id,"filesystem":disk.file_system().to_string_lossy(),"total_bytes":disk.total_space(),"available_bytes":disk.available_space(),"io":io}),
            )?;
        }
        for id in known.difference(&current) {
            write(
                "disk",
                id,
                json!({"available":false,"reason":"removed","session_id":session}),
            )?;
        }
        tx.commit()?;
        known = current;
        previous = Some(at);
        count += 1;
        set_health(store, "host", None)?;
        set_health(store, "collector", None)?;
        // Trabalho limitado por ciclo para não monopolizar o banco.
        for _ in 0..4 {
            if store.purge_metrics()? < 1000 {
                break;
            }
        }
        let cutoff = (Utc::now() - chrono::Duration::seconds(state::RETENTION_SECONDS))
            .to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        store.connection.execute("DELETE FROM collection_sessions WHERE id IN (SELECT id FROM collection_sessions WHERE started_at<?1 AND id<>?2 LIMIT 100)",params![cutoff,session])?;
        if limit.is_some_and(|n| count >= n) {
            break;
        }
        wait(stop, started + Duration::from_secs(interval));
    }
    Ok(count)
}

fn docker_loop(store: Store, session: &str, interval: u64, stop: &AtomicBool) -> Result<()> {
    let runner = Runner {
        timeout: Duration::from_secs(2),
    };
    let mut counters = BTreeMap::new();
    let mut known = BTreeSet::new();
    // Executa um ciclo mesmo quando --once termina rapidamente no host.
    loop {
        let started = Instant::now();
        let result = docker_cycle(
            &store,
            session,
            interval,
            &runner,
            &mut counters,
            &mut known,
            stop,
        );
        match result {
            Ok(()) => set_health(&store, "docker", None)?,
            Err(error) => {
                counters.clear();
                let code = format!("source_error_{}", error.code);
                set_health(&store, "docker", Some(&code))?;
                store.add_sample("source","docker",&state::now(),&json!({"available":false,"session_id":session,"error_code":code,"reason":"Docker local indisponível; consulte docker verify e o contexto ativo"}))?;
            }
        }
        if stopped(stop) {
            break;
        }
        wait(stop, started + Duration::from_secs(interval));
        if stopped(stop) {
            break;
        }
    }
    Ok(())
}

#[derive(Clone)]
struct Counter {
    cpu: u64,
    system: u64,
    at: chrono::DateTime<Utc>,
    endpoint: String,
}

fn docker_cycle(
    store: &Store,
    session: &str,
    interval: u64,
    runner: &Runner,
    counters: &mut BTreeMap<String, Counter>,
    known: &mut BTreeSet<String>,
    stop: &AtomicBool,
) -> Result<()> {
    let docker = Docker::new(runner)?;
    let endpoint = docker.endpoint()?;
    if !endpoint.starts_with("unix:///") {
        return Err(AppError::unsupported("Coletor exige Docker local"));
    }
    let list = docker.api("GET", "/containers/json?all=1", None)?;
    let containers = list
        .as_array()
        .ok_or_else(|| AppError::precondition("Lista Docker inválida"))?;
    let mut current = BTreeSet::new();
    let mut failed = 0;
    for item in containers {
        if CANCELLED.load(Ordering::SeqCst) {
            break;
        }
        let id = item["Id"]
            .as_str()
            .ok_or_else(|| AppError::precondition("Container sem id"))?;
        validate_id(id)?;
        current.insert(id.to_owned());
        let at = Utc::now();
        let mut value = json!({"session_id":session,"interval_seconds":interval,"available":false,"state":item["State"],"name":item["Names"].as_array().and_then(|v|v.first()),"endpoint":endpoint,"environment":if cfg!(target_os="macos"){"docker_vm"}else{"docker_host"}});
        if item["State"] != "running" {
            value["reason"] = json!("stopped");
            counters.remove(id);
        } else {
            match docker.api(
                "GET",
                &format!("/containers/{id}/stats?stream=false&one-shot=true"),
                None,
            ) {
                Ok(stats) => {
                    let cpu = stats
                        .pointer("/cpu_stats/cpu_usage/total_usage")
                        .and_then(Value::as_u64);
                    let system = stats
                        .pointer("/cpu_stats/system_cpu_usage")
                        .and_then(Value::as_u64);
                    let cpus = stats
                        .pointer("/cpu_stats/online_cpus")
                        .and_then(Value::as_u64)
                        .or_else(|| {
                            stats
                                .pointer("/cpu_stats/cpu_usage/percpu_usage")
                                .and_then(Value::as_array)
                                .map(|a| a.len() as u64)
                        });
                    let previous = counters.get(id).filter(|p| p.endpoint == endpoint);
                    let elapsed = previous.map(|p| (at - p.at).num_milliseconds() as f64 / 1000.);
                    let cpu_percent = previous
                        .and_then(|p| {
                            Some((
                                cpu?.checked_sub(p.cpu)?,
                                system?.checked_sub(p.system)?,
                                cpus?,
                            ))
                        })
                        .filter(|(_, s, _)| *s > 0)
                        .filter(|_| elapsed.is_some_and(|s| s > 0. && s <= interval as f64 * 2.))
                        .map(|(c, s, n)| c as f64 / s as f64 * n as f64 * 100.);
                    let usage = stats.pointer("/memory_stats/usage").and_then(Value::as_u64);
                    let cache = stats
                        .pointer("/memory_stats/stats/total_inactive_file")
                        .or_else(|| stats.pointer("/memory_stats/stats/inactive_file"))
                        .and_then(Value::as_u64);
                    value["available"] = json!(true);
                    value["cpu_percent"] = json!(cpu_percent);
                    value["gap_seconds"] =
                        json!(elapsed.filter(|s| *s > interval as f64 * 2. || *s < 0.));
                    value["memory_usage_bytes"] = json!(usage);
                    value["memory_cache_bytes"] = json!(cache);
                    value["memory_working_set_bytes"] =
                        json!(usage.zip(cache).map(|(u, c)| u.saturating_sub(c)));
                    value["memory_limit_bytes"] = stats
                        .pointer("/memory_stats/limit")
                        .cloned()
                        .unwrap_or(Value::Null);
                    if let (Some(cpu), Some(system)) = (cpu, system) {
                        counters.insert(
                            id.into(),
                            Counter {
                                cpu,
                                system,
                                at,
                                endpoint: endpoint.clone(),
                            },
                        );
                    }
                }
                Err(_) => {
                    value["reason"] = json!("stats_unavailable");
                    counters.remove(id);
                    failed += 1;
                }
            }
        }
        store.add_sample("container", id, &at.to_rfc3339(), &value)?;
        // Se houver muitos containers, o encerramento não precisa aguardar todos.
        if stopped(stop) {
            return Ok(());
        }
    }
    for id in known.difference(&current) {
        store.add_sample(
            "container",
            id,
            &state::now(),
            &json!({"available":false,"reason":"removed","session_id":session}),
        )?;
        counters.remove(id);
    }
    *known = current;
    store.add_sample("source","docker",&state::now(),&json!({"available":true,"session_id":session,"containers":known.len(),"failed_stats":failed,"endpoint":endpoint}))?;
    Ok(())
}

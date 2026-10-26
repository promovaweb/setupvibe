//! Consultas limitadas ao período de retenção, sem transformar ausência em zero.
use crate::{
    error::{AppError, Result},
    state::{self, Database, RETENTION_SECONDS, Store},
};
use chrono::{DateTime, Utc};
use rusqlite::params;
use serde_json::{Value, json};
use std::path::Path;

#[derive(clap::Args, Debug)]
pub struct Query {
    /// host, disk, container ou source
    #[arg(long, value_parser=["host", "disk", "container", "source"])]
    pub scope: Option<String>,
    /// Identificador exato do recurso
    #[arg(long)]
    pub id: Option<String>,
    #[arg(long, default_value="100", value_parser=clap::value_parser!(u32).range(1..=1000))]
    pub limit: u32,
    #[arg(long, default_value = "0")]
    pub offset: u32,
    /// Idade máxima em segundos para considerar a amostra atualizada
    #[arg(long, default_value="30", value_parser=clap::value_parser!(u64).range(1..=604800))]
    pub max_age: u64,
}

fn timestamp(value: &str) -> Result<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(value)
        .map(|d| d.with_timezone(&Utc))
        .map_err(|_| AppError::invalid("Timestamp deve usar RFC3339 com fuso horário"))
}
fn iso(value: DateTime<Utc>) -> String {
    value.to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

pub fn health(store: &Store) -> Result<Value> {
    let mut stmt = store.connection.prepare(
        "SELECT source,last_success_at,error_code FROM collector_health ORDER BY source",
    )?;
    let rows=stmt.query_map([], |r|Ok(json!({"source":r.get::<_,String>(0)?,"last_success_at":r.get::<_,Option<String>>(1)?,"error_code":r.get::<_,Option<String>>(2)?})))?;
    Ok(Value::Array(
        rows.collect::<std::result::Result<Vec<_>, _>>()?,
    ))
}

pub fn current(directory: &Path, query: &Query) -> Result<Value> {
    let now = Utc::now();
    let Some(store) = Store::read(directory, Database::Metrics)? else {
        return Ok(
            json!({"collected":false,"samples":[],"health":[],"collector_stopped":false,"has_more":false,"next_offset":null,"retention_days":7,"queried_at":iso(now)}),
        );
    };
    let health = health(&store)?;
    let collector_stopped = health.as_array().is_some_and(|rows| {
        rows.iter()
            .any(|h| h["source"] == "collector" && h["error_code"] == "stopped")
    });
    let docker_available = health
        .as_array()
        .and_then(|rows| rows.iter().find(|h| h["source"] == "docker"))
        .is_some_and(|h| h["error_code"].is_null());
    let mut stmt=store.connection.prepare("WITH ranked AS (SELECT *,row_number() OVER(PARTITION BY scope,resource ORDER BY sampled_at DESC,id DESC) AS rank FROM samples WHERE sampled_at>=?1 AND sampled_at<=?2 AND (?3 IS NULL OR scope=?3) AND (?4 IS NULL OR resource=?4)) SELECT id,scope,resource,sampled_at,payload FROM ranked WHERE rank=1 ORDER BY scope,resource LIMIT ?5 OFFSET ?6")?;
    let rows = stmt.query_map(
        params![
            iso(now - chrono::Duration::seconds(RETENTION_SECONDS)),
            iso(now),
            query.scope,
            query.id,
            query.limit + 1,
            query.offset
        ],
        row,
    )?;
    let mut samples = rows.collect::<std::result::Result<Vec<_>, _>>()?;
    let has_more = samples.len() > query.limit as usize;
    samples.truncate(query.limit as usize);
    for sample in &mut samples {
        let age = (now - timestamp(sample["sampled_at"].as_str().unwrap_or_default())?)
            .num_milliseconds()
            .max(0) as f64
            / 1000.;
        let values: Value = serde_json::from_str(sample["payload"].as_str().unwrap_or("{}"))?;
        sample.as_object_mut().expect("objeto").remove("payload");
        sample["age_seconds"] = json!(age);
        sample["fresh"] = json!(age <= query.max_age as f64);
        sample["available"] = json!(
            values["available"] == true && (sample["scope"] != "container" || docker_available)
        );
        sample["values"] = values;
    }
    Ok(
        json!({"collected":!samples.is_empty(),"samples":samples,"health":health,"collector_stopped":collector_stopped,"has_more":has_more,"next_offset":if has_more {Some(query.offset+query.limit)}else{None},"retention_days":7,"queried_at":iso(now)}),
    )
}

fn row(r: &rusqlite::Row<'_>) -> rusqlite::Result<Value> {
    Ok(
        json!({"id":r.get::<_,i64>(0)?,"scope":r.get::<_,String>(1)?,"resource":r.get::<_,String>(2)?,"sampled_at":r.get::<_,String>(3)?,"payload":r.get::<_,String>(4)?}),
    )
}

/// Paginação estável por id: capture snapshot_id e reutilize até terminar a consulta.
pub fn history(
    directory: &Path,
    query: &Query,
    from: Option<&str>,
    to: Option<&str>,
    after: u64,
    snapshot: Option<u64>,
) -> Result<Value> {
    // A validade da entrada não depende da existência ou do conteúdo do banco.
    let after = i64::try_from(after).map_err(|_| AppError::invalid("Cursor fora do intervalo"))?;
    let snapshot = snapshot
        .map(i64::try_from)
        .transpose()
        .map_err(|_| AppError::invalid("Snapshot fora do intervalo"))?;
    if after > 0 && query.offset > 0 {
        return Err(AppError::invalid(
            "Não combine cursor after com offset positivo",
        ));
    }
    let now = Utc::now();
    let retention = now - chrono::Duration::seconds(RETENTION_SECONDS);
    let requested_from = from
        .map(timestamp)
        .transpose()?
        .unwrap_or(now - chrono::Duration::hours(1));
    let start = requested_from.max(retention);
    let end = to.map(timestamp).transpose()?.unwrap_or(now).min(now);
    if start > end {
        return Err(AppError::invalid(
            "Início do histórico posterior ao fim ou à retenção",
        ));
    }
    let Some(store) = Store::read(directory, Database::Metrics)? else {
        return Ok(
            json!({"samples":[],"has_more":false,"next_after":null,"snapshot_id":0,"from":iso(start),"to":iso(end),"retention_clamped":requested_from<retention,"retention_days":7,"order":"insertion_id","gaps":"Não são preenchidas; consulte gap_seconds e session_id nas amostras"}),
        );
    };
    let maximum: i64 =
        store
            .connection
            .query_row("SELECT coalesce(max(id),0) FROM samples", [], |r| r.get(0))?;
    let snapshot = snapshot.unwrap_or(maximum).min(maximum);
    let mut stmt=store.connection.prepare("SELECT id,scope,resource,sampled_at,payload FROM samples WHERE sampled_at>=?1 AND sampled_at<=?2 AND (?3 IS NULL OR scope=?3) AND (?4 IS NULL OR resource=?4) AND id>?5 AND id<=?6 ORDER BY id LIMIT ?7 OFFSET ?8")?;
    let rows = stmt.query_map(
        params![
            iso(start),
            iso(end),
            query.scope,
            query.id,
            after,
            snapshot,
            query.limit + 1,
            query.offset
        ],
        row,
    )?;
    let mut samples = rows.collect::<std::result::Result<Vec<_>, _>>()?;
    let has_more = samples.len() > query.limit as usize;
    samples.truncate(query.limit as usize);
    for sample in &mut samples {
        sample["values"] = serde_json::from_str(sample["payload"].as_str().unwrap_or("{}"))?;
        sample.as_object_mut().expect("objeto").remove("payload");
    }
    let next = if has_more {
        samples.last().and_then(|s| s["id"].as_u64())
    } else {
        None
    };
    Ok(
        json!({"samples":samples,"has_more":has_more,"next_after":next,"snapshot_id":snapshot,"from":iso(start),"to":iso(end),"retention_clamped":requested_from<retention,"retention_days":7,"order":"insertion_id","gaps":"Não são preenchidas; consulte gap_seconds e session_id nas amostras"}),
    )
}

pub fn set_health(store: &Store, source: &str, error: Option<&str>) -> Result<()> {
    store.connection.execute("INSERT INTO collector_health(source,last_success_at,error_code) VALUES(?1,?2,?3) ON CONFLICT(source) DO UPDATE SET last_success_at=coalesce(excluded.last_success_at,collector_health.last_success_at),error_code=excluded.error_code",params![source,if error.is_none(){Some(state::now())}else{None},error])?;
    Ok(())
}

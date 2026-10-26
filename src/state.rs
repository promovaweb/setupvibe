//! Persistência local: migrações atômicas, escrita curta e observações sem adoção.
use crate::{
    error::{AppError, Result},
    planner::Plan,
};
use chrono::{DateTime, Utc};
use rusqlite::{Connection, OpenFlags, OptionalExtension, params};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::os::unix::fs::{DirBuilderExt, MetadataExt, OpenOptionsExt};
use std::{
    fs::{self, File, OpenOptions},
    path::{Path, PathBuf},
    time::Duration,
};

pub const RETENTION_SECONDS: i64 = 7 * 24 * 60 * 60;
const SCHEMA_VERSION: i64 = 1;

pub fn now() -> String {
    Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

pub fn data_dir(explicit: Option<&Path>) -> Result<PathBuf> {
    if let Some(path) = explicit {
        if !path.is_absolute() {
            return Err(AppError::invalid("O diretório de estado deve ser absoluto"));
        }
        return Ok(path.to_owned());
    }
    if let Some(path) = std::env::var_os("SETUPVIBE_DATA_DIR") {
        return data_dir(Some(Path::new(&path)));
    }
    let home = std::env::var_os("HOME")
        .ok_or_else(|| AppError::precondition("HOME ausente; informe --data-dir"))?;
    let base = if cfg!(target_os = "macos") {
        PathBuf::from(home).join("Library/Application Support")
    } else {
        std::env::var_os("XDG_DATA_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from(home).join(".local/share"))
    };
    data_dir(Some(&base.join("setupvibe")))
}

/// Protege estado contra troca de identidade e symlink no diretório final.
pub fn private_dir(path: &Path) -> Result<()> {
    fs::DirBuilder::new()
        .recursive(true)
        .mode(0o700)
        .create(path)?;
    let metadata = fs::symlink_metadata(path)?;
    // geteuid não recebe ponteiros e não modifica estado do processo.
    let uid = unsafe { libc::geteuid() };
    if !metadata.is_dir() || metadata.uid() != uid || metadata.mode() & 0o077 != 0 {
        return Err(AppError::precondition(
            "Diretório de estado deve pertencer ao usuário atual, sem symlink, com permissão 0700",
        ));
    }
    Ok(())
}

pub struct StateLock {
    _file: File,
}

/// Exclusividade de mutações externas entre diretórios e identidades no mesmo host.
/// O arquivo não contém dados e nunca é removido enquanto houver possíveis leitores.
pub struct HostLock {
    _file: File,
}
impl HostLock {
    pub fn acquire() -> Result<Self> {
        let path = Path::new("/tmp/setupvibe-host-mutation.lock");
        let file = match OpenOptions::new()
            .read(true)
            .write(true)
            .create_new(true)
            .mode(0o644)
            .custom_flags(libc::O_NOFOLLOW)
            .open(path)
        {
            Ok(file) => file,
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => OpenOptions::new()
                .read(true)
                .custom_flags(libc::O_NOFOLLOW)
                .open(path)?,
            Err(error) => return Err(error.into()),
        };
        if !file.metadata()?.is_file() {
            return Err(AppError::precondition(
                "Arquivo de exclusividade do host inválido",
            ));
        }
        file.try_lock()
            .map_err(|_| AppError::new(6, "Outra mutação do SetupVibe está ativa neste host"))?;
        Ok(Self { _file: file })
    }
}
impl StateLock {
    /// Lock de kernel liberado mesmo após término abrupto; nunca remove o inode.
    pub fn acquire(directory: &Path, name: &str) -> Result<Self> {
        private_dir(directory)?;
        if !["operations", "collector", "schema"].contains(&name) {
            return Err(AppError::invalid("Escopo de exclusão inválido"));
        }
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .mode(0o600)
            .custom_flags(libc::O_NOFOLLOW)
            .open(directory.join(format!("{name}.lock")))?;
        file.try_lock().map_err(|_| {
            AppError::new(6, format!("Outra operação mantém exclusividade: {name}"))
        })?;
        Ok(Self { _file: file })
    }
}

#[derive(Clone, Copy)]
pub enum Database {
    State,
    Metrics,
}
impl Database {
    pub fn filename(self) -> &'static str {
        match self {
            Self::State => "setupvibe.db",
            Self::Metrics => "metrics.db",
        }
    }
}

pub struct Store {
    pub connection: Connection,
}
impl Store {
    /// Consulta não cria diretório, banco nem migração.
    pub fn read(directory: &Path, database: Database) -> Result<Option<Self>> {
        let path = directory.join(database.filename());
        if !path.exists() {
            return Ok(None);
        }
        reject_symlink(&path)?;
        let connection = Connection::open_with_flags(
            path,
            OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
        )?;
        connection.busy_timeout(Duration::from_secs(5))?;
        let version: i64 = connection.pragma_query_value(None, "user_version", |r| r.get(0))?;
        if version != SCHEMA_VERSION {
            return Err(AppError::precondition(format!(
                "Schema {version} incompatível; esperado {SCHEMA_VERSION}"
            )));
        }
        Ok(Some(Self { connection }))
    }

    pub fn write(directory: &Path, database: Database) -> Result<Self> {
        private_dir(directory)?;
        let _schema = StateLock::acquire(directory, "schema")?;
        let path = directory.join(database.filename());
        reject_symlink(&path)?;
        // Reserva o arquivo com modo privado antes de delegar a abertura ao SQLite.
        OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(false)
            .mode(0o600)
            .custom_flags(libc::O_NOFOLLOW)
            .open(&path)?;
        let mut connection = Connection::open(&path)?;
        connection.busy_timeout(Duration::from_secs(5))?;
        if rusqlite::version_number() < 3_051_003 {
            return Err(AppError::precondition(
                "SQLite embarcado sem correção WAL exigida",
            ));
        }
        let version: i64 = connection.pragma_query_value(None, "user_version", |r| r.get(0))?;
        if version > SCHEMA_VERSION {
            return Err(AppError::precondition(
                "Banco mais novo que o executável; escrita recusada",
            ));
        }
        if version == 0 {
            let tables: i64 = connection.query_row(
                "SELECT count(*) FROM sqlite_master WHERE type='table'",
                [],
                |r| r.get(0),
            )?;
            if tables > 0 {
                return Err(AppError::precondition(
                    "Banco sem versão contém tabelas desconhecidas",
                ));
            }
            let tx =
                connection.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
            tx.execute_batch(match database {
                Database::State => STATE_SCHEMA,
                Database::Metrics => METRICS_SCHEMA,
            })?;
            tx.execute(
                "INSERT INTO schema_migrations(version,applied_at) VALUES(1,?1)",
                [now()],
            )?;
            tx.pragma_update(None, "user_version", SCHEMA_VERSION)?;
            tx.commit()?;
        }
        connection.pragma_update(None, "journal_mode", "WAL")?;
        connection.pragma_update(None, "foreign_keys", true)?;
        connection.pragma_update(
            None,
            "synchronous",
            match database {
                Database::State => "FULL",
                Database::Metrics => "NORMAL",
            },
        )?;
        Ok(Self { connection })
    }

    pub fn diagnostics(&self) -> Result<Value> {
        let query = |key: &str| {
            self.connection
                .pragma_query_value(None, key, |r| r.get::<_, i64>(0))
        };
        let mode: String = self
            .connection
            .pragma_query_value(None, "journal_mode", |r| r.get(0))?;
        Ok(
            json!({"schema_version":query("user_version")?,"sqlite_version":rusqlite::version(),"journal_mode":mode}),
        )
    }

    pub fn begin_operation(&mut self, plan: &Plan) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let tx = self.connection.transaction()?;
        tx.execute("INSERT INTO operations(id,catalog_version,status,started_at,plan) VALUES(?1,?2,'running',?3,?4)", params![id,plan.catalog_version,now(),serde_json::to_string(plan)?])?;
        for (sequence, step) in plan.steps.iter().enumerate() {
            tx.execute("INSERT INTO operation_steps(operation_id,sequence,component,status) VALUES(?1,?2,?3,'planned')", params![id,sequence as i64,step.component])?;
        }
        tx.commit()?;
        Ok(id)
    }

    /// Registra controles sem incluir entrada secreta ou respostas brutas do Docker.
    pub fn begin_control(&mut self, action: &str, target: &str) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let tx = self.connection.transaction()?;
        tx.execute("INSERT INTO operations(id,catalog_version,status,started_at,plan) VALUES(?1,?2,'running',?3,?4)",params![id,crate::VERSION,now(),json!({"schema_version":1,"action":action,"target":target}).to_string()])?;
        tx.execute("INSERT INTO operation_steps(operation_id,sequence,component,status) VALUES(?1,0,?2,'running')",params![id,target])?;
        tx.commit()?;
        Ok(id)
    }

    pub fn step(&self, operation: &str, component: &str, status: &str, code: u8) -> Result<()> {
        if ![
            "running",
            "succeeded",
            "failed",
            "skipped",
            "cancelled",
            "unknown",
        ]
        .contains(&status)
        {
            return Err(AppError::invalid("Estado de etapa inválido"));
        }
        self.connection.execute("UPDATE operation_steps SET status=?3,result_code=?4 WHERE operation_id=?1 AND component=?2", params![operation,component,status,code])?;
        Ok(())
    }

    pub fn finish_operation(&self, id: &str, status: &str, code: u8) -> Result<()> {
        if !["succeeded", "failed", "partial", "cancelled", "unknown"].contains(&status) {
            return Err(AppError::invalid("Estado de operação inválido"));
        }
        self.connection.execute(
            "UPDATE operations SET status=?2,result_code=?3,finished_at=?4 WHERE id=?1",
            params![id, status, code, now()],
        )?;
        Ok(())
    }

    pub fn observe(&self, observation: &Observation) -> Result<()> {
        self.connection.execute("INSERT INTO installations(component,owner,path,version,present,managed,observed_at) VALUES(?1,?2,?3,?4,?5,?6,?7) ON CONFLICT(component) DO UPDATE SET owner=excluded.owner,path=excluded.path,version=excluded.version,present=excluded.present,managed=excluded.managed,observed_at=excluded.observed_at", params![observation.component,observation.owner,observation.path,observation.version,observation.present,observation.managed,observation.observed_at])?;
        Ok(())
    }

    pub fn observations(&self) -> Result<Vec<Observation>> {
        let mut statement = self.connection.prepare("SELECT component,owner,path,version,present,managed,observed_at FROM installations ORDER BY component")?;
        let rows = statement.query_map([], |r| {
            Ok(Observation {
                component: r.get(0)?,
                owner: r.get(1)?,
                path: r.get(2)?,
                version: r.get(3)?,
                present: r.get(4)?,
                managed: r.get(5)?,
                observed_at: r.get(6)?,
            })
        })?;
        Ok(rows.collect::<std::result::Result<Vec<_>, _>>()?)
    }

    pub fn operations(&self, id: Option<&str>, limit: u32, offset: u32) -> Result<Vec<Value>> {
        let mut statement = self.connection.prepare("SELECT id,catalog_version,status,started_at,finished_at,result_code FROM operations WHERE (?1 IS NULL OR id=?1) ORDER BY started_at DESC,id LIMIT ?2 OFFSET ?3")?;
        let rows = statement.query_map(params![id,limit.min(1000),offset], |r| Ok(json!({"id":r.get::<_,String>(0)?,"catalog_version":r.get::<_,String>(1)?,"status":r.get::<_,String>(2)?,"started_at":r.get::<_,String>(3)?,"finished_at":r.get::<_,Option<String>>(4)?,"result_code":r.get::<_,Option<u8>>(5)?})))?;
        let mut result = rows.collect::<std::result::Result<Vec<_>, _>>()?;
        if id.is_some() {
            for operation in &mut result {
                let mut steps = self.connection.prepare("SELECT component,status,result_code FROM operation_steps WHERE operation_id=?1 ORDER BY sequence")?;
                let rows = steps.query_map([id], |r| Ok(json!({"component":r.get::<_,String>(0)?,"status":r.get::<_,String>(1)?,"result_code":r.get::<_,Option<u8>>(2)?})))?;
                operation["steps"] = json!(rows.collect::<std::result::Result<Vec<_>, _>>()?);
            }
        }
        Ok(result)
    }

    /// Só chamar sob o lock de operações. Nunca presume sucesso de instalador externo.
    pub fn reconcile_interrupted(&mut self) -> Result<usize> {
        let tx = self.connection.transaction()?;
        tx.execute("UPDATE operation_steps SET status='unknown' WHERE operation_id IN (SELECT id FROM operations WHERE status='running') AND status IN ('planned','running')", [])?;
        let changed = tx.execute(
            "UPDATE operations SET status='unknown',finished_at=?1 WHERE status='running'",
            [now()],
        )?;
        tx.commit()?;
        Ok(changed)
    }

    pub fn add_sample(
        &self,
        scope: &str,
        resource: &str,
        sampled_at: &str,
        payload: &Value,
    ) -> Result<()> {
        let sampled_at = DateTime::parse_from_rfc3339(sampled_at)
            .map_err(|_| AppError::invalid("Timestamp de amostra inválido"))?
            .with_timezone(&Utc)
            .to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        self.connection.execute(
            "INSERT INTO samples(scope,resource,sampled_at,payload) VALUES(?1,?2,?3,?4)",
            params![scope, resource, sampled_at, serde_json::to_string(payload)?],
        )?;
        Ok(())
    }

    pub fn purge_metrics(&self) -> Result<usize> {
        let cutoff = (Utc::now() - chrono::Duration::seconds(RETENTION_SECONDS))
            .to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        Ok(self.connection.execute("DELETE FROM samples WHERE id IN (SELECT id FROM samples WHERE sampled_at < ?1 ORDER BY sampled_at LIMIT 1000)", [cutoff])?)
    }

    pub fn latest_sample(&self, scope: &str, resource: &str) -> Result<Option<Value>> {
        let cutoff = (Utc::now() - chrono::Duration::seconds(RETENTION_SECONDS))
            .to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        let row: Option<(String,String)> = self.connection.query_row("SELECT sampled_at,payload FROM samples WHERE scope=?1 AND resource=?2 AND sampled_at>=?3 AND sampled_at<=?4 ORDER BY sampled_at DESC,id DESC LIMIT 1", params![scope,resource,cutoff,now()], |r| Ok((r.get(0)?,r.get(1)?))).optional()?;
        row.map(|(at, payload)| {
            Ok(json!({"sampled_at":at,"values":serde_json::from_str::<Value>(&payload)?}))
        })
        .transpose()
    }
}

fn reject_symlink(path: &Path) -> Result<()> {
    if let Ok(metadata) = fs::symlink_metadata(path)
        && (metadata.file_type().is_symlink() || !metadata.is_file())
    {
        return Err(AppError::precondition("Arquivo SQLite inválido ou symlink"));
    }
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Observation {
    pub component: String,
    pub owner: Option<String>,
    pub path: Option<String>,
    pub version: Option<String>,
    pub present: bool,
    pub managed: bool,
    pub observed_at: String,
}

const STATE_SCHEMA: &str = "
CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL);
CREATE TABLE config(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE installations(component TEXT PRIMARY KEY,owner TEXT,path TEXT,version TEXT,present INTEGER NOT NULL,managed INTEGER NOT NULL,observed_at TEXT NOT NULL);
CREATE TABLE operations(id TEXT PRIMARY KEY,catalog_version TEXT NOT NULL,status TEXT NOT NULL,started_at TEXT NOT NULL,finished_at TEXT,result_code INTEGER,plan TEXT NOT NULL);
CREATE TABLE operation_steps(operation_id TEXT NOT NULL REFERENCES operations(id),sequence INTEGER NOT NULL,component TEXT NOT NULL,status TEXT NOT NULL,result_code INTEGER,PRIMARY KEY(operation_id,component));
CREATE TABLE managed_resources(id TEXT PRIMARY KEY,kind TEXT NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL);
CREATE INDEX operations_started ON operations(started_at);
";
const METRICS_SCHEMA: &str = "
CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL);
CREATE TABLE collection_sessions(id TEXT PRIMARY KEY,started_at TEXT NOT NULL,interval_seconds INTEGER NOT NULL);
CREATE TABLE samples(id INTEGER PRIMARY KEY,scope TEXT NOT NULL,resource TEXT NOT NULL,sampled_at TEXT NOT NULL,payload TEXT NOT NULL);
CREATE INDEX samples_time ON samples(sampled_at);
CREATE INDEX samples_resource_time ON samples(scope,resource,sampled_at);
CREATE TABLE collector_health(source TEXT PRIMARY KEY,last_success_at TEXT,error_code TEXT);
";

//! Erros de domínio com códigos estáveis para automação.
use serde::Serialize;

#[derive(Debug, thiserror::Error, Serialize)]
#[error("{message}")]
pub struct AppError {
    pub code: u8,
    pub message: String,
}

impl AppError {
    pub fn new(code: u8, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
    pub fn invalid(message: impl Into<String>) -> Self {
        Self::new(2, message)
    }
    pub fn unsupported(message: impl Into<String>) -> Self {
        Self::new(3, message)
    }
    pub fn precondition(message: impl Into<String>) -> Self {
        Self::new(4, message)
    }
}

impl From<std::io::Error> for AppError {
    fn from(error: std::io::Error) -> Self {
        Self::new(1, error.to_string())
    }
}
impl From<serde_json::Error> for AppError {
    fn from(error: serde_json::Error) -> Self {
        Self::invalid(format!("JSON inválido: {error}"))
    }
}
pub type Result<T> = std::result::Result<T, AppError>;

impl From<rusqlite::Error> for AppError {
    fn from(error: rusqlite::Error) -> Self {
        let code = match &error {
            rusqlite::Error::SqliteFailure(e, _)
                if matches!(
                    e.code,
                    rusqlite::ErrorCode::DatabaseBusy | rusqlite::ErrorCode::DatabaseLocked
                ) =>
            {
                6
            }
            _ => 1,
        };
        Self::new(code, format!("SQLite: {error}"))
    }
}

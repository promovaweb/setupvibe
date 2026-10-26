//! Protocolos de apresentação: stdout estruturado e diagnóstico humano em stderr.
use crate::{error::Result, process::sanitize, state::now};
use clap::ValueEnum;
use serde_json::{Value, json};
use std::io::{self, Write};

#[derive(Debug, Clone, Copy, PartialEq, Eq, ValueEnum)]
pub enum Output {
    Text,
    Json,
    Ndjson,
}

impl Output {
    pub fn event(self, kind: &str, data: Value) -> Result<()> {
        if self == Self::Ndjson {
            write_line(&json!({"schema_version":1,"event":kind,"timestamp":now(),"data":data}))?;
        }
        Ok(())
    }

    pub fn finish(self, result: Result<Value>) -> u8 {
        let (data, code) = match result {
            Ok(data) => {
                let code = data.get("exit_code").and_then(Value::as_u64).unwrap_or(0) as u8;
                (
                    json!({"schema_version":1,"success":code==0,"data":data}),
                    code,
                )
            }
            Err(mut error) => {
                error.message = sanitize(&error.message);
                let code = error.code;
                (
                    json!({"schema_version":1,"success":false,"error":error}),
                    code,
                )
            }
        };
        let written = match self {
            Self::Json => write_line(&data),
            Self::Ndjson => {
                let mut event = data.clone();
                event["event"] = json!("result");
                event["timestamp"] = json!(now());
                write_line(&event)
            }
            Self::Text => {
                if code != 0 {
                    let message = data
                        .pointer("/error/message")
                        .and_then(Value::as_str)
                        .unwrap_or("Operação concluída com falhas; consulte o resultado");
                    let _ = writeln!(io::stderr(), "Erro ({code}): {message}");
                }
                let shown = data.get("data").unwrap_or(&data);
                writeln!(
                    io::stdout(),
                    "{}",
                    serde_json::to_string_pretty(shown).unwrap_or_default()
                )
            }
        };
        if let Err(error) = written {
            if error.kind() != io::ErrorKind::BrokenPipe {
                let _ = writeln!(io::stderr(), "Falha ao escrever saída: {error}");
            }
            return 1;
        }
        code
    }
}

fn write_line(value: &Value) -> io::Result<()> {
    let mut out = io::stdout().lock();
    serde_json::to_writer(&mut out, value)?;
    writeln!(out)?;
    out.flush()
}

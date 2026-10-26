//! Transporte interno do CLI: eventos públicos, cancelamento por sinal e saída finita.
use crate::{
    domain::Edition,
    error::{AppError, Result},
};
use serde_json::Value;
use std::{
    io::{BufRead, BufReader},
    os::unix::process::CommandExt,
    path::Path,
    process::{Command, Stdio},
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
        mpsc::{self, Receiver},
    },
    thread,
};

pub enum Message {
    Event(Value),
    Done(i32),
    Error(String),
}
pub struct Job {
    pub receiver: Receiver<Message>,
    pid: u32,
    alive: Arc<AtomicBool>,
}
impl Job {
    pub fn start(
        directory: &Path,
        edition: Edition,
        args: &[String],
        timeout: u64,
    ) -> Result<Self> {
        let mut child = Command::new(std::env::current_exe()?)
            .args([
                "--output",
                "ndjson",
                "--non-interactive",
                "--edition",
                if edition == Edition::Server {
                    "server"
                } else {
                    "desktop"
                },
                "--data-dir",
            ])
            .arg(directory)
            .args(["--timeout", &timeout.to_string()])
            .args(args)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .process_group(0)
            .spawn()?;
        let pid = child.id();
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| AppError::new(1, "CLI sem canal de eventos"))?;
        let (sender, receiver) = mpsc::sync_channel(64);
        let alive = Arc::new(AtomicBool::new(true));
        let running = alive.clone();
        thread::spawn(move || {
            let mut reader = BufReader::new(stdout);
            let mut protocol_failed = false;
            loop {
                let mut bytes = Vec::new();
                let read = std::io::Read::take(&mut reader, 2 * 1024 * 1024 + 1)
                    .read_until(b'\n', &mut bytes);
                match read {
                    Ok(0) => break,
                    Ok(_) if bytes.len() <= 2 * 1024 * 1024 => {
                        match serde_json::from_slice::<Value>(&bytes) {
                            Ok(value) => {
                                if sender.send(Message::Event(value)).is_err() {
                                    protocol_failed = true;
                                    break;
                                }
                            }
                            Err(_) => {
                                protocol_failed = true;
                                let _ = sender.send(Message::Error(
                                    "Resposta do CLI fora do contrato JSON".into(),
                                ));
                                break;
                            }
                        }
                    }
                    _ => {
                        protocol_failed = true;
                        let _ = sender.send(Message::Error(
                            "Resposta do CLI excedeu o limite ou falhou".into(),
                        ));
                        break;
                    }
                }
            }
            // Fecha o pipe antes de aguardar, inclusive se o protocolo for inválido.
            drop(reader);
            if protocol_failed {
                // Não deixa uma operação continuar após perder o canal de acompanhamento.
                unsafe {
                    libc::kill(child.id() as i32, libc::SIGINT);
                }
            }
            let code = child.wait().ok().and_then(|s| s.code()).unwrap_or(1);
            running.store(false, Ordering::SeqCst);
            let _ = sender.send(Message::Done(code));
        });
        Ok(Self {
            receiver,
            pid,
            alive,
        })
    }
    pub fn cancel(&self) {
        // O CLI encerra seus subprocessos e registra cancelamento antes de sair.
        if self.alive.load(Ordering::SeqCst) {
            unsafe {
                libc::kill(self.pid as i32, libc::SIGINT);
            }
        }
    }
}
impl Drop for Job {
    fn drop(&mut self) {
        self.cancel();
    }
}

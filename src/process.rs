//! Subprocessos finitos, sem shell implícito e com saída higienizada.
use crate::error::{AppError, Result};
use regex::Regex;
use serde::Serialize;
use std::os::unix::process::CommandExt;
use std::{
    io::{Read, Write},
    process::{Command, Stdio},
    sync::{
        Arc, OnceLock,
        atomic::{AtomicBool, Ordering},
    },
    thread,
    time::{Duration, Instant},
};

pub static CANCELLED: AtomicBool = AtomicBool::new(false);
const MAX_OUTPUT: usize = 2 * 1024 * 1024;

/// Resolve somente arquivos executáveis; entradas vazias do PATH não incluem cwd.
pub fn find_executable(name: &str) -> Option<std::path::PathBuf> {
    use std::os::unix::fs::PermissionsExt;
    std::env::split_paths(&std::env::var_os("PATH")?)
        .filter(|p| !p.as_os_str().is_empty())
        .map(|p| p.join(name))
        .find(|p| {
            p.metadata()
                .is_ok_and(|m| m.is_file() && m.permissions().mode() & 0o111 != 0)
        })
}

pub fn install_signal_handler() -> Result<()> {
    ctrlc::set_handler(|| CANCELLED.store(true, Ordering::SeqCst))
        .map_err(|e| AppError::new(1, format!("Não foi possível configurar cancelamento: {e}")))
}

/// Remove sequências de terminal e formatos usuais de credenciais antes de exibir.
pub fn sanitize(text: &str) -> String {
    static ANSI: OnceLock<Regex> = OnceLock::new();
    static SECRET: OnceLock<Regex> = OnceLock::new();
    let ansi = ANSI.get_or_init(|| {
        Regex::new(r"\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\)|[@-_])")
            .expect("regex estática")
    });
    let secret = SECRET.get_or_init(|| Regex::new(r#"(?i)(?:bearer\s+\S+|(?:password|passwd|token|secret|api[_-]?key|authorization)["']?\s*[:=]\s*["']?[^\s"',;]+|(?:sk-|ghp_|github_pat_|tskey-)[a-z0-9_-]+)"#).expect("regex estática"));
    let clean = ansi.replace_all(text, "");
    secret
        .replace_all(&clean, "[SEGREDO REMOVIDO]")
        .chars()
        .filter(|c| !c.is_control() || *c == '\n' || *c == '\t')
        .collect()
}

#[derive(Debug, Clone, Serialize)]
pub struct ProcessOutput {
    pub code: i32,
    pub stdout: String,
    pub stderr: String,
    pub truncated: bool,
}

#[derive(Clone)]
pub struct Runner {
    pub timeout: Duration,
}
impl Runner {
    /// Acompanha linhas sem acumular logs; prazo e cancelamento encerram o grupo.
    pub fn follow(
        &self,
        executable: &str,
        args: &[String],
        mut emit: impl FnMut(&str, &str) -> Result<()>,
    ) -> Result<()> {
        use std::os::fd::AsRawFd;
        let mut child = Command::new(executable)
            .args(args)
            .env("LC_ALL", "C")
            .env("NO_COLOR", "1")
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .process_group(0)
            .spawn()?;
        let mut stdout = child.stdout.take().expect("stdout configurado");
        let mut stderr = child.stderr.take().expect("stderr configurado");
        for fd in [stdout.as_raw_fd(), stderr.as_raw_fd()] {
            // Descritores pertencem apenas ao processo filho criado acima.
            let flags = unsafe { libc::fcntl(fd, libc::F_GETFL) };
            if flags < 0 || unsafe { libc::fcntl(fd, libc::F_SETFL, flags | libc::O_NONBLOCK) } < 0
            {
                let _ = child.kill();
                let _ = child.wait();
                return Err(std::io::Error::last_os_error().into());
            }
        }
        let started = Instant::now();
        let mut out = Vec::new();
        let mut err = Vec::new();
        let mut out_done = false;
        let mut err_done = false;
        let mut finished = None;
        let result = (|| -> Result<()> {
            loop {
                for (name, reader, pending) in [
                    ("stdout", &mut stdout as &mut dyn Read, &mut out),
                    ("stderr", &mut stderr as &mut dyn Read, &mut err),
                ] {
                    let mut buffer = [0u8; 8192];
                    // Uma leitura por fluxo preserva a consulta de cancelamento mesmo sob carga.
                    match reader.read(&mut buffer) {
                        Ok(n) => {
                            pending.extend_from_slice(&buffer[..n]);
                            if n == 0 {
                                if name == "stdout" {
                                    out_done = true;
                                } else {
                                    err_done = true;
                                }
                            }
                        }
                        Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {}
                        Err(e) => return Err(e.into()),
                    }
                    while let Some(end) = pending.iter().position(|b| *b == b'\n') {
                        let line = pending.drain(..=end).collect::<Vec<_>>();
                        emit(name, &sanitize(&String::from_utf8_lossy(&line)))?;
                    }
                    if pending.len() >= 65536 {
                        emit(name, "[linha excedeu 64 KiB; conteúdo omitido]")?;
                        pending.clear();
                    }
                }
                if CANCELLED.load(Ordering::SeqCst) {
                    return Err(AppError::new(130, "Acompanhamento cancelado"));
                }
                if started.elapsed() >= self.timeout {
                    return Err(AppError::new(6, "Tempo limite do acompanhamento"));
                }
                if finished.is_none() {
                    finished = child.try_wait()?;
                }
                if let Some(status) = finished
                    && out_done
                    && err_done
                {
                    if !out.is_empty() {
                        emit("stdout", &sanitize(&String::from_utf8_lossy(&out)))?;
                    }
                    if !err.is_empty() {
                        emit("stderr", &sanitize(&String::from_utf8_lossy(&err)))?;
                    }
                    return if status.success() {
                        Ok(())
                    } else {
                        Err(AppError::new(1, "Acompanhamento terminou com falha"))
                    };
                }
                thread::sleep(Duration::from_millis(20));
            }
        })();
        unsafe {
            libc::kill(-(child.id() as i32), libc::SIGKILL);
        }
        let _ = child.wait();
        result
    }

    /// Mantém stdout/stderr separados. Entrada secreta nunca integra argv ou histórico.
    pub fn run(
        &self,
        executable: &str,
        args: &[String],
        input: Option<&[u8]>,
    ) -> Result<ProcessOutput> {
        self.run_inner(executable, args, input, true)
    }

    /// Consome JSON em memória. O chamador projeta campos públicos antes de exibir.
    pub fn json(
        &self,
        executable: &str,
        args: &[String],
        input: Option<&[u8]>,
    ) -> Result<serde_json::Value> {
        let output = self.run_inner(executable, args, input, false)?;
        if output.code != 0 {
            return Err(AppError::new(
                1,
                format!("{executable}: {}", sanitize(&output.stderr)),
            ));
        }
        if output.truncated {
            return Err(AppError::precondition(
                "Resposta JSON excede limite de captura",
            ));
        }
        if output.stdout.trim().is_empty() {
            return Ok(serde_json::Value::Null);
        }
        serde_json::from_str(&output.stdout)
            .map_err(|_| AppError::precondition("Resposta JSON inválida"))
    }

    fn run_inner(
        &self,
        executable: &str,
        args: &[String],
        input: Option<&[u8]>,
        redact: bool,
    ) -> Result<ProcessOutput> {
        if CANCELLED.load(Ordering::SeqCst) {
            return Err(AppError::new(130, "Operação cancelada"));
        }
        let mut command = Command::new(executable);
        if let Some(home) = std::env::var_os("HOME") {
            command.current_dir(home);
        }
        command.env("LC_ALL", "C");
        command
            .env("NO_COLOR", "1")
            .env("MISE_YES", "1")
            .env("HOMEBREW_NO_AUTO_UPDATE", "1");
        command
            .args(args)
            .stdin(if input.is_some() {
                Stdio::piped()
            } else {
                Stdio::null()
            })
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .process_group(0);
        let mut child = command.spawn().map_err(|e| {
            AppError::precondition(format!("Não foi possível executar {executable}: {e}"))
        })?;
        let pid = child.id();
        let stdout = child.stdout.take().expect("stdout configurado");
        let stderr = child.stderr.take().expect("stderr configurado");
        let finished = Arc::new(AtomicBool::new(false));
        let out_finished = finished.clone();
        let err_finished = finished.clone();
        let out_thread = thread::spawn(move || bounded_read(stdout, &out_finished));
        let err_thread = thread::spawn(move || bounded_read(stderr, &err_finished));
        let input_thread = if let Some(input) = input {
            let mut stdin = child.stdin.take().expect("stdin configurado");
            let bytes = input.to_vec();
            let input_finished = finished.clone();
            Some(thread::spawn(move || -> std::io::Result<()> {
                nonblocking(&stdin)?;
                let mut remaining = bytes.as_slice();
                while !remaining.is_empty() && !input_finished.load(Ordering::SeqCst) {
                    match stdin.write(remaining) {
                        Ok(0) => break,
                        Ok(n) => remaining = &remaining[n..],
                        Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                            thread::sleep(Duration::from_millis(10))
                        }
                        Err(e) if e.kind() == std::io::ErrorKind::Interrupted => continue,
                        Err(e) => return Err(e),
                    }
                }
                Ok(())
            }))
        } else {
            None
        };
        let start = Instant::now();
        let result = loop {
            if CANCELLED.load(Ordering::SeqCst) {
                break Err(AppError::new(130, "Operação cancelada"));
            }
            if start.elapsed() >= self.timeout {
                break Err(AppError::new(
                    6,
                    format!("Tempo limite ao executar {executable}"),
                ));
            }
            match child.try_wait() {
                Ok(Some(status)) => break Ok(status.code().unwrap_or(1)),
                Ok(None) => thread::sleep(Duration::from_millis(20)),
                Err(e) => break Err(AppError::from(e)),
            }
        };
        // PID negativo identifica apenas o grupo criado acima, nunca processos do usuário.
        unsafe {
            libc::kill(-(pid as i32), libc::SIGKILL);
        }
        let _ = child.wait();
        finished.store(true, Ordering::SeqCst);
        if let Some(handle) = input_thread {
            let _ = handle.join();
        }
        let (stdout, out_truncated) = out_thread
            .join()
            .map_err(|_| AppError::new(1, "Falha ao capturar stdout"))??;
        let (stderr, err_truncated) = err_thread
            .join()
            .map_err(|_| AppError::new(1, "Falha ao capturar stderr"))??;
        let code = result?;
        let mut stdout = String::from_utf8_lossy(&stdout).into_owned();
        let mut stderr = String::from_utf8_lossy(&stderr).into_owned();
        if redact {
            stdout = sanitize(&stdout);
            stderr = sanitize(&stderr);
        }
        if redact && let Some(secret) = input.and_then(|b| std::str::from_utf8(b).ok()) {
            let secret = secret.trim();
            if !secret.is_empty() {
                stdout = stdout.replace(secret, "[SEGREDO REMOVIDO]");
                stderr = stderr.replace(secret, "[SEGREDO REMOVIDO]");
            }
        }
        Ok(ProcessOutput {
            code,
            stdout,
            stderr,
            truncated: out_truncated || err_truncated,
        })
    }

    pub fn checked(&self, executable: &str, args: &[String]) -> Result<ProcessOutput> {
        let output = self.run(executable, args, None)?;
        if output.code != 0 {
            return Err(AppError::new(
                1,
                format!(
                    "{executable} terminou com código {}: {}",
                    output.code,
                    output.stderr.trim()
                ),
            ));
        }
        Ok(output)
    }
}

fn nonblocking(fd: &impl std::os::fd::AsRawFd) -> std::io::Result<()> {
    // Os descritores pertencem ao pipe recém-criado; não alteramos stdin do usuário.
    let flags = unsafe { libc::fcntl(fd.as_raw_fd(), libc::F_GETFL) };
    if flags < 0
        || unsafe { libc::fcntl(fd.as_raw_fd(), libc::F_SETFL, flags | libc::O_NONBLOCK) } < 0
    {
        return Err(std::io::Error::last_os_error());
    }
    Ok(())
}

fn bounded_read(
    mut reader: impl Read + std::os::fd::AsRawFd,
    finished: &AtomicBool,
) -> std::io::Result<(Vec<u8>, bool)> {
    nonblocking(&reader)?;
    let mut retained = Vec::new();
    let mut buffer = [0u8; 8192];
    let mut truncated = false;
    let mut draining_since = None;
    loop {
        if finished.load(Ordering::SeqCst) {
            let since = draining_since.get_or_insert_with(Instant::now);
            if since.elapsed() > Duration::from_millis(100) {
                truncated = true;
                break;
            }
        }
        let n = match reader.read(&mut buffer) {
            Ok(n) => n,
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                // Um descendente com setsid pode manter o pipe aberto após o pai.
                if finished.load(Ordering::SeqCst) {
                    truncated = true;
                    break;
                }
                thread::sleep(Duration::from_millis(10));
                continue;
            }
            Err(e) if e.kind() == std::io::ErrorKind::Interrupted => continue,
            Err(e) => return Err(e),
        };
        if n == 0 {
            break;
        }
        let keep = n.min(MAX_OUTPUT.saturating_sub(retained.len()));
        retained.extend_from_slice(&buffer[..keep]);
        truncated |= keep < n;
    }
    Ok((retained, truncated))
}

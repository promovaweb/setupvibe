//! TUI operacional no contrato visual do Hub. Mutações reutilizam o CLI por NDJSON.
mod job;
pub mod theme;
mod view;
use crate::{
    catalog::Catalog,
    domain::Edition,
    error::{AppError, Result},
    process::{self, CANCELLED},
    state::{Database, Store},
};
use crossterm::{
    event::{self, Event, KeyCode, KeyEvent, KeyEventKind, KeyModifiers, MouseEventKind},
    execute,
};
use ratatui::{Terminal, backend::TestBackend};
use serde_json::{Value, json};
use std::{
    collections::{BTreeMap, BTreeSet},
    io::IsTerminal,
    path::PathBuf,
    sync::atomic::Ordering,
    time::Duration,
};

pub const TABS: [&str; 6] = [
    "Home",
    "Aplicativos",
    "Serviços",
    "Métricas",
    "Histórico",
    "Sobre",
];
#[derive(Clone, Copy, PartialEq, Eq)]
enum Purpose {
    Read,
    Preview,
    Apply,
}
struct Pending {
    purpose: Purpose,
    args: Vec<String>,
    result: Option<Value>,
}
struct Edit {
    kind: &'static str,
    value: String,
}
pub struct App {
    catalog: Catalog,
    directory: PathBuf,
    edition: Edition,
    tab: usize,
    focus: usize,
    index: usize,
    list_offset: usize,
    scroll: u16,
    selected: BTreeSet<String>,
    options: BTreeMap<String, Value>,
    rows: Vec<Value>,
    details: String,
    status: String,
    error: bool,
    metrics: Value,
    observations: Vec<crate::state::Observation>,
    job: Option<job::Job>,
    pending: Option<Pending>,
    review: Option<Vec<String>>,
    edit: Option<Edit>,
    timeout: u64,
    quitting: bool,
    log: Vec<String>,
    hover: Option<(u16, u16)>,
}
impl App {
    fn new(directory: PathBuf, edition: Edition, timeout: u64) -> Result<Self> {
        let catalog = Catalog::embedded()?;
        let mut app = Self {
            catalog,
            directory,
            edition,
            tab: 0,
            focus: 3,
            index: 0,
            list_offset: 0,
            scroll: 0,
            selected: BTreeSet::new(),
            options: BTreeMap::new(),
            rows: vec![],
            details: String::new(),
            status: "Somente leitura · ^U atualiza; P prepara ambiente".into(),
            error: false,
            metrics: json!({}),
            observations: vec![],
            job: None,
            pending: None,
            review: None,
            edit: None,
            timeout,
            quitting: false,
            log: vec![],
            hover: None,
        };
        if let Err(error) = app.local() {
            app.fail(error.message);
        }
        Ok(app)
    }
    fn local(&mut self) -> Result<()> {
        self.observations = Store::read(&self.directory, Database::State)?
            .map(|s| s.observations())
            .transpose()?
            .unwrap_or_default();
        self.metrics = crate::metrics::current(
            &self.directory,
            &crate::metrics::Query {
                scope: Some("host".into()),
                id: None,
                limit: 1,
                offset: 0,
                max_age: 30,
            },
        )?;
        self.rows = match self.tab {
            1 => self
                .catalog
                .components
                .iter()
                .filter(|c| c.editions.contains(&self.edition))
                .map(|c| json!({"id":c.id,"name":c.name,"category":c.category}))
                .collect(),
            4 => Store::read(&self.directory, Database::State)?
                .map(|s| s.operations(None, 100, 0))
                .transpose()?
                .unwrap_or_default(),
            _ => vec![],
        };
        self.index = self.index.min(self.rows.len().saturating_sub(1));
        Ok(())
    }
    fn fail(&mut self, message: impl Into<String>) {
        self.status = process::sanitize(&message.into());
        self.error = true;
    }
    fn start(&mut self, mut args: Vec<String>, purpose: Purpose) -> Result<()> {
        if self.job.is_some() {
            return Err(AppError::precondition(
                "Aguarde a operação atual ou cancele com Ctrl+C",
            ));
        }
        self.review = None;
        self.scroll = 0;
        self.log.clear();
        let actual = args.clone();
        if purpose == Purpose::Preview {
            args.push("--dry-run".into());
        }
        if purpose == Purpose::Apply {
            args.push("--yes".into());
        }
        self.job = Some(job::Job::start(
            &self.directory,
            self.edition,
            &args,
            self.timeout,
        )?);
        self.pending = Some(Pending {
            purpose,
            args: actual,
            result: None,
        });
        self.status = if purpose == Purpose::Apply {
            "Executando · Ctrl+C cancela"
        } else {
            "Carregando · Ctrl+C cancela"
        }
        .into();
        self.error = false;
        Ok(())
    }
    fn refresh(&mut self) -> Result<()> {
        self.local()?;
        match self.tab {
            2 => self.start(vec!["service".into(), "list".into()], Purpose::Read),
            3 => self.start(vec!["metrics".into(), "current".into()], Purpose::Read),
            _ => {
                self.status = "Leitura atualizada · nenhum componente alterado".into();
                self.error = false;
                Ok(())
            }
        }
    }
    fn poll(&mut self) -> Result<()> {
        let mut done = None;
        while let Some(job) = &self.job {
            let message = match job.receiver.try_recv() {
                Ok(message) => message,
                Err(std::sync::mpsc::TryRecvError::Empty) => break,
                Err(std::sync::mpsc::TryRecvError::Disconnected) => {
                    done = Some(1);
                    break;
                }
            };
            match message {
                job::Message::Error(message) => self.fail(message),
                job::Message::Event(value) => match value["event"].as_str().unwrap_or("") {
                    "result" => {
                        if let Some(p) = &mut self.pending {
                            p.result = Some(value);
                        }
                    }
                    "step_started" => {
                        self.status = format!(
                            "Executando: {} · Ctrl+C cancela",
                            value["data"]["component"].as_str().unwrap_or("etapa")
                        )
                    }
                    "step_completed" | "step_failed" => {
                        self.log.push(process::sanitize(&format!(
                            "{}: {}",
                            value["data"]["component"], value["data"]["status"]
                        )));
                        if self.log.len() > 200 {
                            self.log.remove(0);
                        }
                    }
                    _ => {}
                },
                job::Message::Done(code) => {
                    done = Some(code);
                    break;
                }
            }
        }
        if let Some(code) = done {
            self.job = None;
            let pending = self.pending.take().expect("operação registrada");
            let result=pending.result.unwrap_or_else(||json!({"success":false,"error":{"message":format!("CLI encerrou sem resultado, código {code}")}}));
            self.details = process::sanitize(&serde_json::to_string_pretty(
                result.get("data").unwrap_or(&result),
            )?);
            if result["success"] != true {
                self.fail(
                    result["error"]["message"]
                        .as_str()
                        .unwrap_or("Operação com falhas; consulte os detalhes e o histórico"),
                );
            } else if pending.purpose == Purpose::Preview {
                if result["data"]["ready"] == false {
                    self.fail(
                        "Prévia encontrou impedimentos; revise os detalhes antes de executar",
                    );
                } else {
                    self.review = Some(pending.args);
                    self.status =
                        "Revisão pronta · Enter confirma alterações · Esc descarta".into();
                }
            } else if pending.purpose == Purpose::Apply {
                self.local()?;
                self.status = "Operação concluída · resultado registrado no histórico".into();
                self.error = false;
            } else {
                self.status = "Consulta concluída · somente leitura".into();
                self.error = false;
                if pending.args == ["service", "list"] {
                    self.rows = result["data"]["containers"]
                        .as_array()
                        .cloned()
                        .unwrap_or_default();
                    if let Some(services) = result["data"]["swarm_services"].as_array() {
                        self.rows.extend(services.clone());
                    }
                }
                if pending.args == ["metrics", "current"] {
                    self.rows = result["data"]["samples"]
                        .as_array()
                        .cloned()
                        .unwrap_or_default();
                }
            }
            self.index = self.index.min(self.rows.len().saturating_sub(1));
        }
        Ok(())
    }
    fn component_args(&self, action: &str) -> Result<Vec<String>> {
        let ids = if self.selected.is_empty() {
            vec![self.current_id()?]
        } else {
            self.selected.iter().cloned().collect()
        };
        let mut args = vec!["component".into(), action.into()];
        args.extend(ids);
        if action != "verify" {
            for (key, value) in &self.options {
                args.extend(["--option".into(), format!("{key}={value}")]);
            }
        }
        Ok(args)
    }
    fn current_id(&self) -> Result<String> {
        self.rows
            .get(self.index)
            .and_then(|v| v["id"].as_str())
            .map(str::to_owned)
            .ok_or_else(|| AppError::precondition("Selecione uma linha disponível"))
    }
    fn tab(&mut self, index: usize) -> Result<()> {
        if self.job.is_some() {
            return Err(AppError::precondition(
                "Aguarde a operação antes de trocar a área",
            ));
        }
        self.tab = index;
        self.focus = 3;
        self.index = 0;
        self.scroll = 0;
        self.details.clear();
        self.review = None;
        self.refresh()
    }
    fn prepare(&mut self) -> Result<()> {
        self.tab(1)?;
        self.selected = if self.edition == Edition::Server {
            crate::catalog::SERVER_COMPONENTS
                .iter()
                .map(|s| s.to_string())
                .collect()
        } else {
            [
                "git",
                "gh",
                "docker",
                "portainer",
                "tailscale",
                "collector",
                "mise",
                "node",
                "python",
            ]
            .iter()
            .map(|s| s.to_string())
            .collect()
        };
        self.options.clear();
        self.status = "Preparação inicial selecionada · Espaço ajusta · I revisa instalação".into();
        Ok(())
    }
    fn enter(&mut self) -> Result<()> {
        if let Some(args) = self.review.take() {
            return self.start(args, Purpose::Apply);
        }
        match self.focus {
            0 => {
                self.edit = Some(Edit {
                    kind: "directory",
                    value: self.directory.to_string_lossy().into(),
                });
                Ok(())
            }
            1 => self.refresh(),
            2 => self.refresh(),
            _ => match self.tab {
                1 => self.start(
                    vec!["component".into(), "inspect".into(), self.current_id()?],
                    Purpose::Read,
                ),
                2 => self.start(
                    vec!["service".into(), "inspect".into(), self.current_id()?],
                    Purpose::Read,
                ),
                3 => {
                    self.details = serde_json::to_string_pretty(
                        self.rows.get(self.index).unwrap_or(&Value::Null),
                    )?;
                    self.focus = 4;
                    Ok(())
                }
                4 => self.start(
                    vec!["operation".into(), "show".into(), self.current_id()?],
                    Purpose::Read,
                ),
                _ => Ok(()),
            },
        }
    }
    fn edit_key(&mut self, key: KeyEvent) -> Result<()> {
        let edit = self.edit.as_mut().expect("edição ativa");
        match key.code {
            KeyCode::Esc => {
                self.edit = None;
                return Ok(());
            }
            KeyCode::Backspace => {
                edit.value.pop();
            }
            KeyCode::Char('u') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                edit.value.clear()
            }
            KeyCode::Char(c)
                if !key.modifiers.contains(KeyModifiers::CONTROL) && !c.is_control() =>
            {
                if edit.value.len() < 4096 {
                    edit.value.push(c);
                }
            }
            KeyCode::Enter => {
                let edit = self.edit.take().expect("edição ativa");
                match edit.kind {
                    "directory" => {
                        let path = PathBuf::from(edit.value);
                        if !path.is_absolute() {
                            return Err(AppError::invalid("Informe um diretório absoluto"));
                        }
                        self.directory = path;
                        self.review = None;
                        self.refresh()?;
                    }
                    "options" => {
                        self.options = serde_json::from_str(&edit.value)?;
                        self.status = "Opções atualizadas · I para revisar instalação".into();
                    }
                    "command" => {
                        let args: Vec<String> = serde_json::from_str(&edit.value)?;
                        if args.is_empty()
                            || args.iter().any(|s| {
                                s.starts_with("--")
                                    && ![
                                        "--option",
                                        "--role",
                                        "--interval",
                                        "--advertise-addr",
                                        "--scope",
                                    ]
                                    .contains(&s.as_str())
                            })
                        {
                            return Err(AppError::invalid(
                                "Use argumentos JSON sem flags globais, segredos ou confirmação; a TUI fará a revisão",
                            ));
                        }
                        if ![
                            "component",
                            "collector",
                            "service",
                            "swarm",
                            "updates",
                            "git",
                            "gh",
                            "docker",
                            "portainer",
                            "herdr",
                            "codex",
                            "claude",
                            "antigravity",
                            "opencode",
                            "kimi",
                            "ansible",
                            "tailscale",
                        ]
                        .contains(&args[0].as_str())
                            || args.get(1).is_none_or(|v| {
                                ![
                                    "install",
                                    "update",
                                    "apply",
                                    "configure",
                                    "start",
                                    "stop",
                                    "restart",
                                    "init",
                                ]
                                .contains(&v.as_str())
                            })
                        {
                            return Err(AppError::invalid(
                                "Selecione uma operação de instalação, atualização, serviço, coletor ou swarm init",
                            ));
                        }
                        self.start(args, Purpose::Preview)?;
                    }
                    _ => {}
                }
            }
            _ => {}
        }
        Ok(())
    }
    fn key(&mut self, mut key: KeyEvent) -> Result<()> {
        if self.edit.is_none()
            && let KeyCode::Char(c) = key.code
        {
            key.code = KeyCode::Char(c.to_ascii_lowercase());
        }
        if key.kind == KeyEventKind::Release {
            return Ok(());
        }
        if key.modifiers.contains(KeyModifiers::CONTROL)
            && matches!(key.code, KeyCode::Char('q') | KeyCode::Char('c'))
        {
            if key.code == KeyCode::Char('q') {
                self.quitting = true;
            }
            if let Some(job) = &self.job {
                job.cancel();
                self.status = "Cancelamento solicitado; aguardando encerramento seguro".into();
            } else if key.code == KeyCode::Char('c') {
                self.status = "Nenhuma operação ativa".into();
            }
            return Ok(());
        }
        if self.edit.is_some() {
            return self.edit_key(key);
        }
        if key.modifiers.contains(KeyModifiers::CONTROL)
            && let KeyCode::Char(c) = key.code
        {
            if let Some(index) = "gatrob".chars().position(|v| v == c) {
                return self.tab(index);
            }
            if c == 'u' {
                return self.refresh();
            }
        }
        if key.code == KeyCode::Esc {
            self.review = None;
            self.details.clear();
            if self.job.is_none() {
                self.tab(0)?;
            }
            return Ok(());
        }
        if key.code == KeyCode::Tab {
            self.focus = (self.focus + 1) % 5;
            return Ok(());
        }
        if key.code == KeyCode::BackTab {
            self.focus = (self.focus + 4) % 5;
            return Ok(());
        }
        if self.job.is_some() {
            return Ok(());
        }
        match key.code {
            KeyCode::Left if self.focus == 2 => {
                self.tab((self.tab + 5) % 6)?;
                self.focus = 2;
            }
            KeyCode::Right if self.focus == 2 => {
                self.tab((self.tab + 1) % 6)?;
                self.focus = 2;
            }
            KeyCode::Down | KeyCode::Char('j') => {
                if self.focus == 4 || self.review.is_some() {
                    self.scroll = self.scroll.saturating_add(1);
                } else {
                    self.index = (self.index + 1).min(self.rows.len().saturating_sub(1));
                    self.details.clear();
                    self.scroll = 0;
                }
            }
            KeyCode::Up | KeyCode::Char('k') => {
                if self.focus == 4 || self.review.is_some() {
                    self.scroll = self.scroll.saturating_sub(1);
                } else {
                    self.index = self.index.saturating_sub(1);
                    self.details.clear();
                    self.scroll = 0;
                }
            }
            KeyCode::PageDown => self.scroll = self.scroll.saturating_add(10),
            KeyCode::PageUp => self.scroll = self.scroll.saturating_sub(10),
            KeyCode::Enter => self.enter()?,
            KeyCode::Char('p') => self.prepare()?,
            KeyCode::Char('e') => {
                self.edition = if self.edition == Edition::Desktop {
                    Edition::Server
                } else {
                    Edition::Desktop
                };
                self.selected.clear();
                self.options.clear();
                self.tab(0)?;
            }
            KeyCode::Char(':') => {
                self.edit = Some(Edit {
                    kind: "command",
                    value: "[\"collector\",\"install\"]".into(),
                })
            }
            KeyCode::Char(' ') if self.tab == 1 => {
                let id = self.current_id()?;
                if !self.selected.remove(&id) {
                    self.selected.insert(id);
                }
            }
            KeyCode::Char('o') if self.tab == 1 => {
                let id = self.current_id()?;
                self.selected = BTreeSet::from([id.clone()]);
                self.options = self
                    .catalog
                    .get(&id)?
                    .options
                    .iter()
                    .map(|(k, v)| (k.clone(), v.default_value()))
                    .collect();
                self.edit = Some(Edit {
                    kind: "options",
                    value: serde_json::to_string(&self.options)?,
                });
            }
            KeyCode::Char('i') if self.tab == 1 => {
                self.start(self.component_args("install")?, Purpose::Preview)?
            }
            KeyCode::Char('u') if self.tab == 1 => {
                self.options.clear();
                self.start(self.component_args("update")?, Purpose::Preview)?;
            }
            KeyCode::Char('v') if self.tab == 1 => {
                self.start(self.component_args("verify")?, Purpose::Read)?
            }
            KeyCode::Char('d') if self.tab == 1 => {
                let mut args = vec!["updates".into(), "list".into()];
                args.extend(if self.selected.is_empty() {
                    vec![self.current_id()?]
                } else {
                    self.selected.iter().cloned().collect()
                });
                self.start(args, Purpose::Read)?;
            }
            KeyCode::Char(c) if self.tab == 2 && "strl".contains(c) => {
                let action = match c {
                    's' => "start",
                    't' => "stop",
                    'r' => "restart",
                    _ => "logs",
                };
                self.start(
                    vec!["service".into(), action.into(), self.current_id()?],
                    if c == 'l' {
                        Purpose::Read
                    } else {
                        Purpose::Preview
                    },
                )?;
            }
            KeyCode::Char('w') if self.tab == 2 => {
                self.start(vec!["swarm".into(), "status".into()], Purpose::Read)?
            }
            KeyCode::Char('h') if self.tab == 3 => {
                let row = self
                    .rows
                    .get(self.index)
                    .ok_or_else(|| AppError::precondition("Selecione um recurso com amostra"))?;
                self.start(
                    vec![
                        "metrics".into(),
                        "history".into(),
                        "--scope".into(),
                        row["scope"].as_str().unwrap_or("host").into(),
                        "--id".into(),
                        row["resource"].as_str().unwrap_or("host").into(),
                    ],
                    Purpose::Read,
                )?;
            }
            KeyCode::Char('c') if self.tab == 3 => {
                self.start(vec!["collector".into(), "status".into()], Purpose::Read)?
            }
            _ => {}
        }
        Ok(())
    }
}

struct TerminalGuard;
impl Drop for TerminalGuard {
    fn drop(&mut self) {
        let _ = execute!(std::io::stdout(), event::DisableMouseCapture);
        ratatui::restore();
    }
}

pub fn run(
    directory: PathBuf,
    edition: Edition,
    timeout: u64,
    initial_tab: usize,
) -> Result<Value> {
    if !std::io::stdin().is_terminal() || !std::io::stdout().is_terminal() {
        return Err(AppError::precondition(
            "TUI exige terminal interativo; use --help ou comandos com --output json",
        ));
    }
    let mut app = App::new(directory, edition, timeout)?;
    if initial_tab > 0 {
        app.tab(initial_tab)?;
    }
    let mut terminal = ratatui::try_init()?;
    let _guard = TerminalGuard;
    execute!(std::io::stdout(), event::EnableMouseCapture)?;
    loop {
        if CANCELLED.load(Ordering::SeqCst) {
            app.quitting = true;
            if let Some(job) = &app.job {
                job.cancel();
            }
        }
        if let Err(e) = app.poll() {
            app.fail(e.message);
        }
        if app.quitting && app.job.is_none() {
            break;
        }
        terminal.draw(|f| view::draw(f, &mut app))?;
        if event::poll(Duration::from_millis(100))? {
            let result = match event::read()? {
                Event::Key(key) => app.key(key),
                Event::Mouse(mouse) => {
                    app.hover = Some((mouse.column, mouse.row));
                    match mouse.kind {
                        MouseEventKind::Down(event::MouseButton::Left) => view::click(
                            &mut app,
                            mouse.column,
                            mouse.row,
                            terminal.size()?.width,
                            terminal.size()?.height,
                        ),
                        MouseEventKind::ScrollDown => {
                            app.scroll = app.scroll.saturating_add(3);
                            Ok(())
                        }
                        MouseEventKind::ScrollUp => {
                            app.scroll = app.scroll.saturating_sub(3);
                            Ok(())
                        }
                        _ => Ok(()),
                    }
                }
                _ => Ok(()),
            };
            if let Err(e) = result {
                app.fail(e.message);
            }
        }
    }
    Ok(json!({"closed":true}))
}

/// Renderização determinística do mesmo frame para inspeção e testes de terminais.
pub fn snapshot(
    directory: PathBuf,
    edition: Edition,
    width: u16,
    height: u16,
    tab: usize,
) -> Result<Value> {
    let mut app = App::new(directory, edition, 300)?;
    app.tab = tab;
    app.local()?;
    let backend = TestBackend::new(width, height);
    let mut terminal = Terminal::new(backend)?;
    terminal.draw(|f| view::draw(f, &mut app))?;
    let buffer = terminal.backend().buffer();
    let mut lines = Vec::new();
    let mut cells = Vec::new();
    for y in 0..height {
        let mut line = String::new();
        for x in 0..width {
            let cell = &buffer[(x, y)];
            line.push_str(cell.symbol());
            cells.push(json!({"x":x,"y":y,"text":cell.symbol(),"fg":theme::hex(cell.fg),"bg":theme::hex(cell.bg)}));
        }
        lines.push(line);
    }
    Ok(
        json!({"width":width,"height":height,"lines":lines,"cells":cells,"tabs":TABS,"tokens":theme::tokens(),"edition":edition}),
    )
}

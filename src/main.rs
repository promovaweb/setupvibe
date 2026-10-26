//! CLI do núcleo. Toda operação passa pelos contratos compartilhados.
use clap::{CommandFactory, FromArgMatches, Parser, Subcommand};
use serde_json::{Value, json};
use setupvibe::{
    adapters,
    catalog::Catalog,
    domain::{Action, Edition, Platform},
    error::{AppError, Result},
    executor,
    output::Output,
    planner::Plan,
    process::{self, Runner},
    state::{self, Database, StateLock, Store},
};
use std::{collections::BTreeMap, path::PathBuf};

fn default_edition() -> &'static str {
    if cfg!(feature = "server-default") {
        "server"
    } else {
        "desktop"
    }
}

#[derive(Parser)]
#[command(
    name = "setupvibe",
    version,
    about = "Preparação e gerenciamento de ambientes",
    disable_help_flag = true,
    disable_help_subcommand = true,
    help_template = "{name} {version}\n{about}\n\nUso: {usage}\n\n{all-args}"
)]
struct Cli {
    #[arg(long, short='h', action=clap::ArgAction::Help, help="Exibe a ajuda")]
    help: Option<bool>,
    #[arg(
        long,
        global = true,
        value_enum,
        default_value = default_edition(),
        env = "SETUPVIBE_EDITION",
        help = "Edição do ambiente"
    )]
    edition: Edition,
    #[arg(
        long,
        global = true,
        value_enum,
        default_value = "text",
        help = "Formato da saída"
    )]
    output: Output,
    #[arg(long, global = true, help = "Mostra o plano sem executar alterações")]
    dry_run: bool,
    #[arg(long, global = true, help = "Executa sem perguntas")]
    non_interactive: bool,
    #[arg(long, global = true, help = "Autoriza as alterações do plano")]
    yes: bool,
    #[arg(
        long,
        global = true,
        env = "SETUPVIBE_DATA_DIR",
        help = "Diretório absoluto e privado para estado"
    )]
    data_dir: Option<PathBuf>,
    #[arg(long, global=true, default_value="300", value_parser=clap::value_parser!(u64).range(1..=86400), help="Tempo limite por subprocesso em segundos")]
    timeout: u64,
    #[arg(long, global = true, help = "Desativa cores na saída")]
    no_color: bool,
    #[arg(
        long,
        global = true,
        help = "Versão explícita do componente mise solicitado"
    )]
    target_version: Option<String>,
    #[command(subcommand)]
    command: Option<Command>,
}

#[derive(Subcommand)]
enum Command {
    /// Abre a interface interativa de terminal
    Tui {
        #[arg(long, help = "Exporta frame JSON para inspeção sem abrir terminal")]
        snapshot: bool,
        #[arg(long,default_value="129",value_parser=clap::value_parser!(u16).range(50..=240))]
        width: u16,
        #[arg(long,default_value="44",value_parser=clap::value_parser!(u16).range(18..=100))]
        height: u16,
        #[arg(long,default_value="0",value_parser=clap::value_parser!(u8).range(0..=5))]
        tab: u8,
    },
    /// Executa o coletor independente
    Collector {
        #[command(subcommand)]
        command: CollectorCommand,
    },
    /// Consulta recursos e histórico local
    Metrics {
        #[command(subcommand)]
        command: MetricsCommand,
    },
    /// Instala, verifica ou atualiza o runtime Docker
    Docker {
        #[command(subcommand)]
        command: AppCommand,
    },
    /// Descobre e controla serviços Docker
    Service {
        #[command(subcommand)]
        command: ServiceCommand,
    },
    /// Consulta ou configura Swarm explicitamente
    Swarm {
        #[command(subcommand)]
        command: SwarmCommand,
    },
    /// Instala, verifica ou atualiza Git
    Git {
        #[command(subcommand)]
        command: AppCommand,
    },
    /// Instala, verifica ou atualiza Gh
    Gh {
        #[command(subcommand)]
        command: AppCommand,
    },
    /// Instala, verifica ou atualiza Portainer
    Portainer {
        #[command(subcommand)]
        command: AppCommand,
    },
    /// Instala, verifica ou atualiza Herdr
    Herdr {
        #[command(subcommand)]
        command: AppCommand,
    },
    /// Instala, verifica ou atualiza Codex
    Codex {
        #[command(subcommand)]
        command: AppCommand,
    },
    /// Instala, verifica ou atualiza Claude
    Claude {
        #[command(subcommand)]
        command: AppCommand,
    },
    /// Instala, verifica ou atualiza Antigravity
    Antigravity {
        #[command(subcommand)]
        command: AppCommand,
    },
    /// Instala, verifica ou atualiza Opencode
    Opencode {
        #[command(subcommand)]
        command: AppCommand,
    },
    /// Instala, verifica ou atualiza Kimi
    Kimi {
        #[command(subcommand)]
        command: AppCommand,
    },
    /// Instala, verifica ou atualiza Ansible
    Ansible {
        #[command(subcommand)]
        command: AppCommand,
    },
    /// Instala, verifica ou atualiza Tailscale
    Tailscale {
        #[command(subcommand)]
        command: AppCommand,
    },
    /// Descobre e aplica atualizações selecionadas
    Updates {
        #[command(subcommand)]
        command: UpdatesCommand,
    },
    /// Diagnostica plataforma e comandos existentes sem instalar
    Doctor,
    /// Consulta e mantém os bancos locais
    State {
        #[command(subcommand)]
        command: StateCommand,
    },
    /// Consulta o histórico das operações
    Operation {
        #[command(subcommand)]
        command: OperationCommand,
    },
    /// Informa a versão do SetupVibe
    Version,
    /// Consulta e valida o catálogo embarcado
    Catalog {
        #[command(subcommand)]
        command: CatalogCommand,
    },
    /// Planeja operações de componentes
    Component {
        #[command(subcommand)]
        command: ComponentCommand,
    },
}
#[derive(Subcommand)]
enum CollectorCommand {
    /// Instala e inicia supervisão nativa
    Install {
        #[arg(long, value_enum)]
        scope: Option<setupvibe::supervisor::Scope>,
        #[arg(long, default_value="5", value_parser=clap::value_parser!(u64).range(1..=3600))]
        interval: u64,
    },
    /// Atualiza o executável supervisionado, preservando configuração
    Update,
    /// Altera o intervalo e reinicia o coletor
    Configure {
        #[arg(long,value_parser=clap::value_parser!(u64).range(1..=3600))]
        interval: u64,
    },
    /// Consulta arquivo instalado, supervisor e atualidade das métricas
    Status,
    /// Inicia o coletor instalado
    Start,
    /// Para o coletor nesta sessão, preservando dados e instalação
    Stop,
    /// Reinicia o coletor instalado
    Restart,
    /// Renderiza unidade sem gravar arquivos; permite conferir outra plataforma
    Render {
        #[arg(long, value_enum)]
        platform: Option<setupvibe::domain::Os>,
        #[arg(long, value_enum)]
        scope: Option<setupvibe::supervisor::Scope>,
        #[arg(long,default_value="5",value_parser=clap::value_parser!(u64).range(1..=3600))]
        interval: u64,
    },
    /// Coleta até receber sinal de encerramento
    Run {
        #[arg(long, default_value="5", value_parser=clap::value_parser!(u64).range(1..=3600))]
        interval: u64,
        #[arg(long, conflicts_with = "samples")]
        once: bool,
        #[arg(long, value_parser=clap::value_parser!(u64).range(1..))]
        samples: Option<u64>,
    },
}
#[derive(Subcommand)]
enum MetricsCommand {
    /// Última amostra de cada recurso com idade e disponibilidade
    Current {
        #[command(flatten)]
        query: setupvibe::metrics::Query,
    },
    /// Histórico paginado; reutilize snapshot-id e next-after
    History {
        #[command(flatten)]
        query: setupvibe::metrics::Query,
        #[arg(long)]
        from: Option<String>,
        #[arg(long)]
        to: Option<String>,
        #[arg(long, default_value = "0")]
        after: u64,
        #[arg(long)]
        snapshot_id: Option<u64>,
    },
}
#[derive(Subcommand)]
enum ServiceCommand {
    /// Lista containers e serviços Swarm sem adotar instalações
    List,
    /// Exibe saúde, portas, volumes e recursos
    Inspect { id: String },
    /// Consulta logs com remoção de formatos usuais de credenciais
    Logs {
        id: String,
        #[arg(long)]
        since: Option<String>,
        #[arg(long)]
        follow: bool,
        #[arg(long,default_value="100",value_parser=clap::value_parser!(u32).range(1..=10000))]
        tail: u32,
    },
    /// Inicia um container gerenciado
    Start { id: String },
    /// Para um container gerenciado, preservando volumes
    Stop { id: String },
    /// Reinicia um container gerenciado
    Restart { id: String },
}
#[derive(Subcommand)]
enum SwarmCommand {
    /// Consulta estado do nó sem revelar tokens
    Status,
    /// Inicializa um novo Swarm com endereço explícito
    Init {
        #[arg(long)]
        advertise_addr: String,
    },
    /// Associa o nó usando token recebido por stdin
    Join {
        #[arg(long)]
        manager: String,
        #[arg(long)]
        token_stdin: bool,
    },
}
#[derive(Subcommand)]
enum AppCommand {
    /// Instala o aplicativo e dependências necessárias
    Install {
        #[arg(long, help = "Papel Portainer: server ou agent")]
        role: Option<String>,
        #[arg(long = "option", value_name = "CHAVE=VALOR")]
        options: Vec<String>,
    },
    /// Consulta a instalação sem alterar dados
    Verify,
    /// Atualiza pelo gerenciador proprietário
    Update {
        #[arg(long = "option", value_name = "CHAVE=VALOR")]
        options: Vec<String>,
    },
}
#[derive(Subcommand)]
enum StateCommand {
    /// Inicia bancos sem instalar componentes
    Init,
    /// Exibe versão e observações persistidas
    Status,
    /// Reobserva caminhos e identifica operações interrompidas
    Reconcile,
    /// Cria backup consistente do banco de estado (não inclui métricas)
    Backup {
        #[arg(long)]
        destination: PathBuf,
    },
}
#[derive(Subcommand)]
enum OperationCommand {
    /// Lista operações com paginação
    List {
        #[arg(long,default_value="100",value_parser=clap::value_parser!(u32).range(1..=1000))]
        limit: u32,
        #[arg(long, default_value = "0")]
        offset: u32,
    },
    /// Exibe operação e etapas
    Show { id: String },
}
#[derive(Subcommand)]
enum CatalogCommand {
    /// Lista componentes permitidos pela edição
    List,
    /// Exibe detalhes de um componente
    Show { id: String },
    /// Valida o catálogo embarcado ou um arquivo, sem executá-lo
    Validate {
        #[arg(long)]
        file: Option<PathBuf>,
    },
}
#[derive(Subcommand)]
enum ComponentCommand {
    /// Consulta instalação e origem sem persistir
    Inspect { id: String },
    /// Verifica um componente sem alterar instalação
    Verify { id: String },
    /// Lista o catálogo da edição
    List,
    /// Planeja instalação com dependências
    Install {
        ids: Vec<String>,
        #[arg(long = "option", value_name = "CHAVE=VALOR")]
        options: Vec<String>,
    },
    /// Planeja atualização pelo gerenciador
    Update {
        ids: Vec<String>,
        #[arg(long = "option", value_name = "CHAVE=VALOR")]
        options: Vec<String>,
    },
}
#[derive(Subcommand)]
enum UpdatesCommand {
    /// Consulta candidatos dos componentes instalados
    List { ids: Vec<String> },
    /// Atualiza somente componentes selecionados
    Apply {
        #[arg(required = true)]
        ids: Vec<String>,
    },
}

fn options(values: &[String]) -> Result<BTreeMap<String, Value>> {
    let mut result = BTreeMap::new();
    for pair in values {
        let (key, value) = pair
            .split_once('=')
            .ok_or_else(|| AppError::invalid("Use --option CHAVE=VALOR"))?;
        if result.contains_key(key) {
            return Err(AppError::invalid(format!("Opção repetida: {key}")));
        }
        result.insert(
            key.to_owned(),
            serde_json::from_str(value).unwrap_or_else(|_| Value::String(value.into())),
        );
    }
    Ok(result)
}

fn run(cli: &Cli) -> Result<Value> {
    let catalog = Catalog::embedded()?;
    let default = Command::Tui {
        snapshot: false,
        width: 129,
        height: 44,
        tab: 0,
    };
    match cli.command.as_ref().unwrap_or(&default) {
        Command::Tui {
            snapshot,
            width,
            height,
            tab,
        } => {
            let directory = state::data_dir(cli.data_dir.as_deref())?;
            if *snapshot {
                return setupvibe::tui::snapshot(
                    directory,
                    cli.edition,
                    *width,
                    *height,
                    *tab as usize,
                );
            }
            if cli.non_interactive || cli.output != Output::Text {
                return Err(AppError::precondition(
                    "TUI exige interação e saída text; use comandos individuais para automação",
                ));
            }
            if cli.dry_run || cli.target_version.is_some() {
                return Err(AppError::invalid(
                    "Use --dry-run e --target-version nos comandos individuais; a TUI oferece revisão própria",
                ));
            }
            setupvibe::tui::run(directory, cli.edition, cli.timeout, *tab as usize)
        }
        Command::Collector {
            command:
                CollectorCommand::Run {
                    interval,
                    once,
                    samples,
                },
        } => {
            let directory = state::data_dir(cli.data_dir.as_deref())?;
            if cli.dry_run {
                return Ok(
                    json!({"preview":true,"directory":directory,"interval_seconds":interval,"retention_days":7}),
                );
            }
            if !cli.yes {
                return Err(AppError::precondition("Use --yes para iniciar a coleta"));
            }
            setupvibe::collector::run(
                &directory,
                *interval,
                if *once { Some(1) } else { *samples },
            )
        }
        Command::Collector { command } => {
            let directory = state::data_dir(cli.data_dir.as_deref())?;
            let runner = Runner {
                timeout: std::time::Duration::from_secs(cli.timeout),
            };
            match command {
                CollectorCommand::Status => setupvibe::supervisor::status(&directory, &runner),
                CollectorCommand::Render {
                    platform,
                    scope,
                    interval,
                } => {
                    let platform = platform.unwrap_or(Platform::detect()?.os);
                    setupvibe::supervisor::preview(&setupvibe::supervisor::configuration(
                        &directory,
                        cli.edition,
                        platform,
                        *scope,
                        *interval,
                    )?)
                }
                CollectorCommand::Install { scope, interval } => {
                    let platform = Platform::detect()?;
                    platform.validate_target(cli.edition)?;
                    let config = setupvibe::supervisor::configuration(
                        &directory,
                        cli.edition,
                        platform.os,
                        *scope,
                        *interval,
                    )?;
                    if cli.dry_run {
                        return setupvibe::supervisor::preview(&config);
                    }
                    control_operation(cli, "collector_install", "collector", || {
                        setupvibe::supervisor::install(config, &runner, false)
                    })
                }
                CollectorCommand::Configure { .. } | CollectorCommand::Update => {
                    let (_, mut config) = setupvibe::supervisor::installed()?
                        .ok_or_else(|| AppError::precondition("Coletor ausente; use install"))?;
                    if config.data_dir != directory {
                        return Err(AppError::precondition(
                            "Diretório difere do coletor instalado",
                        ));
                    }
                    if let CollectorCommand::Configure { interval } = command {
                        config.interval = *interval;
                    }
                    config.version = setupvibe::VERSION.into();
                    if cli.dry_run {
                        return setupvibe::supervisor::preview(&config);
                    }
                    control_operation(cli, "collector_update", "collector", || {
                        setupvibe::supervisor::install(config, &runner, true)
                    })
                }
                CollectorCommand::Start | CollectorCommand::Stop | CollectorCommand::Restart => {
                    let action = match command {
                        CollectorCommand::Start => "start",
                        CollectorCommand::Stop => "stop",
                        _ => "restart",
                    };
                    if cli.dry_run {
                        return setupvibe::supervisor::control(&directory, action, &runner, true);
                    }
                    control_operation(cli, &format!("collector_{action}"), "collector", || {
                        setupvibe::supervisor::control(&directory, action, &runner, false)
                    })
                }
                _ => unreachable!("run tratado separadamente"),
            }
        }
        Command::Metrics { command } => {
            let directory = state::data_dir(cli.data_dir.as_deref())?;
            match command {
                MetricsCommand::Current { query } => setupvibe::metrics::current(&directory, query),
                MetricsCommand::History {
                    query,
                    from,
                    to,
                    after,
                    snapshot_id,
                } => setupvibe::metrics::history(
                    &directory,
                    query,
                    from.as_deref(),
                    to.as_deref(),
                    *after,
                    *snapshot_id,
                ),
            }
        }
        Command::Docker { command } => execute_app(cli, &catalog, "docker", command),
        Command::Service { command } => {
            let runner = Runner {
                timeout: std::time::Duration::from_secs(cli.timeout),
            };
            match command {
                ServiceCommand::List => setupvibe::services::list(&runner),
                ServiceCommand::Inspect { id } => setupvibe::services::inspect(id, &runner),
                ServiceCommand::Logs {
                    id,
                    since,
                    tail,
                    follow,
                } => {
                    if *follow {
                        return setupvibe::services::follow_logs(
                            id,
                            since.as_deref(),
                            *tail,
                            &runner,
                            cli.output,
                        );
                    }
                    setupvibe::services::logs(id, since.as_deref(), *tail, &runner)
                }
                ServiceCommand::Start { id }
                | ServiceCommand::Stop { id }
                | ServiceCommand::Restart { id } => {
                    let action = match command {
                        ServiceCommand::Start { .. } => "start",
                        ServiceCommand::Stop { .. } => "stop",
                        _ => "restart",
                    };
                    if cli.dry_run {
                        return setupvibe::services::control(
                            id,
                            action,
                            cli.edition,
                            &runner,
                            true,
                            &state::data_dir(cli.data_dir.as_deref())?,
                        );
                    }
                    control_operation(cli, action, id, || {
                        setupvibe::services::control(
                            id,
                            action,
                            cli.edition,
                            &runner,
                            false,
                            &state::data_dir(cli.data_dir.as_deref())?,
                        )
                    })
                }
            }
        }
        Command::Swarm { command } => {
            let runner = Runner {
                timeout: std::time::Duration::from_secs(cli.timeout),
            };
            match command {
                SwarmCommand::Status => setupvibe::swarm::status(&runner),
                SwarmCommand::Init { advertise_addr } => {
                    if cli.dry_run {
                        return setupvibe::swarm::init(advertise_addr, &runner, true);
                    }
                    control_operation(cli, "swarm_init", advertise_addr, || {
                        setupvibe::swarm::init(advertise_addr, &runner, false)
                    })
                }
                SwarmCommand::Join {
                    manager,
                    token_stdin,
                } => {
                    if cli.dry_run {
                        return setupvibe::swarm::join(manager, "", &runner, true);
                    }
                    if !token_stdin {
                        return Err(AppError::precondition(
                            "Use --token-stdin; tokens não são aceitos em argumentos",
                        ));
                    }
                    control_operation(cli, "swarm_join", manager, || {
                        use std::io::Read;
                        let mut token = String::new();
                        std::io::stdin().take(2049).read_to_string(&mut token)?;
                        setupvibe::swarm::join(manager, token.trim(), &runner, false)
                    })
                }
            }
        }
        Command::Git { command } => execute_app(cli, &catalog, "git", command),
        Command::Gh { command } => execute_app(cli, &catalog, "gh", command),
        Command::Portainer { command } => execute_app(cli, &catalog, "portainer", command),
        Command::Herdr { command } => execute_app(cli, &catalog, "herdr", command),
        Command::Codex { command } => execute_app(cli, &catalog, "codex", command),
        Command::Claude { command } => execute_app(cli, &catalog, "claude", command),
        Command::Antigravity { command } => execute_app(cli, &catalog, "antigravity", command),
        Command::Opencode { command } => execute_app(cli, &catalog, "opencode", command),
        Command::Kimi { command } => execute_app(cli, &catalog, "kimi", command),
        Command::Ansible { command } => execute_app(cli, &catalog, "ansible", command),
        Command::Tailscale { command } => execute_app(cli, &catalog, "tailscale", command),
        Command::Updates {
            command: UpdatesCommand::List { ids },
        } => {
            let platform = Platform::detect()?;
            platform.validate_target(cli.edition)?;
            let runner = Runner {
                timeout: std::time::Duration::from_secs(cli.timeout),
            };
            let directory = state::data_dir(cli.data_dir.as_deref())?;
            let prior = Store::read(&directory, Database::State)?
                .map(|s| s.observations())
                .transpose()?
                .unwrap_or_default();
            let selected: Vec<_> = if ids.is_empty() {
                catalog
                    .components
                    .iter()
                    .filter(|c| c.editions.contains(&cli.edition))
                    .map(|c| c.id.clone())
                    .collect()
            } else {
                ids.clone()
            };
            let mut results = Vec::new();
            let mut failures = 0;
            let mut successes = 0;
            for id in &selected {
                let component = catalog.get(id)?;
                if !component.editions.contains(&cli.edition) {
                    return Err(AppError::unsupported(format!(
                        "Componente indisponível: {id}"
                    )));
                }
            }
            for id in selected {
                let result = (|| -> Result<Value> {
                    let component = catalog.get(&id)?;
                    let observation = adapters::inspect(
                        component,
                        &platform,
                        &runner,
                        prior.iter().find(|o| o.component == id),
                    )?;
                    if !observation.present {
                        return Ok(json!({"component":id,"installed":false}));
                    }
                    adapters::updates(&observation, &runner)
                })();
                match result {
                    Ok(value) => {
                        successes += 1;
                        results.push(value);
                    }
                    Err(error) => {
                        failures += 1;
                        results.push(json!({"component":id,"error":error}));
                    }
                }
            }
            Ok(
                json!({"updates":results,"exit_code":if failures==0{0}else if successes>0{5}else{1}}),
            )
        }
        Command::Updates {
            command: UpdatesCommand::Apply { ids },
        } => execute_components(cli, &catalog, ids, Action::Update, &[]),
        Command::Component {
            command: ComponentCommand::Inspect { id } | ComponentCommand::Verify { id },
        } => {
            let component = catalog.get(id)?;
            if !component.editions.contains(&cli.edition) {
                return Err(AppError::unsupported(
                    "Componente indisponível nesta edição",
                ));
            }
            let platform = Platform::detect()?;
            platform.validate_target(cli.edition)?;
            let directory = state::data_dir(cli.data_dir.as_deref())?;
            let prior = Store::read(&directory, Database::State)?
                .map(|s| s.observations())
                .transpose()?
                .unwrap_or_default();
            let observed = adapters::inspect(
                component,
                &platform,
                &Runner {
                    timeout: std::time::Duration::from_secs(cli.timeout),
                },
                prior.iter().find(|o| o.component == *id),
            )?;
            if matches!(
                cli.command,
                Some(Command::Component {
                    command: ComponentCommand::Verify { .. }
                })
            ) && !observed.present
            {
                return Err(AppError::precondition("Componente não instalado"));
            }
            if id == "tailscale" {
                return Ok(setupvibe::tailscale::verification(
                    &observed,
                    &Runner {
                        timeout: std::time::Duration::from_secs(cli.timeout),
                    },
                ));
            }
            Ok(json!(observed))
        }
        Command::Doctor => doctor(cli),
        Command::Operation { command } => {
            let directory = state::data_dir(cli.data_dir.as_deref())?;
            let store = Store::read(&directory, Database::State)?;
            let (id, limit, offset) = match command {
                OperationCommand::List { limit, offset } => (None, *limit, *offset),
                OperationCommand::Show { id } => (Some(id.as_str()), 1, 0),
            };
            let operations = store
                .map(|s| s.operations(id, limit, offset))
                .transpose()?
                .unwrap_or_default();
            if id.is_some() && operations.is_empty() {
                return Err(AppError::invalid("Operação não encontrada"));
            }
            Ok(json!({"operations":operations,"limit":limit,"offset":offset}))
        }
        Command::State { command } => {
            let directory = state::data_dir(cli.data_dir.as_deref())?;
            if matches!(command, StateCommand::Status) {
                let store = Store::read(&directory, Database::State)?;
                return Ok(match store {
                    Some(store) => {
                        json!({"initialized":true,"database":store.diagnostics()?,"observations":store.observations()?})
                    }
                    None => json!({"initialized":false,"observations":[]}),
                });
            }
            if cli.dry_run {
                return Ok(json!({"dry_run":true,"data_dir":directory,"mutation":"state"}));
            }
            if !cli.yes {
                return Err(AppError::precondition(
                    "Esta operação exige --yes; use --dry-run para revisar",
                ));
            }
            let _lock = StateLock::acquire(&directory, "operations")?;
            match command {
                StateCommand::Init => {
                    let store = Store::write(&directory, Database::State)?;
                    let metrics = Store::write(&directory, Database::Metrics)?;
                    Ok(json!({"state":store.diagnostics()?,"metrics":metrics.diagnostics()?}))
                }
                StateCommand::Reconcile => {
                    let mut store = Store::write(&directory, Database::State)?;
                    let interrupted = store.reconcile_interrupted()?;
                    let platform = Platform::detect()?;
                    let runner = Runner {
                        timeout: std::time::Duration::from_secs(cli.timeout),
                    };
                    let mut observations = Vec::new();
                    let mut failures = Vec::new();
                    for prior in store.observations()? {
                        let component = catalog.get(&prior.component)?;
                        if !component.editions.contains(&cli.edition) {
                            continue;
                        }
                        match adapters::inspect(component, &platform, &runner, Some(&prior)) {
                            Ok(observation) => {
                                store.observe(&observation)?;
                                observations.push(observation);
                            }
                            Err(error) => {
                                failures.push(json!({"component":prior.component,"error":error}))
                            }
                        }
                    }
                    Ok(
                        json!({"interrupted_operations":interrupted,"observations":observations,"errors":failures,"exit_code":if failures.is_empty(){0}else{5}}),
                    )
                }
                StateCommand::Backup { destination } => {
                    let store = Store::read(&directory, Database::State)?.ok_or_else(|| {
                        AppError::precondition("Banco de estado ainda não existe")
                    })?;
                    if !destination.is_absolute() {
                        return Err(AppError::invalid("Destino deve ser absoluto"));
                    }
                    let parent = destination
                        .parent()
                        .ok_or_else(|| AppError::invalid("Destino inválido"))?;
                    state::private_dir(parent)?;
                    use std::os::unix::fs::OpenOptionsExt;
                    std::fs::OpenOptions::new()
                        .write(true)
                        .create_new(true)
                        .mode(0o600)
                        .open(destination)?;
                    store.connection.backup("main", destination, None)?;
                    Ok(json!({"backup":destination}))
                }
                StateCommand::Status => unreachable!(),
            }
        }
        Command::Version => Ok(json!({"version":setupvibe::VERSION})),
        Command::Catalog {
            command: CatalogCommand::Validate { file },
        } => {
            let checked = match file {
                Some(path) => Catalog::parse(&std::fs::read_to_string(path)?)?,
                None => catalog,
            };
            Ok(
                json!({"valid":true,"catalog_version":checked.catalog_version,"components":checked.components.len()}),
            )
        }
        Command::Catalog {
            command: CatalogCommand::List,
        }
        | Command::Component {
            command: ComponentCommand::List,
        } => Ok(
            json!({"catalog_version":catalog.catalog_version,"components":catalog.components.iter().filter(|c| c.editions.contains(&cli.edition)).collect::<Vec<_>>()}),
        ),
        Command::Catalog {
            command: CatalogCommand::Show { id },
        } => {
            let component = catalog.get(id)?;
            if !component.editions.contains(&cli.edition) {
                return Err(AppError::unsupported(
                    "Componente indisponível nesta edição",
                ));
            }
            Ok(serde_json::to_value(component)?)
        }
        Command::Component { command } => {
            let (ids, values, action) = match command {
                ComponentCommand::Install { ids, options } => (ids, options, Action::Install),
                ComponentCommand::Update { ids, options } => (ids, options, Action::Update),
                _ => unreachable!(),
            };
            execute_components(cli, &catalog, ids, action, values)
        }
    }
}

fn control_operation(
    cli: &Cli,
    action: &str,
    target: &str,
    execute: impl FnOnce() -> Result<Value>,
) -> Result<Value> {
    Platform::detect()?.validate_target(cli.edition)?;
    if !cli.yes {
        return Err(AppError::precondition(
            "Controle exige --yes; revise com --dry-run",
        ));
    }
    let directory = state::data_dir(cli.data_dir.as_deref())?;
    let _host = state::HostLock::acquire()?;
    let _lock = StateLock::acquire(&directory, "operations")?;
    let mut store = Store::write(&directory, Database::State)?;
    store.reconcile_interrupted()?;
    let id = store.begin_control(action, target)?;
    cli.output.event(
        "operation_started",
        json!({"operation_id":id,"action":action,"target":target}),
    )?;
    let result = execute();
    let code = result.as_ref().err().map_or(0, |e| e.code);
    let status = if code == 0 {
        "succeeded"
    } else if code == 130 {
        "cancelled"
    } else {
        "failed"
    };
    store.step(&id, target, status, code)?;
    store.finish_operation(&id, status, code)?;
    match result {
        Ok(value) => Ok(json!({"operation_id":id,"result":value})),
        Err(e) => Err(e),
    }
}

fn execute_app(cli: &Cli, catalog: &Catalog, id: &str, command: &AppCommand) -> Result<Value> {
    match command {
        AppCommand::Install { options, role } => {
            let mut options = options.clone();
            if let Some(role) = role {
                options.push(format!("role={role}"));
            }
            execute_components(cli, catalog, &[id.into()], Action::Install, &options)
        }
        AppCommand::Update { options } => {
            execute_components(cli, catalog, &[id.into()], Action::Update, options)
        }
        AppCommand::Verify => {
            let component = catalog.get(id)?;
            if !component.editions.contains(&cli.edition) {
                return Err(AppError::unsupported(
                    "Componente indisponível nesta edição",
                ));
            }
            let platform = Platform::detect()?;
            platform.validate_target(cli.edition)?;
            let directory = state::data_dir(cli.data_dir.as_deref())?;
            let prior = Store::read(&directory, Database::State)?
                .map(|s| s.observations())
                .transpose()?
                .unwrap_or_default();
            let observed = adapters::inspect(
                component,
                &platform,
                &Runner {
                    timeout: std::time::Duration::from_secs(cli.timeout),
                },
                prior.iter().find(|o| o.component == id),
            )?;
            if !observed.present {
                return Err(AppError::precondition("Componente não instalado"));
            }
            if id == "tailscale" {
                return Ok(setupvibe::tailscale::verification(
                    &observed,
                    &Runner {
                        timeout: std::time::Duration::from_secs(cli.timeout),
                    },
                ));
            }
            Ok(json!(observed))
        }
    }
}

fn execute_components(
    cli: &Cli,
    catalog: &Catalog,
    ids: &[String],
    action: Action,
    values: &[String],
) -> Result<Value> {
    if action == Action::Update
        && !values.is_empty()
        && ids
            .iter()
            .any(|id| ["portainer", "postgresql", "redis", "mailpit"].contains(&id.as_str()))
    {
        return Err(AppError::unsupported(
            "Atualização preserva configuração de serviços; não aceita alterações de portas ou papel",
        ));
    }
    let mut plan = Plan::build(
        catalog,
        cli.edition,
        Platform::detect()?,
        ids,
        action,
        &options(values)?,
    )?;
    if let Some(version) = &cli.target_version {
        if version.is_empty()
            || version.len() > 100
            || !version.bytes().any(|b| b.is_ascii_digit())
            || !version
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b"._+-".contains(&b))
        {
            return Err(AppError::invalid(
                "Versão alvo exige versão literal ou prefixo com número; aliases como latest não são aceitos",
            ));
        }
        for step in &mut plan.steps {
            if ids.contains(&step.component) {
                step.target_version = Some(version.clone());
            }
        }
    }
    let directory = state::data_dir(cli.data_dir.as_deref())?;
    let runner = Runner {
        timeout: std::time::Duration::from_secs(cli.timeout),
    };
    if cli.dry_run {
        return executor::preview(catalog, &plan, &directory, &runner);
    }
    if !cli.yes {
        return Err(AppError::precondition(
            "Use --dry-run para revisar e --yes para autorizar a alteração",
        ));
    }
    executor::execute(catalog, &plan, &directory, &runner, cli.output)
}

/// Consulta executáveis existentes sem executar login ou instalação.
fn doctor(cli: &Cli) -> Result<Value> {
    let platform = Platform::detect()?;
    platform.validate_target(cli.edition)?;
    let runner = Runner {
        timeout: std::time::Duration::from_secs(cli.timeout),
    };
    let mut checks = Vec::new();
    let mut code = 0;
    for executable in ["git", "gh", "docker", "tailscale", "mise", "brew"] {
        if cli.edition == Edition::Server && ["mise", "brew"].contains(&executable) {
            continue;
        }
        let Some(path) = process::find_executable(executable) else {
            checks.push(json!({"command":executable,"available":false}));
            continue;
        };
        let args = if executable == "tailscale" {
            vec!["version".into()]
        } else {
            vec!["--version".into()]
        };
        match runner.run(&path.to_string_lossy(), &args, None) {
            Ok(output) => {
                if output.code != 0 {
                    code = 1;
                }
                checks.push(json!({"command":executable,"path":path,"available":true,"exit_code":output.code,"version":output.stdout.trim(),"diagnostic":output.stderr.trim(),"truncated":output.truncated}));
            }
            Err(error) => {
                code = error.code;
                checks.push(json!({"command":executable,"available":true,"error":error}));
                if code == 130 {
                    break;
                }
            }
        }
    }
    Ok(
        json!({"platform":platform,"checks":checks,"sqlite_version":rusqlite::version(),"exit_code":code}),
    )
}

fn output_from_args(args: &[std::ffi::OsString]) -> Output {
    let mut selected = Output::Text;
    for (index, arg) in args.iter().enumerate() {
        let text = arg.to_string_lossy();
        let value = if text == "--output" {
            args.get(index + 1)
                .map(|x| x.to_string_lossy().into_owned())
        } else {
            text.strip_prefix("--output=").map(str::to_owned)
        };
        match value.as_deref() {
            Some("json") => selected = Output::Json,
            Some("ndjson") => selected = Output::Ndjson,
            _ => {}
        }
    }
    selected
}

fn localize(mut command: clap::Command) -> clap::Command {
    command = command
        .disable_help_flag(true)
        .disable_help_subcommand(true)
        .subcommand_help_heading("Comandos")
        .help_template("{name} {version}\n{about}\n\nUso: {usage}\n\n{all-args}");
    if !command.get_arguments().any(|arg| arg.get_id() == "help") {
        command = command.arg(
            clap::Arg::new("help")
                .long("help")
                .short('h')
                .action(clap::ArgAction::Help)
                .help("Exibe a ajuda"),
        );
    }
    if command.get_version().is_some() {
        command = command.disable_version_flag(true).arg(
            clap::Arg::new("version")
                .long("version")
                .short('V')
                .action(clap::ArgAction::Version)
                .help("Exibe a versão"),
        );
    }
    command
        .mut_args(|arg| {
            let heading = if arg.get_index().is_some() {
                "Argumentos"
            } else {
                "Opções"
            };
            arg.help_heading(heading)
        })
        .mut_subcommands(localize)
}

fn main() {
    let args: Vec<_> = std::env::args_os().collect();
    let requested_output = output_from_args(&args);
    let command = localize(Cli::command());
    let matches = match command.try_get_matches_from(&args) {
        Ok(matches) => matches,
        Err(error) => {
            use clap::error::ErrorKind;
            let informational = matches!(
                error.kind(),
                ErrorKind::DisplayHelp | ErrorKind::DisplayVersion
            );
            if informational && requested_output == Output::Text {
                let _ = error.print();
                std::process::exit(0);
            }
            let result = if informational {
                Ok(json!({"help":error.to_string()}))
            } else {
                Err(AppError::invalid(error.to_string()))
            };
            std::process::exit(i32::from(requested_output.finish(result)));
        }
    };
    let cli = Cli::from_arg_matches(&matches).expect("argumentos validados pelo mesmo schema");
    if let Err(error) = process::install_signal_handler() {
        std::process::exit(i32::from(cli.output.finish(Err(error))));
    }
    if let Err(error) = cli
        .output
        .event("started", json!({"version":setupvibe::VERSION}))
    {
        std::process::exit(i32::from(cli.output.finish(Err(error))));
    }
    let code = cli.output.finish(run(&cli));
    std::process::exit(i32::from(code));
}

//! Shell de cinco faixas, foco visível e detalhes roláveis sem sobrepor rodapés.
use super::{App, TABS, theme::*};
use crate::{domain::Edition, error::Result};
use ratatui::{
    Frame,
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Modifier, Style},
    text::{Line, Span},
    widgets::{
        Block, Borders, Clear, List, ListItem, ListState, Paragraph, Scrollbar,
        ScrollbarOrientation, ScrollbarState, Wrap,
    },
};

fn block(title: impl Into<Line<'static>>, focus: bool) -> Block<'static> {
    Block::default()
        .title(title)
        .borders(Borders::ALL)
        .border_style(Style::default().fg(if focus { ACTIVE } else { BORDER }))
        .style(Style::default().bg(SURFACE).fg(TEXT))
}
fn area(width: u16, height: u16) -> Rect {
    Rect::new(1, 6, width.saturating_sub(2), height.saturating_sub(10))
}
fn pane(area: Rect) -> (Rect, Rect) {
    if area.width >= 100 {
        let columns = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([Constraint::Percentage(42), Constraint::Percentage(58)])
            .split(area);
        (columns[0], columns[1])
    } else {
        let rows = Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Percentage(48), Constraint::Percentage(52)])
            .split(area);
        (rows[0], rows[1])
    }
}
pub fn draw(frame: &mut Frame, app: &mut App) {
    let screen = frame.area();
    frame.render_widget(
        Block::default().style(Style::default().fg(TEXT).bg(BACKGROUND)),
        screen,
    );
    if screen.width < 50 || screen.height < 18 {
        frame.render_widget(
            Paragraph::new(
                "Terminal pequeno. Use pelo menos 50x18; recomendado 80x24.\n^Q Sair · Esc Voltar",
            )
            .wrap(Wrap { trim: false })
            .style(Style::default().fg(WARNING)),
            screen,
        );
        return;
    }
    frame.render_widget(
        Paragraph::new("SetupVibe: preparação e gestão de ambientes")
            .alignment(Alignment::Center)
            .style(Style::default().bg(SELECTED).fg(TEXT)),
        Rect::new(0, 0, screen.width, 1),
    );
    let edition = if app.edition == Edition::Desktop {
        "Desktop"
    } else {
        "Server"
    };
    frame.render_widget(
        Paragraph::new(app.directory.to_string_lossy()).block(block(
            format!(" {edition} · Diretório de dados · E edição "),
            app.focus == 0,
        )),
        Rect::new(1, 1, screen.width.saturating_sub(22), 3),
    );
    let hovering = app
        .hover
        .is_some_and(|(x, y)| x >= screen.width - 20 && (1..4).contains(&y));
    frame.render_widget(
        Paragraph::new(if app.job.is_some() {
            "Aguarde"
        } else {
            "Atualizar ^U"
        })
        .alignment(Alignment::Center)
        .block(block("", app.focus == 1))
        .style(
            Style::default()
                .fg(if app.focus == 1 || hovering {
                    ACTIVE_TEXT
                } else {
                    TEXT
                })
                .bg(if app.focus == 1 || hovering {
                    ACTIVE
                } else {
                    PRIMARY
                }),
        ),
        Rect::new(screen.width - 20, 1, 19, 3),
    );
    let mut x = 1;
    for (index, title) in TABS.iter().enumerate() {
        let width = title.chars().count() as u16 + 2;
        let active = app.tab == index;
        frame.render_widget(
            Paragraph::new(format!(" {title} ")).style(
                Style::default()
                    .fg(if active { ACTIVE_TEXT } else { MUTED })
                    .bg(if active { ACTIVE } else { BACKGROUND })
                    .add_modifier(if active {
                        Modifier::BOLD
                    } else {
                        Modifier::empty()
                    }),
            ),
            Rect::new(x, 4, width.min(screen.width.saturating_sub(x)), 1),
        );
        x += width;
    }
    frame.render_widget(
        Paragraph::new("─".repeat(screen.width as usize))
            .style(Style::default().fg(if app.focus == 2 { ACTIVE } else { BORDER })),
        Rect::new(0, 5, screen.width, 1),
    );
    let content = area(screen.width, screen.height);
    if app.review.is_some() || app.job.is_some() {
        let mut text = String::new();
        if let Some(args) = &app.review {
            text.push_str(&format!(
                "Alterações solicitadas: setupvibe {}\n\n",
                args.join(" ")
            ));
        }
        if app.job.is_some() {
            text.push_str(&format!("{}\n\n{}\n\n", app.status, app.log.join("\n")));
        }
        text.push_str(&app.details);
        details(
            frame,
            content,
            &text,
            &mut app.scroll,
            true,
            if app.review.is_some() {
                " Revisar alterações · Enter executar · Esc descartar "
            } else {
                " Acompanhamento · Ctrl+C cancelar "
            },
        );
    } else {
        match app.tab {
            0 => home(frame, content, app),
            1..=4 => {
                let (left, right) = pane(content);
                let items = app
                    .rows
                    .iter()
                    .map(|row| {
                        let id = row["id"].as_str().unwrap_or("");
                        let text = match app.tab {
                            1 => {
                                let installed = app.observations.iter().find(|o| o.component == id);
                                format!(
                                    "{} {}  {}",
                                    if app.selected.contains(id) {
                                        "[x]"
                                    } else {
                                        "[ ]"
                                    },
                                    row["name"].as_str().unwrap_or(id),
                                    if installed.is_some_and(|o| o.present) {
                                        "instalado"
                                    } else {
                                        "verificar"
                                    }
                                )
                            }
                            2 => format!(
                                "{}  {}",
                                row["name"].as_str().unwrap_or(id),
                                row["state"]
                                    .as_str()
                                    .or_else(|| row["mode"].as_str())
                                    .unwrap_or("serviço")
                            ),
                            3 => format!(
                                "{}: {}  {}",
                                row["scope"].as_str().unwrap_or(""),
                                row["resource"].as_str().unwrap_or(""),
                                if row["fresh"] == true && row["available"] == true {
                                    "atual"
                                } else {
                                    "indisponível/antiga"
                                }
                            ),
                            _ => format!(
                                "{}  {}",
                                row["started_at"].as_str().unwrap_or(""),
                                row["status"].as_str().unwrap_or("")
                            ),
                        };
                        ListItem::new(text)
                    })
                    .collect::<Vec<_>>();
                let mut state = ListState::default().with_selected(if items.is_empty() {
                    None
                } else {
                    Some(app.index)
                });
                let title = format!(" {} · {} itens ", TABS[app.tab], items.len());
                frame.render_stateful_widget(
                    List::new(items)
                        .block(block(title, app.focus == 3))
                        .highlight_style(Style::default().fg(TEXT).bg(SELECTED))
                        .highlight_symbol("› "),
                    left,
                    &mut state,
                );
                app.list_offset = state.offset();
                if app.rows.is_empty() {
                    frame.render_widget(
                        Paragraph::new("Sem registros nesta consulta.\n^U atualiza; : abre ações.")
                            .wrap(Wrap { trim: false })
                            .style(Style::default().fg(MUTED)),
                        Rect::new(
                            left.x + 1,
                            left.y + 1,
                            left.width.saturating_sub(2),
                            left.height.saturating_sub(2),
                        ),
                    );
                }
                let default = if app.tab == 1 {
                    app.rows.get(app.index).and_then(|r|r["id"].as_str()).and_then(|id|app.catalog.get(id).ok()).map(|c|format!("{}\n\nCategoria: {}\nDependências: {}\n\nEnter consulta instalação.\nEspaço seleciona. I instala; U atualiza; V verifica; D consulta atualizações; O configura opções.\n\nSelecionados: {}\nOpções: {}",c.name,app.catalog.categories.get(&c.category).unwrap_or(&c.category),if c.dependencies.is_empty(){"nenhuma".into()}else{c.dependencies.join(", ")},app.selected.len(),serde_json::to_string(&app.options).unwrap_or_default())).unwrap_or_default()
                } else {
                    "Enter abre detalhes da linha selecionada.\n\nTab muda o foco. Setas ou J/K percorrem a lista ou o painel.\n\nNenhuma alteração ocorre ao abrir esta aba.".into()
                };
                details(
                    frame,
                    right,
                    if app.details.is_empty() {
                        &default
                    } else {
                        &app.details
                    },
                    &mut app.scroll,
                    app.focus == 4,
                    " Detalhes ",
                );
            }
            _ => details(
                frame,
                content,
                &format!(
                    "SetupVibe {}\n\nEdição {edition}.\n\nPreparação e gerenciamento de ambientes Linux e macOS.\nRetenção de métricas: sete dias. O coletor é independente da TUI.\n\nAtalhos de abas:\n^G Home · ^A Aplicativos · ^T Serviços · ^R Métricas · ^O Histórico · ^B Sobre\n\n: abre operações avançadas com revisão.\nTailscale: somente instalação, verificação e atualização.\n\nDocumentação: docs/development/TUI.md",
                    crate::VERSION
                ),
                &mut app.scroll,
                app.focus == 4,
                " Sobre ",
            ),
        }
    }
    frame.render_widget(
        Paragraph::new(format!(" {}", app.status)).style(
            Style::default()
                .fg(if app.error { WARNING } else { MUTED })
                .bg(SURFACE),
        ),
        Rect::new(0, screen.height - 3, screen.width, 1),
    );
    let help = match app.tab {
        1 => "Espaço marcar · I instalar · U atualizar · V verificar · D versões · O opções",
        2 => "Enter detalhes · S iniciar · T parar · R reiniciar · L logs · W Swarm",
        3 => "Enter detalhes · H histórico · C coletor · : operações",
        _ => "Tab/Shift+Tab foco · Setas/J/K navegar · P preparar · : operações · E edição",
    };
    frame.render_widget(
        Paragraph::new(help).style(Style::default().fg(ACCENT)),
        Rect::new(0, screen.height - 2, screen.width, 1),
    );
    frame.render_widget(
        Paragraph::new("^Q Sair   Esc Voltar   ^U Atualizar   ^C Cancelar operação")
            .style(Style::default().fg(TEXT).bg(SURFACE)),
        Rect::new(0, screen.height - 1, screen.width, 1),
    );
    if let Some(edit) = &app.edit {
        let modal = Rect::new(3, screen.height / 2 - 3, screen.width - 6, 7);
        frame.render_widget(Clear, modal);
        let label = match edit.kind {
            "directory" => " Diretório absoluto ",
            "options" => " Opções em JSON · um componente ",
            _ => " Ação avançada · argumentos JSON ",
        };
        let max = (modal.width.saturating_sub(4)) as usize;
        let chars = edit.value.chars().collect::<Vec<_>>();
        let visible = chars[chars.len().saturating_sub(max)..]
            .iter()
            .collect::<String>();
        frame.render_widget(Paragraph::new(format!("{visible}\n\nEnter aplicar · Esc cancelar · Ctrl+U limpar\nEx.: [\"collector\",\"restart\"]")).block(block(label,true)).wrap(Wrap{trim:false}),modal);
    }
}
fn details(frame: &mut Frame, area: Rect, text: &str, scroll: &mut u16, focus: bool, title: &str) {
    let lines = text
        .lines()
        .map(|line| {
            line.chars()
                .count()
                .max(1)
                .div_ceil(area.width.saturating_sub(2).max(1) as usize)
        })
        .sum::<usize>();
    let viewport = area.height.saturating_sub(2) as usize;
    *scroll = (*scroll as usize).min(lines.saturating_sub(viewport)) as u16;
    frame.render_widget(
        Paragraph::new(text.to_owned())
            .wrap(Wrap { trim: false })
            .scroll((*scroll, 0))
            .block(block(title.to_owned(), focus)),
        area,
    );
    if lines <= viewport {
        return;
    }
    let mut state = ScrollbarState::new(lines)
        .position(*scroll as usize)
        .viewport_content_length(viewport);
    frame.render_stateful_widget(
        Scrollbar::default()
            .orientation(ScrollbarOrientation::VerticalRight)
            .style(Style::default().fg(BORDER)),
        area,
        &mut state,
    );
}
fn home(frame: &mut Frame, area: Rect, app: &mut App) {
    let columns = if area.width >= 100 { 4 } else { 2 };
    let card_height = if columns == 4 { 5 } else { 4 };
    let rows = if columns == 4 { 1 } else { 2 };
    let sample = &app.metrics["samples"][0];
    let current = sample["fresh"] == true && sample["available"] == true;
    let cpu = if current {
        sample["values"]["cpu_percent"]
            .as_f64()
            .map(|v| format!("{v:.1}%"))
            .unwrap_or_else(|| "Aquecendo".into())
    } else {
        "Sem amostra".into()
    };
    let memory = if current {
        sample["values"]["memory_used_bytes"]
            .as_u64()
            .map(|v| format!("{:.1} GiB", v as f64 / 1073741824.))
            .unwrap_or_else(|| "Indisponível".into())
    } else {
        "Sem amostra".into()
    };
    let values = [
        (
            app.catalog
                .components
                .iter()
                .filter(|c| c.editions.contains(&app.edition))
                .count()
                .to_string(),
            "Componentes na edição",
        ),
        (
            app.observations
                .iter()
                .filter(|o| {
                    o.present
                        && app
                            .catalog
                            .components
                            .iter()
                            .any(|c| c.id == o.component && c.editions.contains(&app.edition))
                })
                .count()
                .to_string(),
            "Instalações observadas",
        ),
        (cpu, "CPU do host"),
        (memory, "Memória usada"),
    ];
    for (index, (value, label)) in values.iter().enumerate() {
        let col = index as u16 % columns;
        let row = index as u16 / columns;
        let width = area.width / columns;
        let rect = Rect::new(
            area.x + col * width,
            area.y + row * card_height,
            width,
            card_height,
        );
        frame.render_widget(
            Paragraph::new(vec![
                Line::from(Span::styled(
                    value,
                    Style::default().add_modifier(Modifier::BOLD),
                )),
                Line::from(*label),
            ])
            .alignment(Alignment::Center)
            .block(block("", false))
            .style(Style::default().bg(RAISED).fg(TEXT)),
            rect,
        );
    }
    let top = area.y + rows * card_height;
    details(
        frame,
        Rect::new(
            area.x,
            top,
            area.width,
            area.height.saturating_sub(rows * card_height),
        ),
        "P prepara uma seleção inicial para revisar.\nAplicativos permite escolher, configurar, instalar, verificar e atualizar.\nServiços mostra containers, portas e operações disponíveis.\nMétricas consulta dados do coletor independente.\n\nAs instalações observadas são registros locais; Enter no aplicativo consulta o estado atual.\nNenhuma instalação é iniciada ao abrir a interface.",
        &mut app.scroll,
        app.focus == 4,
        " Ambiente ",
    );
}
pub fn click(app: &mut App, x: u16, y: u16, width: u16, height: u16) -> Result<()> {
    if app.edit.is_some() || app.job.is_some() {
        return Ok(());
    }
    if y == 4 {
        let mut left = 1;
        for (index, title) in TABS.iter().enumerate() {
            let right = left + title.chars().count() as u16 + 2;
            if x >= left && x < right {
                return app.tab(index);
            }
            left = right;
        }
    }
    if (1..4).contains(&y) {
        app.focus = if x >= width.saturating_sub(20) { 1 } else { 0 };
        return app.enter();
    }
    let (list, detail) = pane(area(width, height));
    if app.review.is_none() && (1..=4).contains(&app.tab) && list.contains((x, y).into()) {
        app.focus = 3;
        let index = (app.list_offset + y.saturating_sub(list.y + 1) as usize)
            .min(app.rows.len().saturating_sub(1));
        if app.index != index {
            app.details.clear();
            app.scroll = 0;
        }
        app.index = index;
    } else if detail.contains((x, y).into()) {
        app.focus = 4;
    }
    Ok(())
}

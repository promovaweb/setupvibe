//! Tokens canônicos do TUI-DESIGN-SYSTEM.md do Hub; fonte monospace do terminal.
use ratatui::style::Color;
use serde_json::{Value, json};
pub const BACKGROUND: Color = Color::Rgb(0, 10, 14);
pub const SURFACE: Color = Color::Rgb(0, 17, 23);
pub const RAISED: Color = Color::Rgb(3, 33, 42);
pub const TEXT: Color = Color::Rgb(242, 248, 249);
pub const MUTED: Color = Color::Rgb(178, 198, 206);
pub const BORDER: Color = Color::Rgb(95, 125, 140);
pub const ACCENT: Color = Color::Rgb(196, 181, 253);
pub const ACTIVE: Color = Color::Rgb(94, 237, 225);
pub const ACTIVE_TEXT: Color = SURFACE;
pub const SELECTED: Color = Color::Rgb(109, 40, 217);
pub const PRIMARY: Color = Color::Rgb(21, 98, 106);
pub const WARNING: Color = Color::Rgb(252, 211, 77);
pub fn hex(color: Color) -> String {
    match color {
        Color::Rgb(r, g, b) => format!("#{r:02X}{g:02X}{b:02X}"),
        _ => "inherit".into(),
    }
}
pub fn tokens() -> Value {
    json!({"background":hex(BACKGROUND),"surface":hex(SURFACE),"surfaceRaised":hex(RAISED),"text":hex(TEXT),"textMuted":hex(MUTED),"border":hex(BORDER),"accent":hex(ACCENT),"activeBackground":hex(ACTIVE),"activeText":hex(ACTIVE_TEXT),"selectedBackground":hex(SELECTED),"selectedText":hex(TEXT),"primaryBackground":hex(PRIMARY),"primaryText":hex(TEXT),"focusBackground":hex(ACTIVE),"focusText":hex(ACTIVE_TEXT),"warning":hex(WARNING)})
}

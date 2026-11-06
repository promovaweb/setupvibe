package main

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

var spinnerFrames = []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}

func (m Model) View() string {
	th := m.activeTheme()
	if m.width < minWidth || m.height < minHeight {
		return th.danger.Render(fmt.Sprintf(
			"Terminal too small (%dx%d). Resize to at least %dx%d.",
			m.width, m.height, minWidth, minHeight))
	}

	body := box(th, m.width, m.height-1).Render(m.content())
	bar := m.statusBar(th)
	return lipgloss.JoinVertical(lipgloss.Left, body, bar)
}

func box(th theme, width, height int) lipgloss.Style {
	return th.border.
		BorderStyle(lipgloss.RoundedBorder()).
		Padding(1, 2).
		Width(width - 4).
		Height(height - 4)
}

func (m Model) content() string {
	if m.confirm != nil {
		return m.confirmModal()
	}
	if m.edit != nil {
		return m.editModal()
	}
	switch m.view {
	case viewTables:
		return m.tablesView()
	case viewData:
		return m.gridView(m.data, true)
	case viewResults:
		return m.gridView(m.results, false)
	case viewSchema:
		return m.schemaView()
	case viewQuery:
		return m.queryView()
	case viewLog:
		return m.logView()
	case viewHelp:
		return m.helpView()
	}
	return ""
}

// --- Tables view ---

func (m Model) tablesView() string {
	th := m.activeTheme()
	var b strings.Builder
	b.WriteString(th.accent.Render("TABLES") + "\n\n")
	for i, t := range m.st.tables {
		cur, style := "  ", th.base
		if i == m.tCursor {
			cur, style = th.accent.Render("▸ "), th.selected
		}
		count := fmt.Sprintf("%d rows", len(t.rows))
		if len(t.rows) == 0 {
			count = th.muted.Render("empty")
		}
		line := fmt.Sprintf("%s%-14s %2d cols   %s", cur, style.Render(t.name), len(t.columns), count)
		b.WriteString(line + "\n")
	}
	b.WriteString("\n" + th.muted.Render("enter: open    s: schema    r: refresh    ?: help"))
	return b.String()
}

// --- Data / results grid ---

func (m Model) gridView(g *gridState, isData bool) string {
	th := m.activeTheme()
	if g.t == nil {
		return th.muted.Render("no table selected — esc to go back")
	}

	budget := m.width - 8 // padding(4) + row prefix(2) + margin(2)
	cols := m.visibleColumns(g, budget)

	var b strings.Builder
	b.WriteString(m.gridHeader(g, th) + "\n")
	b.WriteString(m.columnHeader(g, cols, th) + "\n")
	b.WriteString(th.muted.Render(m.runeLine("─", budget)) + "\n")

	if g.loading && len(g.order) == 0 {
		b.WriteString("\n  " + th.muted.Render(fmt.Sprintf("loading %s… %s", g.t.name, spinnerFrames[m.spinner])) + "\n")
	} else if len(g.order) == 0 {
		b.WriteString(m.emptyGrid(g, th))
	} else {
		rows, _, _ := paginate(g.order, g.page, m.pageSize())
		for i, base := range rows {
			b.WriteString(m.gridRow(g, cols, base, i == g.cursor, th) + "\n")
		}
	}

	b.WriteString("\n" + m.gridFooter(g, isData, th))
	return b.String()
}

func (m Model) gridHeader(g *gridState, th theme) string {
	var chips strings.Builder
	for _, f := range g.filters {
		chips.WriteString(th.success.Render(f+" ×") + "  ")
	}
	count := fmt.Sprintf("%d of %d rows", len(g.order), len(g.t.rows))
	left := th.accent.Render(strings.ToUpper(g.title))
	right := th.muted.Render(count)
	gap := m.width - 8 - lipgloss.Width(left) - lipgloss.Width(right) - lipgloss.Width(chips.String())
	if gap < 1 {
		gap = 1
	}
	return left + "  " + chips.String() + strings.Repeat(" ", gap) + right
}

type visibleCol struct {
	ix    int
	width int
}

func (m Model) visibleColumns(g *gridState, budget int) []visibleCol {
	var cols []visibleCol
	used := 0
	truncated := false
	for i, c := range g.t.columns {
		w := len(c.name)
		for _, row := range g.t.rows {
			if l := len([]rune(row[i])); l > w {
				w = l
			}
		}
		if w > 20 {
			w = 20
		}
		if w < 4 {
			w = 4
		}
		if used+w+2 > budget {
			truncated = true
			break
		}
		cols = append(cols, visibleCol{ix: i, width: w})
		used += w + 2
	}
	if truncated && len(cols) > 0 {
		last := &cols[len(cols)-1]
		last.width--
	}
	return cols
}

func (m Model) columnHeader(g *gridState, cols []visibleCol, th theme) string {
	var parts []string
	for _, vc := range cols {
		c := g.t.columns[vc.ix]
		name := c.name
		if vc.ix == g.sortCol {
			if g.sortDesc {
				name += " ▼"
			} else {
				name += " ▲"
			}
		}
		num := fmt.Sprintf("%d", (vc.ix+1)%10)
		cell := num + " " + name
		if vc.ix == g.colCursor {
			cell = th.accent.Render(cell)
		} else {
			cell = th.muted.Render(cell)
		}
		parts = append(parts, m.fitCell(cell, vc.width, c.kind))
	}
	return "  " + strings.Join(parts, "  ")
}

func (m Model) gridRow(g *gridState, cols []visibleCol, base int, selected bool, th theme) string {
	row := g.t.rows[base]
	prefix, style := "  ", th.base
	if selected {
		prefix, style = th.accent.Render("▸ "), th.selected
	}
	var parts []string
	for _, vc := range cols {
		cell := style.Render(row[vc.ix])
		parts = append(parts, m.fitCell(cell, vc.width, g.t.columns[vc.ix].kind))
	}
	return prefix + strings.Join(parts, "  ")
}

// fitCell pads or truncates a (possibly styled) cell to the column width.
func (m Model) fitCell(cell string, width int, kind columnType) string {
	pad := width - lipgloss.Width(cell)
	if pad > 0 {
		if kind == typeInt || kind == typeMoney {
			return strings.Repeat(" ", pad) + cell
		}
		return cell + strings.Repeat(" ", pad)
	}
	return cell
}

func (m Model) emptyGrid(g *gridState, th theme) string {
	if len(g.filters) > 0 {
		return "\n  " + th.base.Render("no rows match the active filters") +
			"\n  " + th.muted.Render("ctrl+d removes the last term, esc leaves filter mode") + "\n\n"
	}
	return "\n  " + th.base.Render(g.t.name+" has no rows") +
		"\n  " + th.muted.Render("d duplicates nearby rows; esc goes back to tables") + "\n\n"
}

func (m Model) gridFooter(g *gridState, isData bool, th theme) string {
	rows, pages, page := paginate(g.order, g.page, m.pageSize())
	first := 0
	if len(rows) > 0 {
		first = page*m.pageSize() + 1
	}
	last := page * m.pageSize()
	pos := fmt.Sprintf("rows %d-%d of %d", first, last+len(rows), len(g.order))
	sortNote := ""
	if g.sortCol >= 0 {
		dir := "asc"
		if g.sortDesc {
			dir = "desc"
		}
		sortNote = "   sort " + g.t.columns[g.sortCol].name + " " + dir
	}
	hints := "1-9 sort  ←→ col  e edit  x del  ctrl+f filter  s schema"
	if !isData {
		hints = "1-9 sort  ←→ col  c copy  s schema  esc back"
	}
	line1 := th.muted.Render(fmt.Sprintf("%s   page %d/%d%s", pos, page+1, pages, sortNote))
	line2 := th.muted.Render(hints)
	return line1 + "\n" + line2
}

// --- Schema view ---

func (m Model) schemaView() string {
	th := m.activeTheme()
	t := m.st.find(m.schemaName)
	if t == nil {
		return th.muted.Render("no schema selected")
	}
	var b strings.Builder
	b.WriteString(th.accent.Render("SCHEMA — "+t.name) + th.muted.Render(fmt.Sprintf("   %d rows", len(t.rows))) + "\n\n")
	for i, c := range t.columns {
		kind := map[columnType]string{typeInt: "integer", typeString: "text", typeMoney: "decimal", typeTime: "date"}[c.kind]
		marker := "  "
		if m.data.t == t && i == m.data.colCursor {
			marker = th.accent.Render("▸ ")
		}
		b.WriteString(fmt.Sprintf("%s%-14s %s\n", marker, th.base.Render(c.name), th.muted.Render(kind)))
	}
	b.WriteString("\n" + th.muted.Render("esc: back    r: refresh    /: query"))
	return b.String()
}

// --- Query view ---

func (m Model) queryView() string {
	th := m.activeTheme()
	var b strings.Builder
	b.WriteString(th.accent.Render("QUERY") + th.muted.Render("   terms are AND filters; 'a + b' adds two\n\n"))
	cur := "▌"
	if m.spinner%2 == 0 {
		cur = "▌"
	} else {
		cur = ""
	}
	b.WriteString("  > " + th.base.Render(m.queryInput) + cur + "\n")
	if len(m.results.order) > 0 && m.results.t != nil {
		b.WriteString("\n  " + th.muted.Render(fmt.Sprintf("last results: %d of %d rows — esc back to results", len(m.results.order), len(m.results.t.rows))) + "\n")
	}
	b.WriteString("\n  " + th.muted.Render("history:"))
	n := len(m.qHist.entries)
	start := n - 3
	if start < 0 {
		start = 0
	}
	for i := n - 1; i >= start; i-- {
		marker := "  "
		if m.qHistIx == i {
			marker = th.accent.Render("▸ ")
		}
		b.WriteString("\n" + marker + th.base.Render(m.qHist.entries[i]))
	}
	b.WriteString("\n\n  " + th.muted.Render("enter: run    ↑↓: history    esc: back"))
	return b.String()
}

// --- Log view ---

func (m Model) logView() string {
	th := m.activeTheme()
	var b strings.Builder
	b.WriteString(th.accent.Render("QUERY LOG") + th.muted.Render(fmt.Sprintf("   %d entries\n\n", len(m.log))))
	if len(m.log) == 0 {
		b.WriteString(th.muted.Render("  no activity yet — queries, filters and edits land here") + "\n")
	}
	for i, e := range m.log {
		cur, style := "  ", th.base
		if i == m.logCur {
			cur, style = th.accent.Render("▸ "), th.selected
		}
		b.WriteString(cur + style.Render(e) + "\n")
	}
	b.WriteString("\n" + th.muted.Render("enter: inspect    esc: back"))
	return b.String()
}

// --- Help view ---

func (m Model) helpView() string {
	th := m.activeTheme()
	lines := []string{
		"GLOBAL",
		"  q quit   T theme   Q query log   ? help   esc back   ctrl+c force quit",
		"",
		"TABLES",
		"  j/k navigate   enter open data   s schema   r refresh",
		"",
		"DATA / RESULTS",
		"  j/k rows   h/l columns   1-9 sort column (toggle ▲▼)",
		"  [ ] pages   { } first/last   ctrl+f live filter   ctrl+d drop filter",
		"  e edit cell   x delete row (confirm)   d duplicate row",
		"  c copy cell   C copy row   / query   r reload   s schema",
		"",
		"QUERY",
		"  enter run   ↑↓ history   esc back",
	}
	var b strings.Builder
	b.WriteString(th.accent.Render("HELP") + "\n\n")
	for _, l := range lines {
		b.WriteString(th.base.Render("  "+l) + "\n")
	}
	b.WriteString("\n  " + th.muted.Render("esc or ? closes help"))
	return b.String()
}

// --- Modals ---

func (m Model) confirmModal() string {
	th := m.activeTheme()
	var b strings.Builder
	b.WriteString(th.danger.Render("Delete this row?") + "\n\n")
	b.WriteString("  " + th.base.Render(m.confirm.detail) + "\n\n")
	b.WriteString(th.muted.Render("  y confirm      n / esc cancel"))
	return b.String()
}

func (m Model) editModal() string {
	th := m.activeTheme()
	g := m.activeGrid()
	if g == nil || g.t == nil {
		return ""
	}
	var b strings.Builder
	b.WriteString(th.accent.Render("Edit "+g.t.columns[m.edit.col].name) + "\n\n")
	b.WriteString("  [" + th.base.Render(m.edit.buf) + "▌]\n\n")
	b.WriteString(th.muted.Render("  enter save      esc cancel"))
	return b.String()
}

// --- Status bar: left state, center context, right hints ---

func (m Model) statusBar(th theme) string {
	g := m.activeGrid()
	left := th.success.Render("● ready")
	ctx := "tables"
	if g != nil && g.t != nil {
		if g.loading {
			left = th.danger.Render("● " + spinnerFrames[m.spinner] + " loading")
		}
		ctx = g.t.name
		if len(g.filters) > 0 {
			ctx += fmt.Sprintf("  %d filter(s)", len(g.filters))
		}
	} else if m.view == viewTables {
		ctx = fmt.Sprintf("%d tables", len(m.st.tables))
	}
	if m.status != "" {
		ctx = m.status
	}
	hints := "?: help  T theme  q quit"
	if m.view == viewData || m.view == viewResults {
		hints = "j/k rows  1-9 sort  ctrl+f filter  ?: help"
	}

	bar := lipgloss.NewStyle().Width(m.width).Background(th.barBg).Padding(0, 1)
	sep := th.muted.Render(" │ ")
	line := left + sep + ctx + sep + hints
	mid := m.width - lipgloss.Width(left) - lipgloss.Width(ctx) - lipgloss.Width(hints) - lipgloss.Width(sep)*2 - 2
	if mid < 1 {
		mid = 1
	}
	line = left + sep + ctx + strings.Repeat(" ", mid) + hints
	return bar.Render(line)
}

// runeLine repeats r n times.
func (m Model) runeLine(r string, n int) string {
	if n < 0 {
		n = 0
	}
	return strings.Repeat(r, n)
}

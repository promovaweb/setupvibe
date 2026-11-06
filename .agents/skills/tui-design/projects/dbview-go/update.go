package main

import (
	tea "github.com/charmbracelet/bubbletea"
)

// handleKey routes keys by mode: modal > edit > input > view. Global keys
// are only reachable outside input modes, so typing 'q' into a filter never
// quits the app.
func (m *Model) handleKey(msg tea.KeyMsg) tea.Cmd {
	key := msg.String()

	if m.confirm != nil {
		return m.handleConfirm(key)
	}
	if m.edit != nil {
		return m.handleEdit(msg, key)
	}
	if m.filterMode {
		return m.handleFilterInput(msg, key)
	}
	if m.view == viewQuery {
		return m.handleQueryInput(msg, key)
	}

	// Global keys — identical in every non-input view.
	switch key {
	case "q":
		return tea.Quit
	case "T":
		m.cycleTheme()
		return nil
	case "?":
		if m.view == viewHelp {
			m.popView()
		} else {
			m.pushView(viewHelp)
		}
		return nil
	case "Q":
		m.logCur = 0
		m.pushView(viewLog)
		return nil
	}

	switch m.view {
	case viewTables:
		return m.handleTables(key)
	case viewData:
		return m.handleGrid(m.data, key)
	case viewResults:
		return m.handleGrid(m.results, key)
	case viewSchema:
		return m.handleSchema(key)
	case viewLog:
		return m.handleLog(key)
	case viewHelp:
		m.popView()
		return nil
	}
	return nil
}

// --- Modal: destructive actions must be confirmed with an exact target ---

func (m *Model) handleConfirm(key string) tea.Cmd {
	defer func() { m.confirm = nil }()
	if key == "y" || key == "Y" {
		if m.confirm.kind == "delete" {
			base := m.confirm.baseRow
			m.deleteConfirmed(base)
		}
	}
	return nil
}

// --- Inline cell edit ---

func (m *Model) startEdit() {
	g := m.activeGrid()
	base := m.selectedBaseRow(g)
	if base < 0 {
		return
	}
	m.edit = &editState{col: g.colCursor, buf: g.t.rows[base][g.colCursor]}
}

func (m *Model) handleEdit(msg tea.KeyMsg, key string) tea.Cmd {
	switch key {
	case "esc":
		m.edit = nil
	case "enter":
		g := m.activeGrid()
		base := m.selectedBaseRow(g)
		if base >= 0 && g != nil {
			col := m.edit.col
			old := g.t.rows[base][col]
			g.t.rows[base][col] = m.edit.buf
			m.recompute(g)
			m.logf("edit %s.%s -> %q", g.t.name, g.t.columns[col].name, m.edit.buf)
			m.status = "updated " + g.t.columns[col].name + ": " + old + " -> " + m.edit.buf
		}
		m.edit = nil
	case "backspace", "ctrl+h":
		r := []rune(m.edit.buf)
		if len(r) > 0 {
			m.edit.buf = string(r[:len(r)-1])
		}
	case "ctrl+u":
		m.edit.buf = ""
	default:
		if len(msg.Runes) > 0 {
			m.edit.buf += string(msg.Runes)
		}
	}
	return nil
}

// --- Filter input (live multi-term AND filtering) ---

func (m *Model) handleFilterInput(msg tea.KeyMsg, key string) tea.Cmd {
	switch key {
	case "esc":
		m.filterMode = false
		m.filterInput = ""
	case "enter":
		terms := splitTerms(m.filterInput)
		g := m.activeGrid()
		if g != nil && len(terms) > 0 {
			g.filters = append(g.filters, terms...)
			m.recompute(g)
			for _, t := range terms {
				m.fHist.push(t)
			}
			m.logf("filter +%d terms (%d total)", len(terms), len(g.filters))
		}
		m.filterMode = false
		m.filterInput = ""
		m.fHistIx = -1
	case "up":
		m.walkHist(m.fHist, &m.fHistIx, &m.fHistDraft, &m.filterInput, -1)
	case "down":
		m.walkHist(m.fHist, &m.fHistIx, &m.fHistDraft, &m.filterInput, 1)
	case "backspace", "ctrl+h":
		r := []rune(m.filterInput)
		if len(r) > 0 {
			m.filterInput = string(r[:len(r)-1])
		} else {
			m.removeLastFilter()
		}
	case "ctrl+d", "ctrl+w":
		m.removeLastFilter()
	default:
		if len(msg.Runes) > 0 {
			m.filterInput += string(msg.Runes)
			m.applyLiveFilter()
		}
	}
	return nil
}

// applyLiveFilter previews committed+typed terms on every keystroke.
func (m *Model) applyLiveFilter() {
	g := m.activeGrid()
	if g == nil || g.t == nil {
		return
	}
	live := splitTerms(m.filterInput)
	all := append(append([]string{}, g.filters...), live...)
	if len(all) == 0 {
		m.recompute(g)
		return
	}
	if len(g.filters) == 0 && len(live) == 0 {
		m.recompute(g)
		return
	}
	g.order = filterIndices(g.t, all)
	g.page, g.cursor = 0, 0
	m.clamp(g)
}

// --- Query input with history ---

func (m *Model) handleQueryInput(msg tea.KeyMsg, key string) tea.Cmd {
	switch key {
	case "esc":
		m.qHistIx = -1
		m.popView()
	case "enter":
		return m.runQuery()
	case "up":
		m.walkHist(m.qHist, &m.qHistIx, &m.qHistDraft, &m.queryInput, -1)
	case "down":
		m.walkHist(m.qHist, &m.qHistIx, &m.qHistDraft, &m.queryInput, 1)
	case "backspace", "ctrl+h":
		r := []rune(m.queryInput)
		if len(r) > 0 {
			m.queryInput = string(r[:len(r)-1])
		}
	default:
		if len(msg.Runes) > 0 {
			m.queryInput += string(msg.Runes)
		}
	}
	return nil
}

// walkHist navigates a history ring; the draft restores unsent input.
func (m *Model) walkHist(h *history, ix *int, draft *string, target *string, dir int) {
	n := len(h.entries)
	if n == 0 {
		return
	}
	if *ix == -1 {
		if dir >= 0 {
			return
		}
		*draft = *target
		*ix = n - 1
	} else {
		*ix += dir
		if *ix >= n {
			*ix = -1
			*target = *draft
			return
		}
		if *ix < 0 {
			*ix = 0
		}
	}
	*target = h.entries[*ix]
}

// --- View-local keys ---

func (m *Model) handleTables(key string) tea.Cmd {
	switch key {
	case "up", "k":
		if m.tCursor > 0 {
			m.tCursor--
		}
	case "down", "j":
		if m.tCursor < len(m.st.tables)-1 {
			m.tCursor++
		}
	case "enter":
		if m.tCursor < len(m.st.tables) {
			return m.openTable(m.st.tables[m.tCursor].name)
		}
	case "s":
		if m.tCursor < len(m.st.tables) {
			m.schemaName = m.st.tables[m.tCursor].name
			m.pushView(viewSchema)
		}
	case "r":
		m.status = "tables refreshed"
	}
	return nil
}

func (m *Model) handleSchema(key string) tea.Cmd {
	switch key {
	case "esc", "s":
		m.popView()
	case "r":
		m.status = "schema refreshed"
	case "/":
		m.pushView(viewQuery)
	}
	return nil
}

func (m *Model) handleLog(key string) tea.Cmd {
	switch key {
	case "up", "k":
		if m.logCur > 0 {
			m.logCur--
		}
	case "down", "j":
		if m.logCur < len(m.log)-1 {
			m.logCur++
		}
	case "enter":
		if m.logCur < len(m.log) {
			m.status = "entry: " + m.log[m.logCur]
		}
	case "esc", "Q":
		m.popView()
	}
	return nil
}

// handleGrid covers the data and results views.
func (m *Model) handleGrid(g *gridState, key string) tea.Cmd {
	switch key {
	case "esc":
		m.popView()
		return nil
	case "s":
		if g.t != nil {
			m.schemaName = g.t.name
			m.pushView(viewSchema)
		}
		return nil
	case "r":
		return m.reload(g)
	case "/":
		m.pushView(viewQuery)
		return nil
	case "ctrl+f":
		m.filterMode = true
		m.filterInput = ""
		m.fHistIx = -1
		return nil
	case "ctrl+d":
		m.removeLastFilter()
		return nil
	case "up", "k":
		m.moveCursor(g, -1)
		return nil
	case "down", "j":
		m.moveCursor(g, 1)
		return nil
	case "left", "h":
		if g.colCursor > 0 {
			g.colCursor--
		}
		return nil
	case "right", "l":
		if g.t != nil && g.colCursor < len(g.t.columns)-1 {
			g.colCursor++
		}
		return nil
	case "[":
		g.page--
		m.clamp(g)
		return nil
	case "]":
		g.page++
		m.clamp(g)
		return nil
	case "{":
		g.page = 0
		return nil
	case "}":
		_, pages, _ := paginate(g.order, 0, m.pageSize())
		g.page = pages - 1
		m.clamp(g)
		return nil
	case "e":
		m.startEdit()
		return nil
	case "x":
		m.requestDelete()
		return nil
	case "d":
		m.duplicateCurrentRow()
		return nil
	case "c":
		m.copySelection(false)
		return nil
	case "C":
		m.copySelection(true)
		return nil
	}
	// Number keys 1-9 sort by visible column, toggling direction.
	if len(key) == 1 && key[0] >= '1' && key[0] <= '9' {
		n := int(key[0]-'0') - 1
		if g.t != nil && n < len(g.t.columns) {
			if g.sortCol == n {
				g.sortDesc = !g.sortDesc
			} else {
				g.sortCol = n
				g.sortDesc = false
			}
			m.recompute(g)
			dir := "asc"
			if g.sortDesc {
				dir = "desc"
			}
			m.status = "sort: " + g.t.columns[n].name + " " + dir
		}
	}
	return nil
}

func (m *Model) moveCursor(g *gridState, delta int) {
	rows, _, _ := paginate(g.order, g.page, m.pageSize())
	if len(rows) == 0 {
		return
	}
	g.cursor += delta
	if g.cursor < 0 {
		if g.page > 0 {
			g.page--
			g.cursor = m.pageSize() - 1
			rows, _, _ = paginate(g.order, g.page, m.pageSize())
			if g.cursor >= len(rows) {
				g.cursor = len(rows) - 1
			}
		} else {
			g.cursor = 0
		}
	} else if g.cursor >= len(rows) {
		if g.page < (len(g.order)-1)/m.pageSize() {
			g.page++
			g.cursor = 0
		} else {
			g.cursor = len(rows) - 1
		}
	}
}

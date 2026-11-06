package main

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
)

const (
	minWidth  = 70
	minHeight = 20
)

type view int

const (
	viewTables view = iota
	viewData
	viewSchema
	viewQuery
	viewResults
	viewLog
	viewHelp
)

type gridState struct {
	title     string
	t         *table
	order     []int
	filters   []string
	sortCol   int // -1 = unsorted
	sortDesc  bool
	page      int
	cursor    int
	colCursor int
	loading   bool
}

type confirmState struct {
	kind    string // "delete"
	baseRow int
	detail  string
}

type editState struct {
	col int
	buf string
}

type Model struct {
	width  int
	height int

	st      *store
	view    view
	prev    view
	themeIx int

	tCursor    int
	schemaName string

	data    *gridState
	results *gridState

	edit *editState

	filterMode  bool
	filterInput string
	fHist       *history
	fHistIx     int
	fHistDraft  string

	queryInput string
	qHist      *history
	qHistIx    int
	qHistDraft string

	log     []string
	logCur  int
	status  string
	confirm *confirmState
	spinner int
	tickGen int
}

func newModel() Model {
	return Model{
		st:      newStore(),
		view:    viewTables,
		fHist:   newHistory(50),
		qHist:   newHistory(100),
		fHistIx: -1,
		qHistIx: -1,
		data:    &gridState{sortCol: -1},
		results: &gridState{sortCol: -1},
	}
}

// --- Messages ---

type loadDoneMsg struct {
	gen int
	g   *gridState
}

type spinnerTickMsg struct{ gen int }

// --- Model interface ---

func (m Model) Init() tea.Cmd { return nil }

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width, m.height = msg.Width, msg.Height
		m.clamp(m.data)
		m.clamp(m.results)
		return m, nil

	case loadDoneMsg:
		if msg.gen == m.tickGen {
			msg.g.loading = false
			m.recompute(msg.g)
			m.status = fmt.Sprintf("loaded %s: %d rows", msg.g.title, len(msg.g.order))
		}
		return m, nil

	case spinnerTickMsg:
		g := m.activeGrid()
		if msg.gen == m.tickGen && g != nil && g.loading {
			m.spinner = (m.spinner + 1) % len(spinnerFrames)
			return m, spinnerCmd(m.tickGen)
		}
		return m, nil

	case tea.KeyMsg:
		if msg.String() == "ctrl+c" {
			return m, tea.Quit
		}
		cmd := m.handleKey(msg)
		if m.status != "" {
			m.status = ""
		}
		return m, cmd
	}
	return m, nil
}

// --- Layout helpers ---

// pageSize is derived from the viewport so pagination survives resizes.
// Chrome: header(1) + col header(1) + separator(1) + footer(2) in-box,
// padding(2), borders(2), status bar(1) — 10 rows in total.
func (m Model) pageSize() int {
	p := m.height - 10
	if p < 1 {
		p = 1
	}
	return p
}

func (m Model) activeTheme() theme { return themeAt(m.themeIx) }

func (m Model) activeGrid() *gridState {
	switch m.view {
	case viewData:
		return m.data
	case viewResults:
		return m.results
	default:
		return nil
	}
}

// clamp keeps page/cursor/colCursor inside bounds after any mutation.
func (m Model) clamp(g *gridState) {
	if g.t == nil {
		return
	}
	_, pages, page := paginate(g.order, g.page, m.pageSize())
	g.page = page
	rows, _, _ := paginate(g.order, g.page, m.pageSize())
	if g.cursor >= len(rows) {
		g.cursor = len(rows) - 1
	}
	if g.cursor < 0 {
		g.cursor = 0
	}
	if g.colCursor >= len(g.t.columns) {
		g.colCursor = len(g.t.columns) - 1
	}
	if g.colCursor < 0 {
		g.colCursor = 0
	}
	_ = pages
}

// recompute re-derives display order: filter over the base rows, then sort.
func (m Model) recompute(g *gridState) {
	if g.t == nil {
		g.order = nil
		return
	}
	if len(g.filters) == 0 {
		g.order = make([]int, len(g.t.rows))
		for i := range g.t.rows {
			g.order[i] = i
		}
	} else {
		g.order = filterIndices(g.t, g.filters)
	}
	sortIndices(g.t, g.order, g.sortCol, g.sortDesc)
	m.clamp(g)
}

// --- Actions ---

func (m *Model) logf(format string, args ...any) {
	m.log = append([]string{time.Now().Format("15:04:05") + "  " + fmt.Sprintf(format, args...)}, m.log...)
	if len(m.log) > 100 {
		m.log = m.log[:100]
	}
}

func (m *Model) openTable(name string) tea.Cmd {
	t := m.st.find(name)
	if t == nil {
		return nil
	}
	g := m.data
	g.t = t
	g.title = t.name
	g.filters = nil
	g.sortCol = -1
	g.sortDesc = false
	g.page, g.cursor, g.colCursor = 0, 0, 0
	g.order = nil
	g.loading = true
	m.logf("open table %s (%d rows)", t.name, len(t.rows))
	m.view = viewData
	return m.beginLoad(g)
}

func (m *Model) beginLoad(g *gridState) tea.Cmd {
	m.tickGen++
	gen := m.tickGen
	return tea.Batch(
		tea.Tick(280*time.Millisecond, func(time.Time) tea.Msg {
			return loadDoneMsg{gen: gen, g: g}
		}),
		spinnerCmd(gen),
	)
}

func spinnerCmd(gen int) tea.Cmd {
	return tea.Tick(90*time.Millisecond, func(time.Time) tea.Msg {
		return spinnerTickMsg{gen: gen}
	})
}

func (m *Model) reload(g *gridState) tea.Cmd {
	if g.t == nil {
		return nil
	}
	g.loading = true
	m.logf("reload %s", g.t.name)
	return m.beginLoad(g)
}

func (m *Model) runQuery() tea.Cmd {
	q := strings.TrimSpace(m.queryInput)
	if q == "" {
		m.status = "empty query"
		return nil
	}
	m.qHist.push(q)
	m.qHistIx = -1
	m.logf("query: %s", q)

	src := m.data.t
	if src == nil {
		src = m.st.find("orders")
	}
	g := m.results
	g.t = src
	g.title = "results: " + q
	g.filters = splitTerms(q)
	g.sortCol = -1
	g.sortDesc = false
	g.page, g.cursor, g.colCursor = 0, 0, 0
	g.loading = true
	m.recompute(g)
	m.view = viewResults
	return m.beginLoad(g)
}

func (m *Model) selectedBaseRow(g *gridState) int {
	if g == nil || g.t == nil {
		return -1
	}
	rows, _, _ := paginate(g.order, g.page, m.pageSize())
	if len(rows) == 0 || g.cursor >= len(rows) {
		return -1
	}
	return rows[g.cursor]
}

func (m *Model) requestDelete() {
	g := m.activeGrid()
	base := m.selectedBaseRow(g)
	if base < 0 {
		return
	}
	row := g.t.rows[base]
	m.confirm = &confirmState{
		kind:    "delete",
		baseRow: base,
		detail:  fmt.Sprintf("id=%s  %s", row[0], strings.Join(row[1:min(3, len(row))], "  ")),
	}
}

func (m *Model) deleteConfirmed(baseRow int) {
	g := m.activeGrid()
	if g == nil || g.t == nil || baseRow >= len(g.t.rows) {
		return
	}
	t := g.t
	deleted := t.rows[baseRow][0]
	t.rows = append(t.rows[:baseRow], t.rows[baseRow+1:]...)
	m.logf("delete row id=%s from %s", deleted, t.name)
	m.recompute(g)
	if m.results.t == t {
		m.recompute(m.results)
	}
	m.status = fmt.Sprintf("deleted row id=%s from %s", deleted, t.name)
}

func (m *Model) duplicateCurrentRow() {
	g := m.activeGrid()
	base := m.selectedBaseRow(g)
	if base < 0 {
		return
	}
	t := g.t
	dup := append([]string(nil), t.rows[base]...)
	dup[0] = nextID(t)
	t.rows = append(t.rows[:base+1], append([][]string{dup}, t.rows[base+1:]...)...)
	m.logf("duplicate row %s in %s", t.rows[base][0], t.name)
	m.recompute(g)
	if m.results.t == t {
		m.recompute(m.results)
	}
	m.status = "duplicated row as id=" + dup[0]
}

func nextID(t *table) string {
	max := 0
	for _, r := range t.rows {
		if n, err := strconv.Atoi(r[0]); err == nil && n > max {
			max = n
		}
	}
	return fmt.Sprint(max + 1)
}

func (m *Model) removeLastFilter() {
	g := m.activeGrid()
	if g == nil || len(g.filters) == 0 {
		return
	}
	removed := g.filters[len(g.filters)-1]
	g.filters = g.filters[:len(g.filters)-1]
	m.recompute(g)
	m.status = "removed filter: " + removed
}

func (m *Model) copySelection(rowLevel bool) {
	g := m.activeGrid()
	base := m.selectedBaseRow(g)
	if base < 0 {
		return
	}
	row := g.t.rows[base]
	var val string
	if rowLevel {
		val = strings.Join(row, ", ")
	} else {
		val = row[g.colCursor]
	}
	m.logf("copy %d bytes", len(val))
	m.status = fmt.Sprintf("copied: %s", truncateRunes(val, 40))
}

func (m *Model) cycleTheme() {
	m.themeIx = (m.themeIx + 1) % len(themes)
	m.status = "theme: " + m.activeTheme().name
}

func (m *Model) pushView(v view) {
	m.prev = m.view
	m.view = v
}

func (m *Model) popView() {
	switch m.view {
	case viewData:
		m.view = viewTables
	case viewSchema:
		m.view = viewData
	case viewResults:
		m.view = viewQuery
	default:
		m.view = m.prev
		if m.view == viewHelp || m.view == viewLog {
			m.view = viewData
		}
	}
}

func truncateRunes(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n-1]) + "…"
}

// --- Entry ---

func main() {
	if len(os.Args) > 1 && os.Args[1] == "--version" {
		fmt.Println("dbview-go 1.0.0")
		return
	}
	p := tea.NewProgram(newModel(), tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

package main

import (
	"strings"
	"testing"

	tea "github.com/charmbracelet/bubbletea"
)

// renderAll walks every view and modal through View() to catch panics and
// blank frames without needing a TTY.
func TestRenderAllViewsNoPanic(t *testing.T) {
	sizes := [][2]int{{minWidth, minHeight}, {120, 40}, {71, 21}}
	for _, size := range sizes {
		m := newModel()
		m.width, m.height = size[0], size[1]
		updated, _ := m.Update(tea.WindowSizeMsg{Width: size[0], Height: size[1]})
		m = updated.(Model)

		views := []view{viewTables, viewData, viewSchema, viewQuery, viewResults, viewLog, viewHelp}
		for _, v := range views {
			// Data/results need a loaded table; simulate the load completing.
			if m.data.t == nil {
				m.data.t = m.st.find("orders")
				m.recompute(m.data)
			}
			m.view = v
			out := m.View()
			if strings.TrimSpace(out) == "" {
				t.Fatalf("view %d rendered empty at %dx%d", v, size[0], size[1])
			}
			if strings.Contains(out, "\x00") {
				t.Fatalf("view %d contains NUL bytes", v)
			}
		}

		// Modals.
		m.view = viewData
		m.confirm = &confirmState{kind: "delete", baseRow: 0, detail: "id=1  test"}
		if out := m.View(); !strings.Contains(out, "Delete") {
			t.Fatal("confirm modal not rendered")
		}
		m.confirm = nil
		m.edit = &editState{col: 1, buf: "abc"}
		if out := m.View(); !strings.Contains(out, "Edit") {
			t.Fatal("edit modal not rendered")
		}
		m.edit = nil
	}
}

func TestTooSmallTerminalGate(t *testing.T) {
	m := newModel()
	m.width, m.height = 40, 10
	out := m.View()
	if !strings.Contains(out, "too small") {
		t.Fatalf("expected min-size gate message, got %q", out)
	}
}

func TestPageSizeRespectsResize(t *testing.T) {
	m := newModel()
	m.width, m.height = minWidth, minHeight
	small := m.pageSize()
	m.height = 50
	if m.pageSize() <= small {
		t.Fatalf("pageSize must grow with height: %d vs %d", m.pageSize(), small)
	}
}

func TestFilterCommitThenRemove(t *testing.T) {
	m := newModel()
	m.width, m.height = minWidth, minHeight
	m.data.t = m.st.find("orders")
	m.recompute(m.data)
	m.view = viewData

	m.filterMode = true
	m.filterInput = "pending"
	m.applyLiveFilter()
	live := len(m.data.order)

	m.handleKey(tea.KeyMsg{Type: tea.KeyEnter}) // commit term
	if m.filterMode {
		t.Fatal("enter must leave filter mode")
	}
	if len(m.data.filters) != 1 || len(m.data.order) != live {
		t.Fatalf("commit failed: filters=%v rows=%d", m.data.filters, len(m.data.order))
	}

	m.handleKey(tea.KeyMsg{Type: tea.KeyCtrlD}) // remove last committed
	if len(m.data.filters) != 0 || len(m.data.order) != len(m.data.t.rows) {
		t.Fatalf("ctrl+d did not restore full set: %d vs %d", len(m.data.order), len(m.data.t.rows))
	}
}

func TestTypingQInFilterDoesNotQuit(t *testing.T) {
	m := newModel()
	m.width, m.height = minWidth, minHeight
	m.data.t = m.st.find("orders")
	m.recompute(m.data)
	m.filterMode = true

	m.handleKey(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{'q'}})
	if m.filterInput != "q" {
		t.Fatalf("q not captured by filter input: %q", m.filterInput)
	}
}

func TestDeleteRequiresConfirm(t *testing.T) {
	m := newModel()
	m.width, m.height = minWidth, minHeight
	m.data.t = m.st.find("orders")
	m.recompute(m.data)
	m.view = viewData
	before := len(m.data.t.rows)

	m.handleKey(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{'x'}})
	if m.confirm == nil {
		t.Fatal("x must open the confirm modal")
	}
	if len(m.data.t.rows) != before {
		t.Fatal("rows must not change before confirmation")
	}

	m.handleKey(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{'n'}})
	if m.confirm != nil {
		t.Fatal("n must close the modal")
	}
	if len(m.data.t.rows) != before {
		t.Fatal("n must cancel the delete")
	}

	m.handleKey(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{'x'}})
	m.handleKey(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{'y'}})
	if len(m.data.t.rows) != before-1 {
		t.Fatalf("y must delete exactly one row: %d -> %d", before, len(m.data.t.rows))
	}
}

func TestSortToggleAndPaginationClamp(t *testing.T) {
	m := newModel()
	m.width, m.height = minWidth, minHeight
	m.data.t = m.st.find("orders")
	m.recompute(m.data)
	m.view = viewData

	m.handleKey(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{'3'}})
	if m.data.sortCol != 2 || m.data.sortDesc {
		t.Fatalf("sort col/dir wrong: %d %v", m.data.sortCol, m.data.sortDesc)
	}
	m.handleKey(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{'3'}})
	if !m.data.sortDesc {
		t.Fatal("second press must toggle to desc")
	}

	_, pages, _ := paginate(m.data.order, 0, m.pageSize())
	for i := 0; i < pages+5; i++ {
		m.handleKey(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{']'}})
	}
	if m.data.page != pages-1 {
		t.Fatalf("page not clamped: %d/%d", m.data.page+1, pages)
	}
}

func TestQueryHistoryNavigation(t *testing.T) {
	m := newModel()
	m.width, m.height = minWidth, minHeight
	m.queryInput = "first"
	m.runQuery()
	m.queryInput = "second"
	m.runQuery()

	m.view = viewQuery
	m.queryInput = ""
	m.handleKey(tea.KeyMsg{Type: tea.KeyUp})
	if m.queryInput != "second" {
		t.Fatalf("up should recall newest query, got %q", m.queryInput)
	}
	m.handleKey(tea.KeyMsg{Type: tea.KeyUp})
	if m.queryInput != "first" {
		t.Fatalf("up should recall older query, got %q", m.queryInput)
	}
	m.handleKey(tea.KeyMsg{Type: tea.KeyDown})
	m.handleKey(tea.KeyMsg{Type: tea.KeyDown})
	if m.queryInput != "" {
		t.Fatalf("down past newest should restore draft, got %q", m.queryInput)
	}
}

package main

import (
	"strings"
	"testing"
)

func testTable() *table {
	return &table{
		name: "t",
		columns: []column{
			{"id", typeInt}, {"status", typeString}, {"total", typeMoney},
		},
		rows: [][]string{
			{"3", "shipped", "$120.00"},
			{"10", "pending", "$9.50"},
			{"1", "pending", "$300.00"},
			{"25", "delivered", "$1,200.00"},
		},
	}
}

func TestFilterANDLogic(t *testing.T) {
	tb := testTable()
	got := filterIndices(tb, []string{"pending"})
	want := []int{1, 2}
	if !equalInts(got, want) {
		t.Fatalf("filter pending: got %v want %v", got, want)
	}
	got = filterIndices(tb, []string{"pending", "$300"})
	want = []int{2}
	if !equalInts(got, want) {
		t.Fatalf("AND filter: got %v want %v", got, want)
	}
	if got := filterIndices(tb, nil); len(got) != 4 {
		t.Fatalf("no terms should match all rows, got %v", got)
	}
}

func TestFilterCaseInsensitive(t *testing.T) {
	tb := testTable()
	got := filterIndices(tb, []string{"PENDING"})
	if len(got) != 2 {
		t.Fatalf("case-insensitive filter failed: %v", got)
	}
}

func TestSortTypedNumerics(t *testing.T) {
	tb := testTable()
	idx := []int{0, 1, 2, 3}

	sortIndices(tb, idx, 0, false) // id asc: "10" must beat "9"-style strings
	if tb.rows[idx[0]][0] != "1" || tb.rows[idx[3]][0] != "25" {
		t.Fatalf("int sort wrong order: %v", idx)
	}

	sortIndices(tb, idx, 2, false) // money asc
	if tb.rows[idx[0]][2] != "$9.50" || tb.rows[idx[3]][2] != "$1,200.00" {
		t.Fatalf("money sort wrong order: %v", idx)
	}

	sortIndices(tb, idx, 2, true) // money desc
	if tb.rows[idx[0]][2] != "$1,200.00" {
		t.Fatalf("money desc sort wrong order: %v", idx)
	}

	sortIndices(tb, idx, 1, false) // string asc
	if tb.rows[idx[0]][1] != "delivered" || tb.rows[idx[3]][1] != "shipped" {
		t.Fatalf("string sort wrong order: %v", idx)
	}
}

func TestSortStable(t *testing.T) {
	tb := &table{
		name:    "t",
		columns: []column{{"status", typeString}},
		rows: [][]string{
			{"pending"}, {"shipped"}, {"pending"}, {"pending"},
		},
	}
	idx := []int{0, 1, 2, 3}
	sortIndices(tb, idx, 0, false)
	want := []int{0, 2, 3, 1} // ties keep original order
	if !equalInts(idx, want) {
		t.Fatalf("sort not stable: got %v want %v", idx, want)
	}
}

func TestSortOutOfRangeColumn(t *testing.T) {
	tb := testTable()
	idx := []int{0, 1, 2, 3}
	sortIndices(tb, idx, 99, true) // must not panic
	if !equalInts(idx, []int{0, 1, 2, 3}) {
		t.Fatalf("out-of-range sort mutated order: %v", idx)
	}
}

func TestPaginateClamps(t *testing.T) {
	order := make([]int, 250)
	for i := range order {
		order[i] = i
	}

	rows, pages, page := paginate(order, 0, 100)
	if len(rows) != 100 || pages != 3 || page != 0 {
		t.Fatalf("page 0: rows=%d pages=%d page=%d", len(rows), pages, page)
	}

	rows, pages, page = paginate(order, 99, 100) // page past end clamps to last
	if page != 2 || len(rows) != 50 || pages != 3 {
		t.Fatalf("clamp: rows=%d pages=%d page=%d", len(rows), pages, page)
	}

	rows, pages, page = paginate(nil, 5, 100) // empty set
	if page != 0 || pages != 1 || len(rows) != 0 {
		t.Fatalf("empty: rows=%d pages=%d page=%d", len(rows), pages, page)
	}
}

func TestPaginateZeroPageSize(t *testing.T) {
	order := []int{1, 2, 3}
	if _, _, page := paginate(order, 0, 0); page != 0 {
		t.Fatalf("zero page size must not panic or misbehave, page=%d", page)
	}
}

func TestSplitTerms(t *testing.T) {
	cases := []struct {
		in   string
		want []string
	}{
		{"pending + shipped", []string{"pending", "shipped"}},
		{`"pending" + "err"`, []string{"pending", "err"}},
		{"  single  ", []string{"single"}},
		{" + ", nil},
	}
	for _, c := range cases {
		got := splitTerms(c.in)
		if strings.Join(got, "|") != strings.Join(c.want, "|") {
			t.Fatalf("splitTerms(%q) = %v want %v", c.in, got, c.want)
		}
	}
}

func TestHistoryCapAndDedupe(t *testing.T) {
	h := newHistory(3)
	h.push("a")
	h.push("a") // consecutive dupe ignored
	h.push("b")
	h.push("c")
	h.push("d") // evicts oldest
	if strings.Join(h.entries, ",") != "b,c,d" {
		t.Fatalf("history = %v want [b c d]", h.entries)
	}
	h.push("  ") // blank ignored
	if len(h.entries) != 3 {
		t.Fatalf("blank entry stored: %v", h.entries)
	}
}

func TestEmptyStore(t *testing.T) {
	s := newStore()
	tb := s.find("archive")
	if tb == nil || len(tb.rows) != 0 {
		t.Fatal("archive table must exist and be empty")
	}
	if got := filterIndices(tb, nil); len(got) != 0 {
		t.Fatalf("empty table filter returned %v", got)
	}
}

func equalInts(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

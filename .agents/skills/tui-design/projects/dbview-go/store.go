package main

import (
	"fmt"
	"math/rand"
	"sort"
	"strings"
)

// --- Domain model ---

type columnType int

const (
	typeInt columnType = iota
	typeString
	typeMoney
	typeTime
)

type column struct {
	name string
	kind columnType
}

type table struct {
	name    string
	columns []column
	rows    [][]string
}

type store struct {
	tables []table
}

// resultSet is the display order of a table's rows after filtering and
// sorting. It holds indices into the base rows so filters compose over the
// unfiltered set without copying row data.
type resultSet struct {
	t     *table
	order []int
}

// --- Store construction (deterministic seeded data) ---

func newStore() *store {
	r := rand.New(rand.NewSource(42))
	return &store{
		tables: []table{
			genUsers(r),
			genOrders(r),
			genProducts(r),
			genEmpty(),
		},
	}
}

func (s *store) find(name string) *table {
	for i := range s.tables {
		if s.tables[i].name == name {
			return &s.tables[i]
		}
	}
	return nil
}

var (
	customers = []string{"acme-corp", "globex", "initech", "umbrella", "stark-ind", "wayne-enter", "wonka-ind", "hooli"}
	statuses  = []string{"pending", "shipped", "delivered", "cancelled"}
	plans     = []string{"free", "pro", "team", "enterprise"}
	first     = []string{"ada", "linus", "grace", "alan", "barbara", "dennis", "margaret", "ken"}
	last      = []string{"lovelace", "torvalds", "hopper", "turing", "lübeck", "ritchie", "hamilton", "thompson"}
	kinds     = []string{"widget", "gadget", "sprocket", "flange", "gasket", "bearing"}
)

func genUsers(r *rand.Rand) table {
	cols := []column{
		{"id", typeInt}, {"name", typeString}, {"email", typeString},
		{"plan", typeString}, {"created_at", typeTime},
	}
	rows := make([][]string, 120)
	for i := range rows {
		f, l := first[r.Intn(len(first))], last[r.Intn(len(last))]
		rows[i] = []string{
			fmt.Sprint(1000 + i),
			f + " " + l,
			f + "." + l + "@example.com",
			plans[r.Intn(len(plans))],
			fmt.Sprintf("2025-%02d-%02d", 1+r.Intn(12), 1+r.Intn(28)),
		}
	}
	return table{"users", cols, rows}
}

func genOrders(r *rand.Rand) table {
	cols := []column{
		{"id", typeInt}, {"customer", typeString}, {"status", typeString},
		{"total", typeMoney}, {"items", typeInt}, {"created_at", typeTime},
	}
	rows := make([][]string, 480)
	for i := range rows {
		rows[i] = []string{
			fmt.Sprint(1000 + i),
			customers[r.Intn(len(customers))],
			statuses[r.Intn(len(statuses))],
			fmt.Sprintf("$%.2f", r.Float64()*900+5),
			fmt.Sprint(1 + r.Intn(20)),
			fmt.Sprintf("2026-%02d-%02d", 1+r.Intn(9), 1+r.Intn(28)),
		}
	}
	return table{"orders", cols, rows}
}

func genProducts(r *rand.Rand) table {
	cols := []column{
		{"id", typeInt}, {"sku", typeString}, {"name", typeString},
		{"price", typeMoney}, {"stock", typeInt},
	}
	rows := make([][]string, 60)
	for i := range rows {
		rows[i] = []string{
			fmt.Sprint(200 + i),
			fmt.Sprintf("SKU-%04d", 4000+i*7),
			kinds[r.Intn(len(kinds))] + " mk" + fmt.Sprint(r.Intn(4)+1),
			fmt.Sprintf("$%.2f", r.Float64()*120+1),
			fmt.Sprint(r.Intn(500)),
		}
	}
	return table{"products", cols, rows}
}

func genEmpty() table {
	cols := []column{
		{"id", typeInt}, {"customer", typeString}, {"status", typeString},
		{"total", typeMoney}, {"items", typeInt}, {"created_at", typeTime},
	}
	return table{"archive", cols, nil}
}

// --- Filtering ---

// filterIndices returns indices of rows where every term matches at least
// one cell (AND logic, case-insensitive substring).
func filterIndices(t *table, terms []string) []int {
	out := make([]int, 0, len(t.rows))
	for i, row := range t.rows {
		if rowMatches(row, terms) {
			out = append(out, i)
		}
	}
	return out
}

func rowMatches(row []string, terms []string) bool {
	for _, term := range terms {
		needle := strings.ToLower(term)
		hit := false
		for _, cell := range row {
			if strings.Contains(strings.ToLower(cell), needle) {
				hit = true
				break
			}
		}
		if !hit {
			return false
		}
	}
	return true
}

// splitTerms parses "a + b" into ["a", "b"], stripping surrounding quotes.
func splitTerms(input string) []string {
	parts := strings.Split(input, "+")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		p = strings.Trim(p, `"'`)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

// --- Sorting ---

// sortIndices sorts idx in place by column col (stable, typed comparison).
func sortIndices(t *table, idx []int, col int, desc bool) {
	if col < 0 || col >= len(t.columns) {
		return
	}
	kind := t.columns[col].kind
	sort.SliceStable(idx, func(a, b int) bool {
		cmp := compareCells(t.rows[idx[a]][col], t.rows[idx[b]][col], kind)
		if desc {
			return cmp > 0
		}
		return cmp < 0
	})
}

func compareCells(a, b string, kind columnType) int {
	switch kind {
	case typeInt, typeMoney:
		na, nb := parseNumber(a), parseNumber(b)
		switch {
		case na < nb:
			return -1
		case na > nb:
			return 1
		default:
			return 0
		}
	default:
		return strings.Compare(a, b)
	}
}

func parseNumber(s string) float64 {
	s = strings.TrimPrefix(s, "$")
	s = strings.ReplaceAll(s, ",", "")
	var n float64
	fmt.Sscanf(s, "%g", &n)
	return n
}

// --- Pagination ---

func paginate(order []int, page, pageSize int) (rows []int, pages int, clamped int) {
	if pageSize < 1 {
		pageSize = 1
	}
	pages = (len(order) + pageSize - 1) / pageSize
	if pages < 1 {
		pages = 1
	}
	if page < 0 {
		page = 0
	}
	if page >= pages {
		page = pages - 1
	}
	start := page * pageSize
	end := start + pageSize
	if end > len(order) {
		end = len(order)
	}
	return order[start:end], pages, page
}

// --- History ring ---

type history struct {
	entries []string
	cap     int
}

func newHistory(cap int) *history { return &history{cap: cap} }

// push appends an entry, deduping consecutive repeats and evicting the
// oldest beyond capacity. Newest entry is last.
func (h *history) push(entry string) {
	entry = strings.TrimSpace(entry)
	if entry == "" {
		return
	}
	if len(h.entries) > 0 && h.entries[len(h.entries)-1] == entry {
		return
	}
	h.entries = append(h.entries, entry)
	if len(h.entries) > h.cap {
		h.entries = h.entries[len(h.entries)-h.cap:]
	}
}

# Dashboard Pattern

A dashboard presents multiple data panels in a grid layout, providing an overview at a glance.

---

## Use When

- Monitoring system health, metrics, or status
- Providing an overview with drill-down capability
- Showing multiple related data sets simultaneously

---

## Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  Dashboard                                         j/k: nav  q: quit │
├──────────┬──────────┬──────────┬─────────────────────────────────────┤
│          │          │          │                                     │
│  Total   │  Active  │  Errors  │  Recent Activity                    │
│  1,247   │  892     │  3       │                                     │
│  ▲ 12%   │  ▲ 5%    │  ▼ 2     │  ● Record #1247 created 2m ago      │
│          │          │          │  ● Record #1246 updated 5m ago      │
├──────────┴──────────┴──────────┤  ● Record #1245 deleted 8m ago      │
│  Performance                   │  ● Record #1244 synced 12m ago      │
│                                │  ● Record #1243 created 1h ago      │
│  ████████████░░░░ CPU 68%      │                                     │
│  ██████░░░░░░░░░░ Mem 37%      │                                     │
│  ██████████████░░░░ Disk 82%   │                                     │
│                                ├─────────────────────────────────────┤
│                                │  Quick Actions                      │
│                                │                                     │
│                                │  [n] New Record  [r] Refresh        │
│                                │  [/] Search      [s] Settings       │
├────────────────────────────────┴─────────────────────────────────────┘
│ ● Connected  Last sync: 3s ago      j/k: navigate  Enter: select  ?  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Components

### Stat Cards

Compact panels showing a single key metric:

- Metric name (muted, small)
- Value (bold, large — visually dominant)
- Change indicator (colored: green up, red down)
- Fixed height (3-4 rows), flexible width

### Activity Feed

A chronological list of recent events:

- Icon/symbol per event type
- Description (truncated to available width)
- Relative timestamp (muted)
- Scrollable, newest first

### Charts (Text-based)

Simple text charts for trend data:

- Bar charts using block characters (`█░`)
- Sparklines for inline trends
- Keep to 1-2 metrics per chart

### Quick Actions

A group of keybinding-driven actions:

- Show key + description
- Grouped logically
- Always visible, not hidden in menus

---

## Interaction

| Key | Action |
|-----|--------|
| `j/k` | Move between stat cards / panels |
| `Enter` | Drill down into selected panel |
| `Tab` | Cycle focus between panels |
| `r` | Refresh all data |
| `n` | Quick action: new item |
| `/` | Open search |
| `?` | Show help |

---

## State Handling

- **Loading** — Show stat cards with skeleton values (`░░░░`) and spinner in header
- **Partial failure** — Show loaded panels, show error indicator on failed panels
- **No data** — Show stat cards with zero values, activity feed shows "No recent activity"
- **Refreshing** — Keep current data visible, update timestamp when refresh completes

---

## Design Notes

- Dashboard panels should be roughly equal visual weight unless one is clearly primary
- Leave 1-2 cell gaps between panels (use Layout gutters)
- Stat card values should be the largest text on the screen
- Don't overcrowd — 4-6 panels maximum on a standard terminal
- If data doesn't update in real-time, show last-updated timestamp
- Consider a sidebar if the dashboard is one view among many

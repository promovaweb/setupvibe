# TUI

The terminal interface opens with `{{bin}}` without arguments or with
`{{bin}} tui`. It requires stdin and stdout in a TTY; outside one the process
exits with code 8.

## Home and modules

The TUI has no tabs. It opens on the **Home**, a bento grid with one card per
module. The numbers follow the module order, not the grid position.

| Number and module | Grid position | What the card sums up |
| --- | --- | --- |
| 1 Inventory | first row, left | progress bar, items by status and one bar per category |
| 2 User | second row | user, checklist pendings and the sudo state |
| 3 Doctor | first row, centre | problems, warnings, `init` state and the first three findings, the same as the module and translated |
| 4 Logs | second row | last run, failed events, a strip with the last 16 runs and the list of the previous ones |
| 5 Tailscale | second row | state, IP, tailnet and the online machines, refreshed every 15 seconds |
| 6 Machine | first row, right | CPU, RAM, root disk, load, network per second and CPU history, refreshed every 2 seconds |
| 7 About | second row, right | version, edition, update status, outdated items, system and language |

Above the cards, the recommended **next step**: migrate SetupVibe 1, finish
`init`, fix items with a failure, update versions or install what is missing. A
click on it opens the module where the step is solved.

**Header.** The first line is a band with the `▲ SetupVibe` pill, the version,
where you are (`Home` or `› module`, with its icon), the detected system, the
`PT · EN` switch, the theme button (moon or sun) and a clock refreshed every
15 seconds.

Inside a module, the top shows the **← Back** button, the icon, the module name
and what it shows. The button, the `SetupVibe` pill, `Esc` or `Backspace` go
back to the Home.

**Footer.** The bottom bar shows the module keys first and, after a `│`, the
global ones. When the width cannot hold all of them, the last ones leave, but
`?` (help, which lists the keys of the open module first and then the global
ones) and `q` always stay. Each key in the bar is also a button.

**Icons.** Modules, categories, panels and states use Nerd Font icons, installed
by SetupVibe. In a terminal without that font, turn them off with `config set
tui.icons false` or `SETUPVIBE_ICONS=0`: the TUI switches to symbols every font
has.

**Language.** The interface speaks Portuguese by default. The `PT · EN` switch
in the header (click) or the `L` key changes it to English and back; the choice
goes to `tui.language` in `settings.json` and the open module stays open. When
`SETUPVIBE_LANG` is set, it pins the language for later runs; the switch still
applies to the current session and the choice is stored.

**Mouse.** With `tui.mouse` on (the default), click a card to open the module, a
category, an item, the `◻` marker, a tailnet machine, a run name or a button. The
wheel scrolls the lists and a click outside closes the help. To select text,
hold `Shift` while dragging. The keyboard stays complete.

The TUI opens on the Home, or on the module of `tui.initialTab` in
`settings.json` or of `--tab` (`overview` is the Home; `inventory`, `user`,
`doctor`, `logs`, `tailscale`, `machine` or `about`). In a terminal with fewer
than 110 columns or 32 rows, the Inventory narrows the columns, shortens the
detail panel and reduces the spacing; the lists scroll when they do not fit.

## Global keys

| Key | Action |
| --- | --- |
| `←` `↑` `↓` `→`, `h` `j` `k` `l` | on the Home, move between the cards |
| `Enter`, `space` | open the selected card |
| `1` to `7` | open the module with that number, from anywhere |
| `Esc`, `Backspace` | go back to the Home; on the Home, `Esc` quits |
| `L` | switch the language (PT · EN) |
| `T` | switch between the `night` and `day` palettes |
| `?` | show or hide the key help |
| `q`, `Ctrl+C` | quit |

## Keys per module

| Module | Key | Action |
| --- | --- | --- |
| Home | `u` | read the local state again and refresh the cards |
| Inventory | `c` | move the focus to the category panel |
| Inventory | `f` | move the focus to the tool panel |
| Inventory | `Tab` | switch the focus between categories and tools |
| Inventory | `j` `k`, `↓` `↑` | move in the focused panel; in the category panel, change category |
| Inventory | `h` `l`, `[` `]`, `←` `→` | change category |
| Inventory | `g`, `Home` | go to the first item |
| Inventory | `End` | go to the last item |
| Inventory | `space` | mark or unmark the item |
| Inventory | `a` | mark every visible item that can be installed or fixed; again, unmark them |
| Inventory | `s` | cycle the filter: all, actionable, installed, problems |
| Inventory | `i` | install the marked items, or the current item when nothing is marked |
| Inventory | `r` | remove the marked items, or the current item when nothing is marked |
| User | none | read-only module; the global keys are enough |
| Doctor | `f` | apply the safe fixes |
| Doctor | `u` | run the check again |
| Logs | `j` `k`, `↓` `↑` | change the run shown on the right |
| Tailscale | `j` `k`, `↓` `↑` | select the tailnet machine |
| Tailscale | `n` | run the network check (`netcheck`) |
| Tailscale | `u` | reload the local client state |
| Machine | `u` | reload the system reading |
| About | none | read-only module |

In the Inventory, the first `i` or `r` press builds the plan with `--dry-run`
and shows the steps; the second press runs it. Any other key cancels the plan.
The actions run the CLI in another process, so the TUI and the CLI share one
code path.

## Inside each module

**Inventory.** Categories with a name, an `installed/total` count and a thin bar
on the left; tools in two-line blocks on the right, with alternating bands: a
marker, the name in bold and the status on the right; below, the description and
the pinned version (or installed → pinned). Installed, outdated and failed paint
the left edge of the block, and only outdated and failed get a filled tag. Above
the list are the category counts and how many items are marked. The `s` filter
narrows the list to `all`, `to install`, `installed` or `with problems`, and the title
shows `visible/total` when the filter is not `all`. The focused
panel has the accent border and its selection gets a tinted background; `c`, `f`
and `Tab` switch the focus. The detail panel shows name, id, description, pinned
version, installed version, method, status and the item site, or the path of the
other copy when the tool comes from another manager. The **Install** and
**Remove** buttons sit in the detail panel. During `i` or `r`, the same panel
becomes the run progress: a bar with finished and total steps, elapsed seconds,
the last steps with `✓` (ok), `✗` (failure) and `↷` (skipped), and the error
message of each failure, read from the run log. When it ends, the border turns
green or red; any key goes back to the details.

**User.** Two panels: who the user is (user, edition, system, variant and the
data folder) and the checklist grouped in Permissions, Folders and SetupVibe,
with the `sudo` or `wheel` group, sudo without a password, the mode of
`~/.setupvibe`, `~/.ssh` and `authorized_keys`, the `init` and the `cco`, `cxo`
and `oco` aliases.

**Doctor.** The same findings as `doctor`, grouped into problems, warnings and
passing items, with the command that fixes each one. The finding and fix text
follows the TUI language. `f` applies the safe fixes
(folders and the shell block) and leaves the rest for you to decide; an `[f]`
next to the command marks a safe fix.

**Logs.** The runs in `~/.setupvibe/logs`, newest first, and the events of each
one, with time, status, item and action. The error message appears below each
failure. Without a run, the events panel explains that every run that changes
the machine writes a log with one event per step and asks you to pick a run on
the left.

**Tailscale.** This machine (translated state, name, DNS, IPs, tailnet, MagicDNS, version,
key expiry, exit node, tags, routes and capabilities); services published with
serve and Funnel; health warnings; network check with `n` (UDP, IPv4, IPv6,
UPnP, NAT-PMP, PCP, hard NAT, captive portal and latency per relay); tailnet
machines with system, IP, direct or relay connection and last contact; details
of the chosen machine (IPs, user, direct address, traffic and expiry). Everything
comes from the local client, without the Tailscale API.

**Machine.** Live, every second: system (host, distribution, kernel,
virtualization, variant, uptime, user, shell, time zone and processes); total
CPU, the last 60 seconds of history, load, temperature when there is a sensor and
one bar per core; RAM and swap with history; network per interface (received and
sent per second, totals and addresses); disks with usage, free space and read and
write per second; the processes using the most CPU (PID, name, CPU, memory and
RSS). The Home card refreshes every 2 seconds; the module, every second.

**About.** Binary, project, license, credits in two lines (name and link; the
role below) and the standards the binary follows (OpenCLI, MCP, fixed exit
codes, data file format). The description and the standards follow the TUI
language.

## Theme

Two palettes in `shared/core/tui/theme.ts`: `night` (the default) and `day`. The
`T` key or the header button switch them and write `tui.theme`. Colors have role names (`accent`, `textDim`,
`border`), not hue names, so a palette change does not require editing the screens.

Visual principles, in the modern unix style:

- rounded borders with the title on the border itself;
- dim labels on the left and full-color values on the right;
- one accent color for what is active, a secondary for links and external
  origins; green, amber and red only for state;
- status bar with inverted key blocks;
- two columns of breathing room between neighbouring panels and one row between
  bands; one cell of internal padding and one empty line before the content;
- wrapped text stays aligned with the text, not with the line symbol;
- nothing blinks, nothing scrolls on its own.

## Creating a module

1. Copy `shared/tests/template/screen/example.ts` to a new file in `shared/tui/`
   or `shared/core/tui/screens/`.
2. Fill in `id`, `title`, `description` and `mount(ctx)`. Use the components from
   `shared/core/tui/components.ts` (`panel`, `keyValueTable`, `list`, `heading`,
   `dim`, `spacer`) and the colors from `ctx.theme`.
3. Declare the module keys in `keys` and handle them in `onKey`. They appear in
   the bottom bar before the global ones. Return `true` only for the key you
   handled.
4. If the module needs periodic refresh, start the timer in `onEnter` and clear
   it in `onLeave`. `onLeave` also runs when the TUI closes.
5. Register the module in `shared/core/tui/screens/index.ts`. The list order
   defines the number of each module.
6. Add the module to `BENTO` in `shared/tui/home.ts`, otherwise it gets a number
   and a key but no card on the Home.
7. Add the texts in `shared/tui/i18n.ts`, including `sub.<id>` for the module
   subtitle, in both languages.
8. If the `id` is a valid initial module, add it to `tui.initialTab`
   (`shared/core/config/settings.ts`) and to `--tab`
   (`shared/core/cli/commands/tui.ts`).

The TUI runs on OpenTUI (`@opentui/core`). Use `BoxRenderable`,
`TextRenderable` and `ScrollBoxRenderable`, plus the other renderables of the
package. Always hand the terminal back with `renderer.destroy()`; `mountTui()`
already does it for `q`, `Esc` and `Ctrl+C`.

The interface has no tabs: `tui.initialTab` and `--tab` keep the name `tab`, and
the help text calls each screen a module. `Tab` still switches the focus between
categories and tools in the Inventory.

## Testing without a terminal

`shared/tests/tui.test.ts` mounts the interface with `createTestRenderer` from
`@opentui/core/testing`, presses keys with `mockInput.pressKey` and checks the
frame with `captureCharFrame`. `mountTui` accepts any renderer; `startTui`
creates the real one.

## List with selection

`listPanel(renderer, theme, { title, items, onSelect })` builds a list with
`ScrollBoxRenderable`. The current item gets `theme.surfaceHigh` as background
and `theme.accent` as text, and the scroll follows the selected item.

| Return | Use |
| --- | --- |
| `box` | add it to the layout; `handleKeyPress` handles up/down, j/k and Enter |
| `move(delta)` | moves the highlight without calling `onSelect`; respects the limits |
| `selected()` | returns the current index, or -1 for an empty list |
| `select(index)` | highlights the index and calls `onSelect(index)` |

In the screen, handle up/k with `move(-1)`, down/j with `move(1)` and Enter with
`select(selected())` inside `onKey`. The `r` key can go back to the first item
with `move(-selected())`. Declare those keys in `keys` so they appear in the
bottom bar. The complete example is in
`shared/tests/template/screen/example.ts`. Do not forward the same key through
the `box` focus and through `onKey` at the same time.

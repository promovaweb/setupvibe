# TUI

The terminal interface opens with `{{bin}}` with no arguments or with
`{{bin}} tui`. It requires stdin and stdout on a TTY; otherwise the process
exits with exit code 8.

## Home and modules

The TUI has no tabs. It opens on the **Home**, a bento grid with one card per
module. Each card sums up its module and shows the number that opens it:

| Card | Summary on the Home | The module |
| --- | --- | --- |
| 1 Inventory | progress bar, items by status and one bar per category | categories with the `installed/total` count; items in columns (status, name, pinned version, installed version) with a legend; details or the plan; **Install** and **Remove** buttons. `h`/`l` switch the category, `j`/`k` move, `g`/`End` go to the first and last item, `space` marks, `i` installs and `r` removes. The first press (or click) shows the plan and the second runs it; any other key cancels. The actions run the CLI in another process. |
| 2 User | user, pending items and sudo | checklist grouped in Permissions, Folders and SetupVibe, with the warning about the `cco`, `cxo` and `oco` aliases |
| 3 Doctor | problems, warnings, init and the main findings | the `doctor` findings grouped, each with the command that fixes it; **Apply safe fixes** or `f`; `u` refreshes |
| 4 Logs | last run and the previous ones | runs in `~/.setupvibe/logs` and their events, with the error under each failure |
| 5 Tailscale | state, IP, tailnet and the online machines | this machine (state, name, DNS, IPs, tailnet, MagicDNS, version, key expiry, exit node, tags, routes, capabilities); services published with serve and Funnel; health warnings; a network check with `n` (UDP, IPv4, IPv6, UPnP, NAT-PMP, PCP, hard NAT, captive portal and latency per relay); tailnet machines with system, IP, direct or relayed connection and last contact; details of the chosen machine (IPs, user, direct address, traffic, key expiry). Everything comes from the local client, without the Tailscale API. |
| 6 Machine | host, cores, uptime, load, memory and disk | system (host, distribution, kernel, virtualization, variant, uptime, user, shell, time zone, locale); live CPU, load, memory and swap, refreshed every 2 seconds; disks with usage; network interfaces (container and bridge interfaces are counted, not listed) |
| 7 About | version, edition, system and variant | binary, project, license, credits and standards |

Above the cards, the recommended **next step**; a click on it opens the module
where it is done.

Inside a module, the top shows the **← Back** button, the module name and what
it shows; the header reads `SetupVibe › module`. The button, the `SetupVibe`
name, `Esc` or `Backspace` go back to the Home.

**Language.** The interface speaks Portuguese by default. The `PT · EN`
switch in the header (click) or the `L` key switches to English and back; the
choice is saved in `tui.language` in settings.json and the open module stays
open. When `SETUPVIBE_LANG` is set, it pins the language.

**Mouse.** With `tui.mouse` on (the default), click a card to open its module,
a category, an item, the `◻` marker, a tailnet machine or a run. Every key in
the bottom bar is also a button, the wheel scrolls the lists and a click
outside closes the help. Hold `Shift` while dragging to select text. The
keyboard stays complete.

The TUI opens on the Home, or on the module set in `tui.initialTab` in
settings.json or in `--tab` (`overview` is the Home; `inventory`, `user`,
`doctor`, `logs`, `tailscale`, `machine` or `about`). On a terminal with fewer
than 110 columns or 32 rows, the Inventory narrows its columns and spacing;
lists scroll when they do not fit.

## Keys

| Key | Action |
| --- | --- |
| `←` `↑` `↓` `→`, `h` `j` `k` `l` | on the Home, move between cards |
| `Enter`, `space` | open the selected card |
| `1` … `7` | open the module with that number, from anywhere |
| `Esc`, `Backspace` | back to the Home; on the Home, `Esc` quits |
| `L` | switch the language (PT · EN) |
| `?` | show or hide the key help |
| `q`, `Ctrl+C` | quit |

Each screen can declare its own keys in `keys` and handle them in `onKey`.
They appear in the bottom bar before the global keys.

## Theme

Two palettes in `shared/core/tui/theme.ts`: `night` (default) and `day`. The choice comes
from `tui.theme`. Colors are named by role (`accent`, `textDim`, `border`),
not by hue, so that a palette change does not require touching the screens.

Visual principles, in the modern unix style:

- rounded borders with the title on the border itself;
- dimmed labels on the left and full color values on the right;
- one accent color for what is active, a secondary one for links and
  external sources; green, amber and red only for state;
- status bar with keys in inverted blocks;
- two columns of breathing room between neighboring panels and one row between bands; inner padding of one cell and an empty row before the content;
- wrapped text stays aligned with the text, not with the line symbol;
- nothing blinks, nothing scrolls on its own.

## How to create a screen

1. Copy `template/screen/example.ts` to `shared/core/tui/screens/<id>.ts`.
2. Fill in `id`, `title`, `description` and `mount(ctx)`. Use the components
   from `shared/core/tui/components.ts` (`panel`, `keyValueTable`, `list`, `heading`,
   `dim`) and the colors from `ctx.theme`.
3. If the screen needs periodic updates, start the timer in
   `onEnter` and clear it in `onLeave`.
4. Register it in `shared/core/tui/screens/index.ts`. The list order is the tab order.
   The stub exports the `createExampleScreen()` factory: register the `Screen` it
   returns, so that selection and renderables are kept per instance.
5. If the `id` is a valid initial tab option, add it to
   `tui.initialTab` (`shared/core/config/settings.ts`) and to `--tab`
   (`shared/core/cli/commands/tui.ts`).

The TUI runs on OpenTUI (`@opentui/core`). Use `BoxRenderable`,
`TextRenderable`, `TabSelectRenderable`, `ScrollBoxRenderable` and the other
renderables from the package. Always restore the terminal with `renderer.destroy()`;
`mountTui()` already handles this for `q`, `Esc` and `Ctrl+C`.

## Testing without a terminal

`tests/tui.test.ts` mounts the interface with `createTestRenderer` from
`@opentui/core/testing`, presses keys with `mockInput.pressKey` and checks
the frame with `captureCharFrame`. `mountTui` accepts any renderer;
`startTui` creates the real renderer.

## List with selection

`listPanel(renderer, theme, { title, items, onSelect })` builds a list
with `ScrollBoxRenderable`. The current item gets `theme.surfaceHigh` as background
and `theme.accent` as text color. Scrolling follows the selected item.

| Return | Use |
| --- | --- |
| `box` | Add it to the layout; `handleKeyPress` handles up/down, j/k and Enter. |
| `move(delta)` | Moves the highlight without calling `onSelect`; respects the limits. |
| `selected()` | Returns the current index, or -1 for an empty list. |
| `select(index)` | Highlights the index and calls `onSelect(index)`. |

In the screen, handle up/k with `move(-1)`, down/j with `move(1)` and Enter with
`select(selected())` inside `onKey`. The `r` key can go back to the first
item with `move(-selected())`. Declare these keys in `keys` so they appear
in the bottom bar. The full example is in `template/screen/example.ts`.
Do not route the same key through the `box` focus and through `onKey` at the same time.

# TUI

The terminal interface opens with `{{bin}}` with no arguments or with
`{{bin}} tui`. It requires stdin and stdout on a TTY; otherwise the process
exits with exit code 8.

## Tabs

| Tab | Content |
| --- | --- |
| Inventory | Categories on the left, items on the right with status and pinned version, details below. `h`/`l` switch the category, `j`/`k` move, `space` marks, `i` installs and `r` removes the marked items (or the current one). The actions run the CLI in another process. |
| User | Working user and the checklist: sudo group, passwordless sudo, permissions of `~/.setupvibe`, `~/.local/bin` in PATH, `~/.ssh`, `authorized_keys` and init. |
| Doctor | Pending prerequisites, items that fail the check and outdated items, with the command that fixes each one. |
| Logs | Runs in `~/.setupvibe/logs`, from newest to oldest, with the events of each one. |
| Overview | Environment, state of settings.json and the vault, settings in effect and next steps. |
| About | Binary, project, license, credits and standards followed. |

The initial tab is Inventory, or the one set in `tui.initialTab` in
settings.json or in `--tab`. On the Inventory tab, `[` and `]` switch the
category; the arrows still switch tabs.

## Keys

| Key | Action |
| --- | --- |
| `←` `→` `[` `]` | previous or next tab |
| `Tab` | next tab |
| `1` … `9` | go to the tab with that number |
| `?` | show or hide the key help |
| `q` `Esc` `Ctrl+C` | quit |

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
- no empty space between neighboring panels; inner padding of one cell;
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

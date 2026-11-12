# TUI

The terminal interface opens with `{{bin}}` with no arguments or with
`{{bin}} tui`. It requires stdin and stdout on a TTY; otherwise the process
exits with exit code 8.

## Tabs

Tabs are numbered, and the number key goes straight to the tab.

**Language.** The interface speaks Portuguese by default. The `PT · EN`
switch in the header (click) or the `L` key switches to English and back;
the choice is saved in `tui.language` in settings.json and the current tab
stays open. When `SETUPVIBE_LANG` is set, it pins the language.

**Mouse.** With `tui.mouse` on (the default), click a tab to open it, a
category to select it, an item to see its details and the `◻` marker to
mark it. The **Install** and **Remove** buttons follow the same flow as the
keys: the first click shows the plan, the second runs it. On the Doctor tab
the **Apply safe fixes** button does what `f` does; on Logs a click picks the
run; on Home a click on the next step opens the tab where it is done. Every
key in the bottom bar is also a button, the wheel scrolls the lists and a
click outside closes the help. Hold `Shift` while dragging to select text.
The keyboard stays complete.

| Tab | Content |
| --- | --- |
| 1 Home | Machine (system, variant, architecture, edition), state (init, user, channel), items by status with a progress bar, the last run, the recommended next step and the main keys. |
| 2 Inventory | Categories on the left with the `installed/total` count; on the right, the items of the category in columns (status, name, pinned version, installed version) and the symbol legend; below, the item details or the plan. `h`/`l` (or `[`/`]`) switch the category, `j`/`k` move, `g`/`End` go to the first and last item, `space` marks, `i` installs and `r` removes the marked items (or the current one). The first press shows the plan; a second press of the same key runs it, and any other key cancels. The actions run the CLI in another process. The status line sums up the items by status or shows the result of the last action. |
| 3 User | Working user, edition, system and variant, and the checklist grouped in Permissions (sudo group, passwordless sudo), Folders (`~/.setupvibe`, `~/.local/bin` in PATH, `~/.ssh`, `authorized_keys`) and SetupVibe (init and the warning about the `cc`, `cx` and `oc` aliases, which skip the permission prompts). The title shows how many items are pending. |
| 4 Doctor | The same findings as `doctor`, grouped in Problems, Warnings and In order, each with the command that fixes it. `f` applies the safe fixes (`doctor --fix`), marked with `[f]`; `u` refreshes the screen. |
| 5 Logs | Runs in `~/.setupvibe/logs`, newest first, with date, time and command; on the right, the events of each run, with the error message under each failure. |
| 6 About | Binary with the detected system and variant, project, license, credits and the standards followed. |

The initial tab is Home, or the one set in `tui.initialTab` in
settings.json or in `--tab` (`overview`, `inventory`, `user`, `doctor`,
`logs` or `about`). On a terminal with fewer than 110 columns or 32 rows, the
Inventory narrows its columns and spacing; categories and items scroll when
they do not fit.

## Keys

| Key | Action |
| --- | --- |
| `←` `→` `[` `]` | previous or next tab |
| `Tab` | next tab |
| `1` … `6` | go to the tab with that number |
| `L` | switch the language (PT · EN) |
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

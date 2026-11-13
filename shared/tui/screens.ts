/**
 * SetupVibe TUI screens (spec section 10).
 *
 * - Home: the machine, the state of init, the items by status, the last run
 *   and the next step.
 * - Inventory: categories with counts on the left, the items of the category
 *   in columns on the right (status, pinned and installed version), details
 *   or the plan below. `h`/`l` change category, `j`/`k` move, `space` marks,
 *   `i` installs and `r` removes. The first press shows the plan; the second
 *   runs it. Actions run the CLI in a subprocess, so the TUI and the CLI share
 *   one code path.
 * - User: the working user and the checklist, grouped.
 * - Doctor: the same findings as `doctor`, grouped by level, with the fix of
 *   each one; `f` applies the safe fixes.
 * - Logs: the runs, newest first, and their events.
 *
 * Text follows SETUPVIBE_LANG or LANG (see i18n.ts). Colors come from the
 * theme, so the day and night palettes need no change here.
 */
import { BoxRenderable, ScrollBoxRenderable, TextAttributes, TextRenderable, bg, bold, fg, t, type CliRenderer, StyledText } from "@opentui/core";
import { agentAliasesEnabled } from "../shell/config.ts";
import { manifest } from "../core/app/manifest.ts";
import { edition } from "../core/app/edition.ts";
import { panel } from "../core/tui/components.ts";
import type { Theme } from "../core/tui/theme.ts";
import type { Screen } from "../core/tui/screen.ts";
import type { Inventory } from "../inventory.ts";
import { detectSystem } from "../system/detect.ts";
import { readState } from "../state/store.ts";
import type { InitRecord } from "../init/plan.ts";
import type { SelectedItem } from "../ops/inventory-ops.ts";
import { selfArgv } from "../commands/auto.ts";
import { machineFindings } from "../commands/maintenance.ts";
import { tr, tuiLanguage, type TextKey } from "./i18n.ts";
import { icon } from "./icons.ts";
import { tint } from "./style.ts";
import {
  currentGroups,
  fit,
  inventoryModel,
  logEvents,
  logFiles,
  markable,
  planFromEnvelope,
  progressBar,
  runLabel,
  statusCounts,
  STATUS_GLYPH,
  sudoWithoutPassword,
  userChecklist,
  userName,
  type InventoryCategory,
  type InventoryRow,
} from "./model.ts";

function state() {
  const config = readState<Record<string, unknown>>("config.json", {});
  const selection = readState<{ items?: SelectedItem[] }>("selection.json", {}).items ?? [];
  return { config, selection, init: config.init as InitRecord | undefined };
}

function machine() {
  const inventory = edition().inventory as Inventory;
  return { inventory, detected: detectSystem(inventory.systems) };
}

/** Theme color of an item status. */
function statusColor(theme: Theme, status: string): string {
  if (status === "installed") return theme.ok;
  if (status === "outdated" || status === "other") return theme.warn;
  if (status === "failed") return theme.error;
  if (status === "available") return theme.accent;
  return theme.textDim;
}

const statusText = (status: string) => tr(`status.${status}` as TextKey);
const variantText = (variant: string | undefined) => (variant ? tr(`variant.${variant}` as TextKey) : "-");

/** A text line that can be rewritten; styled content allowed. */
function line(renderer: CliRenderer, theme: Theme, options: { bold?: boolean; wrap?: boolean; height?: number } = {}): TextRenderable {
  return new TextRenderable(renderer, {
    content: "",
    fg: theme.text,
    wrapMode: options.wrap ? "word" : "none",
    ...(options.height ? { height: options.height } : {}),
    ...(options.bold ? { attributes: TextAttributes.BOLD } : {}),
    flexShrink: 0,
  });
}

/** Section title inside a panel. */
function sectionTitle(renderer: CliRenderer, theme: Theme, text: string, color?: string): TextRenderable {
  return new TextRenderable(renderer, { content: t`${fg(color ?? theme.textStrong)(text)}`, attributes: TextAttributes.BOLD, height: 1, flexShrink: 0 });
}

/**
 * A row with a fixed lead (glyph, label) and text that wraps under itself,
 * not under the lead.
 */
function hangingRow(renderer: CliRenderer, lead: StyledText | string, leadWidth: number, body: StyledText | string): BoxRenderable {
  const row = new BoxRenderable(renderer, { flexDirection: "row", flexShrink: 0 });
  row.add(new TextRenderable(renderer, { content: lead, width: leadWidth, flexShrink: 0, wrapMode: "none" }));
  row.add(new TextRenderable(renderer, { content: body, flexGrow: 1, flexShrink: 1, minWidth: 0, wrapMode: "word" }));
  return row;
}

/** A clickable label drawn as a button. */
function button(renderer: CliRenderer, theme: Theme, label: string, color: string, onClick: () => void): TextRenderable {
  const b = new TextRenderable(renderer, { content: ` ${label} `, fg: theme.keyText, bg: color, flexShrink: 0, height: 1, selectable: false });
  b.onMouseDown = (e) => {
    e.stopPropagation();
    onClick();
  };
  return b;
}

function gap(renderer: CliRenderer, height = 1): BoxRenderable {
  return new BoxRenderable(renderer, { height, flexShrink: 0 });
}

function clear(box: ScrollBoxRenderable): void {
  for (const child of box.getChildren()) box.remove(child);
}

function scrollBox(renderer: CliRenderer, theme: Theme): ScrollBoxRenderable {
  return new ScrollBoxRenderable(renderer, { flexGrow: 1, minHeight: 0, scrollY: true, scrollX: false, backgroundColor: theme.surface, contentOptions: { flexDirection: "column" } });
}

/** Runs the CLI in a subprocess and returns its exit code and stdout. */
async function runCli(args: string[]): Promise<{ code: number; out: string }> {
  const proc = Bun.spawn([...selfArgv(), ...args], { stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const out = await new Response(proc.stdout).text();
  return { code: await proc.exited, out };
}

/* ------------------------------------------------------------- Inventory */

/** Which list of the Inventory takes j/k: categories or tools (c, f or Tab switch). */
type InventoryFocus = "categories" | "items";

/**
 * Colors of a list block: the selected block of the focused list is a full
 * accent bar with light text; in the other list the selection stays subtle.
 */
function blockColors(theme: Theme, selected: boolean, focused: boolean) {
  if (selected && focused) return { bg: tint(theme.accent, theme.surface, 0.2), strong: theme.textStrong, text: theme.text, dim: theme.text, bar: theme.accent };
  if (selected) return { bg: theme.surfaceHigh, strong: theme.textStrong, text: theme.text, dim: theme.textDim, bar: theme.accent };
  return { bg: theme.surface, strong: theme.text, text: theme.text, dim: theme.textDim, bar: theme.surface };
}

/** States that ask for attention get a filled tag; the others are quiet colored text. */
const LOUD = new Set(["outdated", "failed"]);
/** States that color the left edge of an item; the rest keep it neutral. */
const EDGE = new Set(["installed", "outdated", "failed"]);

/** Status tag of an item, right-aligned in `width` cells. */
function statusTag(theme: Theme, status: string, width: number) {
  const color = statusColor(theme, status);
  const text = `${STATUS_GLYPH[status] ?? " "} ${statusText(status)}`;
  if (LOUD.has(status)) return bg(color)(fg(theme.background)(bold(` ${text} `.padStart(width))));
  return fg(status === "other" || status === "init" || status === "system" || status === "gui" || status === "unavailable" ? theme.textDim : color)(`${text} `.padStart(width));
}

/**
 * An item as a two-line block. Line one: a left edge in the status color
 * (installed, outdated, failed), the check box and the name in bold, with the
 * status tag on the right. Line two: the description, with the pinned version
 * (or installed → pinned, when they differ) on the right.
 */
function itemBlock(theme: Theme, r: InventoryRow, marked: boolean, selected: boolean, focused: boolean, width: number): StyledText {
  const c = blockColors(theme, selected, focused);
  // Neutral states leave the edge empty, so the band behind shows through.
  const edge = selected ? fg(theme.accent)("▌") : EDGE.has(r.status) ? fg(statusColor(theme, r.status))("▎") : fg(c.dim)(" ");
  const box = markable(r) ? fg(marked ? theme.accent : selected ? theme.text : theme.textDim)(icon(marked ? "check" : "uncheck") || (marked ? "■" : "□")) : " ";
  const tagWidth = Math.max(statusText(r.status).length + 4, 21);
  const nameWidth = Math.max(10, width - tagWidth - 5);
  const nameColor = marked ? theme.accent : r.status === "unavailable" ? theme.textDim : c.strong;
  const version = r.installed && r.installed !== r.item.version ? `${r.installed} → ${r.item.version}` : r.item.version;
  // Ends one cell before the edge, like the status tag above it.
  const descWidth = Math.max(10, width - version.length - 8);
  const versionColor = r.status === "outdated" ? theme.warn : r.status === "unavailable" ? theme.textDim : theme.accentSecondary;
  return t`${edge} ${box}  ${bold(fg(nameColor)(fit(r.item.name, nameWidth)))}${statusTag(theme, r.status, tagWidth)}
${edge}    ${fg(c.dim === theme.text ? theme.text : theme.textDim)(fit(r.item.description[tuiLanguage()], descWidth))}  ${fg(versionColor)(version.padStart(1))} `;
}

/** Counts of the shown category, plus the marks and what i/r do with them. */
function listSummary(theme: Theme, rows: InventoryRow[], marks: number): StyledText {
  const counts = statusCounts(rows);
  const parts: StyledText[] = [];
  const add = (n: number, status: string, label: string) => {
    if (n) parts.push(t`${fg(statusColor(theme, status))(`${STATUS_GLYPH[status]} ${n}`)} ${fg(theme.textDim)(label)}`);
  };
  add(counts.installed, "installed", tr("summary.installed"));
  add(counts.outdated, "outdated", tr("summary.outdated"));
  add(counts.failed, "failed", tr("status.failed"));
  add(counts.available, "available", tr("summary.available"));
  add(counts.other, "other", tr("summary.other"));
  const chunks = parts.flatMap((p, i) => (i ? [fg(theme.border)("   "), ...p.chunks] : [...p.chunks]));
  const tail = marks ? [fg(theme.border)("   │  "), fg(theme.accent)(`${icon("check") || "■"} ${marks} ${tr("inv.marked")}`)] : [];
  return new StyledText([fg(theme.text)(" "), ...chunks, ...tail]);
}

/** Thin progress line: the done part in the status color, the rest dim. */
function thinBar(done: number, total: number, width: number): [string, string] {
  const filled = total > 0 ? Math.round((done / total) * width) : 0;
  return ["━".repeat(filled), "─".repeat(Math.max(0, width - filled))];
}

/** A category as a two-line block: name in bold and the count; below, a thin progress line. */
function categoryBlock(theme: Theme, title: string, done: number, total: number, selected: boolean, focused: boolean, width: number): StyledText {
  const c = blockColors(theme, selected, focused);
  const strongSel = selected && focused;
  const complete = total > 0 && done === total;
  const count = `${done}/${total}`;
  const [on, off] = thinBar(done, total, Math.max(6, width - 3));
  return t`${fg(c.bar)("▌")} ${bold(fg(c.strong)(fit(title, width - count.length - 3)))} ${fg(complete && !strongSel ? theme.ok : c.dim)(count)}
${fg(c.bar)("▌")} ${fg(theme.ok)(on)}${fg(theme.border)(off)}`;
}

export const inventoryScreen: Screen = (() => {
  let categories: InventoryCategory[] = [];
  let cat = 0;
  let row = 0;
  const marked = new Set<string>();
  let focus: InventoryFocus = "items";
  let refresh = () => {};
  let busy = false;
  let message: { text: string; level: "info" | "ok" | "error" } | undefined;
  /** Plan shown by the first key press; the second press of the same key runs it. */
  let pending: { verb: "install" | "remove"; ids: string[] } | undefined;
  let planLines: string[] = [];

  const load = () => {
    const { inventory, detected } = machine();
    const { selection } = state();
    categories = detected.system ? inventoryModel(inventory, detected.system, detected.headless, selection, tuiLanguage()) : [];
    cat = Math.min(cat, Math.max(0, categories.length - 1));
  };

  const say = (text: string, level: "info" | "ok" | "error" = "info") => {
    message = { text, level };
    refresh();
  };

  const run = (verb: "install" | "remove") => {
    if (busy) return;
    const current = categories[cat]?.rows[row];
    const ids = marked.size ? [...marked] : current && markable(current) ? [current.item.id] : [];
    if (!ids.length) return say(tr("inv.nothing"));
    const confirmed = pending && pending.verb === verb && pending.ids.join(" ") === ids.join(" ");
    const base = verb === "remove" ? ["remove", ...ids, "--yes"] : ["install", ...ids];
    const verbText = tr(`verb.${verb}`);
    busy = true;
    if (!confirmed) {
      // First press: dry run, show the steps and wait for the same key again.
      say(tr("inv.planning"));
      void runCli([...base, "--dry-run", "--json"]).then(({ out }) => {
        busy = false;
        planLines = planFromEnvelope(out);
        pending = { verb, ids };
        say(`${tr("inv.steps", { n: planLines.length })} · ${tr("inv.planHint", { key: verb === "install" ? "i" : "r", verb: verbText })}`);
      });
      return;
    }
    pending = undefined;
    planLines = [];
    say(tr("inv.running", { verb: verbText, ids: ids.join(", ") }));
    void runCli([...base, "--json"]).then(({ code }) => {
      busy = false;
      marked.clear();
      load();
      if (code === 0) say(`✓ ${tr("inv.done", { verb: verbText, ids: ids.join(", ") })}`, "ok");
      else if (code === 13) say(`✗ ${tr("inv.sudo", { cmd: `${manifest.bin} ${base.join(" ")}` })}`, "error");
      else say(`✗ ${tr("inv.failed", { verb: verbText, code })}`, "error");
    });
  };

  return {
    id: "inventory",
    get title() {
      return tr("tab.inventory");
    },
    description: "Pinned tools by category: mark with space, install with i, remove with r",
    get keys() {
      return [
        { key: "c", action: tr("inv.categories").toLowerCase(), press: "c" },
        { key: "f", action: tr("inv.tools").toLowerCase(), press: "f" },
        { key: "j/k", action: tr("key.item"), press: "j" },
        { key: "space", action: tr("key.mark"), press: "space" },
        { key: "i", action: tr("key.install"), press: "i" },
        { key: "r", action: tr("key.remove"), press: "r" },
      ];
    },
    mount: ({ renderer, theme }) => {
      // Each mount is a new session: no marks, plan or message from a previous one.
      marked.clear();
      pending = undefined;
      planLines = [];
      message = undefined;
      busy = false;
      cat = 0;
      row = 0;
      focus = "items";
      load();
      const short = renderer.height < 32;
      const root = new BoxRenderable(renderer, { flexDirection: "column", flexGrow: 1, gap: short ? 0 : 1, paddingTop: short ? 0 : 1 });
      const top = new BoxRenderable(renderer, { flexDirection: "row", flexGrow: 1, gap: 2, minHeight: 6 });

      const leftWidth = renderer.width < 110 ? 28 : 34;
      const left = panel(renderer, theme, { title: tr("inv.categories"), width: leftWidth });
      if (!short) left.add(gap(renderer));
      const catList = scrollBox(renderer, theme);
      left.add(catList);
      const catLines = Array.from({ length: Math.max(categories.length, 1) }, (_, i) => {
        const l = new TextRenderable(renderer, { content: "", height: 2, flexShrink: 0, wrapMode: "none" });
        l.onMouseDown = () => {
          if (!categories[i]) return;
          cat = i;
          row = 0;
          focus = "categories";
          pending = undefined;
          planLines = [];
          message = undefined;
          refresh();
        };
        catList.add(l);
        return l;
      });

      const right = panel(renderer, theme, { title: tr("inv.items"), flexGrow: 1, active: true });
      const summary = line(renderer, theme, { height: 1 });
      right.add(summary);
      if (!short) right.add(gap(renderer));
      const list = scrollBox(renderer, theme);
      right.add(list);
      // Items are two-line blocks, one under the other; the whole category usually fits.
      const itemWidth = Math.max(40, renderer.width - leftWidth - 10);
      const poolSize = Math.max(...categories.map((c) => c.rows.length), 1);
      const itemLines: TextRenderable[] = [];
      const itemBoxes = Array.from({ length: poolSize }, (_, i) => {
        const box = new BoxRenderable(renderer, { flexDirection: "column", height: 2, flexShrink: 0 });
        const l = new TextRenderable(renderer, { content: "", height: 2, flexShrink: 0, wrapMode: "none" });
        box.add(l);
        box.onMouseDown = (e) => {
          const r = categories[cat]?.rows[i];
          if (!r) return;
          row = i;
          focus = "items";
          // The first cells of the block hold the marker: a click there marks.
          if (e.x - box.x <= 3 && markable(r)) {
            if (marked.has(r.item.id)) marked.delete(r.item.id);
            else marked.add(r.item.id);
          }
          if (!busy && !pending) message = undefined;
          refresh();
        };
        list.add(box);
        itemLines.push(l);
        return box;
      });
      top.add(left);
      top.add(right);

      const detail = panel(renderer, theme, { title: tr("inv.details"), height: short ? 7 : 10 });
      const detailBody = new BoxRenderable(renderer, { flexDirection: "row", gap: 3, flexGrow: 1, paddingTop: short ? 0 : 1 });
      const detailLeft = new BoxRenderable(renderer, { flexDirection: "column", flexGrow: 1, flexShrink: 1, minWidth: 0 });
      const detailTitle = line(renderer, theme, { bold: true, height: 1 });
      const detailText = line(renderer, theme, { wrap: true });
      detailLeft.add(detailTitle);
      if (!short) detailLeft.add(gap(renderer));
      detailLeft.add(detailText);
      // Short terminals: the description gives way to the buttons below it.
      if (short) {
        detailText.flexShrink = 1;
        detailText.minHeight = 0;
        detailText.overflow = "hidden";
      }
      const factsBox = new BoxRenderable(renderer, { width: Math.min(54, Math.floor(renderer.width * 0.45)), flexShrink: 0, flexDirection: "column" });
      // On short terminals each fact keeps one line, so a long path cannot push into the counts below.
      const detailFacts = line(renderer, theme, { wrap: !short });
      factsBox.add(detailFacts);
      const actions = new BoxRenderable(renderer, { flexDirection: "row", gap: 2, height: 1, flexShrink: 0, marginTop: short ? 0 : 1 });
      actions.add(button(renderer, theme, `i  ${tr("btn.install")}`, theme.keyBackground, () => run("install")));
      actions.add(button(renderer, theme, `r  ${tr("btn.remove")}`, theme.border, () => run("remove")));
      // The five facts fill a short panel, so there the buttons go under the description.
      if (short) {
        detailLeft.add(new BoxRenderable(renderer, { flexGrow: 1, minHeight: 0 }));
        detailLeft.add(actions);
      } else factsBox.add(actions);
      detailBody.add(detailLeft);
      detailBody.add(factsBox);
      detail.add(detailBody);

      const status = line(renderer, theme, { height: 1 });
      root.add(top);
      root.add(detail);
      root.add(status);

      const dim = fg(theme.textDim);

      refresh = () => {
        const c = categories[cat];
        // The focused list gets the accent border and its key in the title.
        left.borderColor = focus === "categories" ? theme.borderActive : theme.border;
        left.titleColor = focus === "categories" ? theme.accent : theme.textDim;
        right.borderColor = focus === "items" ? theme.borderActive : theme.border;
        right.titleColor = focus === "items" ? theme.accent : theme.textDim;
        left.title = ` c · ${icon("categories")}  ${tr("inv.categories")} `;
        catLines.forEach((l, i) => {
          const category = categories[i];
          if (!category) {
            l.content = "";
            return;
          }
          const counts = statusCounts(category.rows);
          const done = counts.installed + counts.outdated + counts.failed;
          const selected = i === cat;
          l.content = categoryBlock(theme, `${icon(category.id)}  ${category.title}`, done, counts.markable, selected, focus === "categories", leftWidth - 6);
          l.bg = blockColors(theme, selected, focus === "categories").bg;
        });
        right.title = ` f · ${c ? icon(c.id) : icon("inventory")} ${c?.title ?? tr("inv.items")} · ${c?.rows.length ?? 0}${marked.size ? ` · ${marked.size} ${tr("inv.marked")}` : ""} `;
        summary.content = c ? listSummary(theme, c.rows, marked.size) : "";
        itemBoxes.forEach((box, i) => {
          const r = c?.rows[i];
          box.visible = Boolean(r);
          if (!r) return;
          const selected = i === row;
          itemLines[i]!.content = itemBlock(theme, r, marked.has(r.item.id), selected, focus === "items", itemWidth);
          // Every other item gets a faint band so the two-line blocks read apart.
          const base = blockColors(theme, selected, focus === "items").bg;
          itemLines[i]!.bg = !selected && i % 2 === 1 ? tint(theme.text, theme.surface, 0.035) : base;
        });
        if (itemBoxes[row]) list.scrollChildIntoView(itemBoxes[row]!);
        if (catLines[cat]) catList.scrollChildIntoView(catLines[cat]!);

        const r = c?.rows[row];
        if (planLines.length && pending) {
          detail.title = ` ${icon("plan")}  ${tr("inv.plan")} · ${tr(`verb.${pending.verb}`)} ${pending.ids.join(", ")} `;
          detail.borderColor = theme.warn;
          detailTitle.content = t`${fg(theme.warn)(tr("inv.steps", { n: planLines.length }))}`;
          detailText.content = planLines.slice(0, 5).join("\n") + (planLines.length > 5 ? `\n… +${planLines.length - 5}` : "");
          detailFacts.content = t`${fg(theme.textStrong)(tr("inv.planHint", { key: pending.verb === "install" ? "i" : "r", verb: tr(`verb.${pending.verb}`) }))}`;
        } else if (r) {
          detail.title = ` ${icon("details")}  ${tr("inv.details")} `;
          detail.borderColor = theme.border;
          detailTitle.content = t`${fg(theme.textStrong)(r.item.name)}   ${dim(r.item.id)}`;
          const note = r.status === "gui" ? `\n\n${r.item.id === "nerd-fonts" ? tr("inv.fontsNote") : tr("inv.guiNote")}` : "";
          detailText.content = `${r.item.description[tuiLanguage()]}${note}`;
          const k = (key: TextKey) => dim(fit(tr(key), 12));
          detailFacts.content = t`${k("inv.pinned")}${fg(theme.text)(`${r.item.version} (${r.item.versionPolicy})`)}\n${k("inv.installedVersion")}${fg(r.installed ? theme.ok : theme.textDim)(r.installed ?? "-")}\n${k("inv.method")}${fg(theme.text)(r.method)}\n${k("inv.status")}${fg(statusColor(theme, r.status))(`${STATUS_GLYPH[r.status] ?? ""} ${statusText(r.status)}`)}\n${r.elsewhere ? k("inv.elsewhere") : k("inv.site")}${fg(r.elsewhere ? theme.warn : theme.accentSecondary)(r.elsewhere ?? r.item.homepage)}`;
        } else {
          detail.title = ` ${icon("details")}  ${tr("inv.details")} `;
          detailTitle.content = "";
          detailText.content = tr("inv.unsupported");
          detailFacts.content = "";
        }

        if (message) {
          const color = message.level === "ok" ? theme.ok : message.level === "error" ? theme.error : theme.textStrong;
          status.content = t`${fg(color)(` ${message.text}`)}`;
        } else {
          const all = statusCounts(categories.flatMap((x) => x.rows));
          status.content = t` ${fg(theme.ok)(`● ${all.installed} ${tr("summary.installed")}`)}    ${fg(theme.warn)(`↑ ${all.outdated} ${tr("summary.outdated")}`)}    ${fg(theme.accent)(`○ ${all.available} ${tr("summary.available")}`)}    ${fg(theme.warn)(`◐ ${all.other} ${tr("summary.other")}`)}`;
        }
      };
      refresh();
      return root;
    },
    onEnter: () => {
      load();
      refresh();
    },
    onKey: (name) => {
      const c = categories[cat];
      if (name === "i") {
        run("install");
        return true;
      }
      if (name === "r") {
        run("remove");
        return true;
      }
      // Any other key cancels a plan waiting for confirmation and clears old messages.
      const cancelled = Boolean(pending);
      pending = undefined;
      planLines = [];
      const nextCategory = (delta: number) => {
        cat = (cat + delta + categories.length) % Math.max(categories.length, 1);
        row = 0;
      };
      if (name === "c") {
        focus = "categories";
      } else if (name === "f") {
        focus = "items";
      } else if (name === "tab") {
        focus = focus === "items" ? "categories" : "items";
      } else if (name === "l" || name === "]" || name === "right") {
        nextCategory(1);
      } else if (name === "h" || name === "[" || name === "left") {
        nextCategory(-1);
      } else if (name === "j" || name === "down") {
        if (focus === "categories") nextCategory(1);
        else row = Math.min(row + 1, (c?.rows.length ?? 1) - 1);
      } else if (name === "k" || name === "up") {
        if (focus === "categories") nextCategory(-1);
        else row = Math.max(row - 1, 0);
      } else if (name === "g" || name === "home") {
        row = 0;
      } else if (name === "end") {
        row = Math.max((c?.rows.length ?? 1) - 1, 0);
      } else if (name === "space" || name === " ") {
        const r = c?.rows[row];
        if (r && markable(r)) {
          if (marked.has(r.item.id)) marked.delete(r.item.id);
          else marked.add(r.item.id);
        }
      } else {
        if (cancelled) {
          message = { text: tr("inv.cancelled"), level: "info" };
          refresh();
        }
        return false;
      }
      if (!busy) message = cancelled ? { text: tr("inv.cancelled"), level: "info" } : undefined;
      refresh();
      return true;
    },
  };
})();

/* ------------------------------------------------------------------ User */

/** Portuguese text of the checklist labels and fixed details (the model stays in English). */
const CHECKLIST_PT: Record<string, string> = {
  "sudo or wheel group": "grupo sudo ou wheel",
  "sudo without password": "sudo sem senha",
  "~/.setupvibe is 700": "~/.setupvibe com modo 700",
  "~/.local/bin in PATH": "~/.local/bin no PATH",
  "~/.ssh is 700": "~/.ssh com modo 700",
  "authorized_keys is 600": "authorized_keys com modo 600",
  "init completed": "init concluído",
  "agent aliases off": "aliases dos agentes desligados",
  "agent aliases skip permissions": "aliases dos agentes sem confirmação",
  "available (needed by auto)": "disponível (o auto precisa)",
  "asks for a password": "pede senha",
  yes: "sim",
  missing: "não existe",
  "not in PATH": "fora do PATH",
  none: "nenhum",
  "run setupvibe init": "rode setupvibe init",
  "cco, cxo and oco are not defined": "cco, cxo e oco não são criados",
  "cco, cxo and oco bypass prompts; turn off: config set shell.agentAliases false": "cco, cxo e oco pulam as confirmações; para desligar: config set shell.agentAliases false",
};

export const checklistText = (text: string) => (tuiLanguage() === "pt-BR" ? (CHECKLIST_PT[text] ?? text) : text);

export const userScreen: Screen = (() => {
  let refresh = () => {};
  return {
    id: "user",
    get title() {
      return tr("tab.user");
    },
    description: "Working user, permissions and folders",
    mount: ({ renderer, theme }) => {
      const root = new BoxRenderable(renderer, { flexDirection: "row", flexGrow: 1, gap: 2, paddingTop: 1 });
      const who = panel(renderer, theme, { title: `${icon("user")}  ${tr("user.who")}`, width: 48, active: true });
      const whoText = line(renderer, theme);
      const createText = line(renderer, theme, { wrap: true });
      who.add(gap(renderer));
      who.add(whoText);
      who.add(gap(renderer, 2));
      who.add(createText);

      const checks = panel(renderer, theme, { title: "Checklist", flexGrow: 1 });
      const checksBody = scrollBox(renderer, theme);
      checks.add(checksBody);
      root.add(who);
      root.add(checks);

      refresh = () => {
        const { config, init } = state();
        const { detected } = machine();
        const dim = fg(theme.textDim);
        const strong = fg(theme.textStrong);
        const k = (key: TextKey) => dim(fit(tr(key), 11));
        whoText.content = t`${k("user.user")}${strong(userName(config))}\n${k("user.edition")}${strong(manifest.edition)}\n${k("user.system")}${strong(detected.name)}\n${k("user.variant")}${strong(variantText(detected.variant))}\n${k("user.data")}${strong("~/.setupvibe")}`;
        createText.content = t`${dim(tr("user.create"))}\n${fg(theme.accent)(`${manifest.bin} user create <${tuiLanguage() === "pt-BR" ? "nome" : "name"}>`)}`;

        clear(checksBody);
        const agentAliases = agentAliasesEnabled(config);
        const entries = userChecklist({ groups: currentGroups(), sudoNoPassword: sudoWithoutPassword(), initDone: Boolean(init?.done), agentAliases });
        const pendingCount = entries.filter((e) => !e.ok).length;
        checks.title = ` ${icon("checklist")} Checklist · ${pendingCount ? tr("user.pending", { n: pendingCount }) : `✓ ${tr("user.allGood")}`} `;
        checksBody.add(gap(renderer));
        const groups: Array<["permissions" | "folders" | "setupvibe", TextKey, string]> = [["permissions", "user.permissions", "security"], ["folders", "user.folders", "project"], ["setupvibe", "user.setupvibe", "inventory"]];
        groups.forEach(([group, title, glyph], gi) => {
          if (gi) checksBody.add(gap(renderer));
          checksBody.add(sectionTitle(renderer, theme, `${icon(glyph)}  ${tr(title)}`));
          for (const e of entries.filter((x) => x.group === group)) {
            const label = checklistText(e.label);
            checksBody.add(hangingRow(renderer, t`  ${fg(e.ok ? theme.ok : theme.warn)(e.ok ? "✓" : "!")} ${fg(e.ok ? theme.text : theme.textStrong)(fit(label, 36))}`, 41, t`${fg(e.ok ? theme.textDim : theme.warn)(checklistText(e.detail))}`));
          }
        });
      };
      refresh();
      return root;
    },
    onEnter: () => refresh(),
  };
})();

/* ---------------------------------------------------------------- Doctor */

export const doctorScreen: Screen = (() => {
  let refresh = () => {};
  let busy = false;
  let note: { text: string; ok: boolean } | undefined;
  const fix = () => {
    if (busy) return;
    busy = true;
    note = { text: tr("doctor.fixing"), ok: true };
    refresh();
    void runCli(["doctor", "--fix", "--json"]).then(({ code }) => {
      busy = false;
      note = code === 0 || code === 10 ? { text: `✓ ${tr("doctor.fixed")}`, ok: true } : { text: `✗ ${tr("doctor.fixFailed", { code })}`, ok: false };
      refresh();
    });
  };
  return {
    id: "doctor",
    get title() {
      return tr("tab.doctor");
    },
    description: "The same findings as doctor, with the fix of each one",
    get keys() {
      return [
        { key: "f", action: tr("key.fix"), press: "f" },
        { key: "u", action: tr("key.refresh"), press: "u" },
      ];
    },
    mount: ({ renderer, theme }) => {
      const root = new BoxRenderable(renderer, { flexDirection: "column", flexGrow: 1, gap: 1, paddingTop: 1 });
      const box = panel(renderer, theme, { title: `${icon("doctor")}  ${tr("doctor.title")}`, flexGrow: 1, active: true });
      const summary = line(renderer, theme, { height: 1 });
      const body = scrollBox(renderer, theme);
      box.add(gap(renderer));
      const top = new BoxRenderable(renderer, { flexDirection: "row", gap: 3, height: 1, flexShrink: 0 });
      summary.flexGrow = 1;
      summary.flexShrink = 1;
      top.add(summary);
      top.add(button(renderer, theme, `f  ${tr("btn.fix")}`, theme.keyBackground, fix));
      box.add(top);
      box.add(gap(renderer));
      box.add(body);
      const status = line(renderer, theme, { height: 1 });
      root.add(box);
      root.add(status);

      refresh = () => {
        const { detected } = machine();
        clear(body);
        let findings: ReturnType<typeof machineFindings> = [];
        try {
          findings = machineFindings();
        } catch (e) {
          findings = [{ id: "error", level: "fail", text: (e as Error).message }];
        }
        const fail = findings.filter((f) => f.level === "fail");
        const warn = findings.filter((f) => f.level === "warn");
        const ok = findings.filter((f) => f.level === "ok");
        // The system is already in the header band; here only the counts.
        summary.content = t`${bold(fg(fail.length ? theme.error : warn.length ? theme.warn : theme.ok)(tr("doctor.summary", { fail: fail.length, warn: warn.length, ok: ok.length })))}`;
        const group = (title: string, color: string, glyph: string, list: typeof findings, withFix: boolean) => {
          if (!list.length) return;
          body.add(sectionTitle(renderer, theme, `${title} (${list.length})`, color));
          for (const f of list) {
            body.add(hangingRow(renderer, t`  ${fg(color)(glyph)}`, 5, t`${fg(withFix ? theme.text : theme.textDim)(f.text)}`));
            if (withFix && f.fix) body.add(hangingRow(renderer, t`     ${fg(theme.accent)("→")}`, 8, t`${fg(theme.textDim)(f.fix)}${f.safe ? fg(theme.ok)("   [f]") : ""}`));
          }
          body.add(gap(renderer));
        };
        group(`${icon("error")}  ${tr("doctor.problems")}`, theme.error, "✗", fail, true);
        group(`${icon("warn")}  ${tr("doctor.warnings")}`, theme.warn, "!", warn, true);
        group(`${icon("ok")}  ${tr("doctor.ok")}`, theme.ok, "✓", ok, false);
        status.content = note ? t` ${fg(note.ok ? theme.ok : theme.error)(note.text)}` : "";
      };
      refresh();
      return root;
    },
    onEnter: () => refresh(),
    onKey: (name) => {
      if (name === "u") {
        note = undefined;
        refresh();
        return true;
      }
      if (name === "f") {
        fix();
        return true;
      }
      return false;
    },
  };
})();

/* ------------------------------------------------------------------ Logs */

export const logsScreen: Screen = (() => {
  let files: string[] = [];
  let index = 0;
  let refresh = () => {};
  return {
    id: "logs",
    get title() {
      return tr("tab.logs");
    },
    description: "Run logs in ~/.setupvibe/logs, newest first",
    get keys() {
      return [{ key: "j/k", action: tr("key.log"), press: "j" }];
    },
    mount: ({ renderer, theme }) => {
      const root = new BoxRenderable(renderer, { flexDirection: "row", flexGrow: 1, gap: 2, paddingTop: 1 });
      const left = panel(renderer, theme, { title: `${icon("logs")}  ${tr("logs.runs")}`, width: 36, active: true });
      const runList = scrollBox(renderer, theme);
      left.add(gap(renderer));
      left.add(runList);
      const right = panel(renderer, theme, { title: tr("logs.events"), flexGrow: 1 });
      const events = scrollBox(renderer, theme);
      right.add(gap(renderer));
      right.add(events);
      root.add(left);
      root.add(right);

      refresh = () => {
        files = logFiles();
        index = Math.min(index, Math.max(0, files.length - 1));
        clear(runList);
        clear(events);
        const dim = fg(theme.textDim);
        if (!files.length) {
          const empty = line(renderer, theme, { wrap: true });
          empty.content = t`${fg(theme.textStrong)(tr("logs.empty"))}\n\n${dim(tr("logs.emptyHint"))}`;
          runList.add(empty);
          right.title = ` ${icon("events")}  ${tr("logs.events")} `;
          return;
        }
        let activeLine: TextRenderable | undefined;
        files.forEach((file, i) => {
          const l = line(renderer, theme, { height: 1 });
          const active = i === index;
          l.content = t`${fg(theme.accent)(active ? "▶ " : "  ")}${fg(active ? theme.textStrong : theme.text)(runLabel(file))}`;
          l.bg = active ? theme.surfaceHigh : theme.surface;
          l.onMouseDown = () => {
            index = i;
            refresh();
          };
          runList.add(l);
          if (active) activeLine = l;
        });
        if (activeLine) runList.scrollChildIntoView(activeLine);
        const list = logEvents(files[index]!);
        const failed = list.filter((e) => e.status === "fail").length;
        right.title = ` ${icon("events")} ${runLabel(files[index]!)} · ${list.length}${failed ? ` · ✗ ${failed}` : ""} `;
        for (const e of list) {
          const color = e.status === "ok" ? theme.ok : e.status === "fail" ? theme.error : e.status === "skip" ? theme.textDim : theme.text;
          const glyph = e.status === "ok" ? "✓" : e.status === "fail" ? "✗" : e.status === "skip" ? "-" : "•";
          const l = line(renderer, theme, { height: 1 });
          l.content = t`${dim(e.time)}  ${fg(color)(glyph)} ${fg(theme.text)(fit(e.item || "-", 28))}${dim(e.action)}`;
          events.add(l);
          if (e.message && e.status === "fail") events.add(hangingRow(renderer, "", 12, t`${fg(theme.error)(e.message)}`));
        }
      };
      refresh();
      return root;
    },
    onEnter: () => refresh(),
    onKey: (name) => {
      if (name === "j" || name === "down") index = Math.min(index + 1, files.length - 1);
      else if (name === "k" || name === "up") index = Math.max(index - 1, 0);
      else return false;
      refresh();
      return true;
    },
  };
})();

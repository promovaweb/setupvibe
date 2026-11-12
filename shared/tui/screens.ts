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
import { BoxRenderable, ScrollBoxRenderable, TextAttributes, TextRenderable, fg, t, type CliRenderer, type StyledText } from "@opentui/core";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "../system/home.ts";
import { detectV1Here } from "../legacy/v1.ts";
import { manifest } from "../core/app/manifest.ts";
import { edition } from "../core/app/edition.ts";
import { panel } from "../core/tui/components.ts";
import type { Theme } from "../core/tui/theme.ts";
import type { Screen } from "../core/tui/screen.ts";
import type { Inventory } from "../inventory.ts";
import { detectSystem } from "../system/detect.ts";
import { readState, statePath } from "../state/store.ts";
import type { InitRecord } from "../init/plan.ts";
import { missingPrerequisites } from "../init/plan.ts";
import type { SelectedItem } from "../ops/inventory-ops.ts";
import { selfArgv } from "../commands/auto.ts";
import { machineFindings } from "../commands/maintenance.ts";
import { tr, tuiLanguage, type TextKey } from "./i18n.ts";
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

/* ------------------------------------------------------------------ Home */

export const homeScreen: Screen = (() => {
  let refresh = () => {};
  let nextTab = "inventory";
  return {
    id: "overview",
    get title() {
      return tr("tab.overview");
    },
    description: "Machine, state, items, last run and next step",
    mount: ({ renderer, theme, goTo }) => {
      const root = new BoxRenderable(renderer, { flexDirection: "column", flexGrow: 1, gap: 1, paddingTop: 1 });
      const top = new BoxRenderable(renderer, { flexDirection: "row", gap: 2, height: 10, flexShrink: 0 });
      const machinePanel = panel(renderer, theme, { title: tr("overview.machine"), flexGrow: 3, flexBasis: 0, active: true });
      const statePanel = panel(renderer, theme, { title: tr("overview.state"), flexGrow: 2, flexBasis: 0 });
      const itemsPanel = panel(renderer, theme, { title: tr("overview.items"), flexGrow: 2, flexBasis: 0 });
      const machineText = line(renderer, theme);
      const stateText = line(renderer, theme);
      const itemsText = line(renderer, theme);
      for (const [p, l] of [[machinePanel, machineText], [statePanel, stateText], [itemsPanel, itemsText]] as const) {
        p.add(gap(renderer));
        p.add(l);
        top.add(p);
      }

      const bottom = new BoxRenderable(renderer, { flexDirection: "row", gap: 2, height: 10, flexShrink: 0 });
      const runPanel = panel(renderer, theme, { title: tr("overview.lastRun"), flexGrow: 2, flexBasis: 0 });
      const nextPanel = panel(renderer, theme, { title: tr("overview.next"), flexGrow: 3, flexBasis: 0 });
      const runText = line(renderer, theme, { wrap: true });
      const nextText = line(renderer, theme, { wrap: true });
      runPanel.add(gap(renderer));
      runPanel.add(runText);
      nextPanel.add(gap(renderer));
      nextPanel.add(nextText);
      // A click on the next step opens the tab where it is done.
      nextPanel.onMouseDown = () => goTo(nextTab);
      const keysPanel = panel(renderer, theme, { title: tr("overview.keys"), flexGrow: 2, flexBasis: 0 });
      const keysText = line(renderer, theme);
      keysPanel.add(gap(renderer));
      keysPanel.add(keysText);
      bottom.add(nextPanel);
      bottom.add(runPanel);
      bottom.add(keysPanel);
      root.add(top);
      root.add(bottom);

      refresh = () => {
        const { inventory, detected } = machine();
        const { config, selection, init } = state();
        const dim = fg(theme.textDim);
        const strong = fg(theme.textStrong);
        const k = (key: TextKey) => dim(fit(tr(key), 12));
        machineText.content = detected.unsupportedReason
          ? t`${fg(theme.error)(tr("overview.unsupported"))}\n${dim(detected.unsupportedReason)}`
          : t`${k("user.system")}${strong(detected.name)}\n${k("user.variant")}${strong(variantText(detected.variant))}\n${dim(fit("Arch", 12))}${strong(String(detected.arch))}\n${k("user.edition")}${strong(`${manifest.edition} · v${manifest.version}`)}`;

        const initOk = missingPrerequisites(inventory, init).length === 0;
        stateText.content = t`${k("overview.init")}${fg(initOk ? theme.ok : theme.warn)(initOk ? `✓ ${tr("overview.initDone")}` : `! ${tr("overview.initPending")}`)}\n${k("user.user")}${strong(userName(config))}\n${k("user.data")}${strong("~/.setupvibe")}\n${dim(fit("Canal", 12))}${strong(String(config.channel ?? "stable"))}`;

        const rows = detected.system ? inventoryModel(inventory, detected.system, detected.headless, selection, tuiLanguage()).flatMap((c) => c.rows) : [];
        const c = statusCounts(rows);
        const done = c.installed + c.outdated + c.failed;
        itemsText.content = t`${fg(theme.ok)(progressBar(done, c.markable, 22))}  ${strong(`${done}/${c.markable}`)}\n\n${fg(theme.ok)(`● ${String(c.installed).padStart(3)}`)}  ${dim(tr("summary.installed"))}\n${fg(theme.warn)(`↑ ${String(c.outdated).padStart(3)}`)}  ${dim(tr("summary.outdated"))}\n${fg(theme.accent)(`○ ${String(c.available).padStart(3)}`)}  ${dim(tr("summary.available"))}\n${fg(theme.warn)(`◐ ${String(c.other).padStart(3)}`)}  ${dim(tr("summary.other"))}`;

        const lastRunPath = statePath("last-run.json");
        const files = logFiles();
        if (existsSync(lastRunPath)) {
          try {
            const last = JSON.parse(readFileSync(lastRunPath, "utf8")) as { finishedAt?: string; results?: Array<{ status: string }>; log?: string };
            const ok = (last.results ?? []).filter((r) => r.status === "ok").length;
            const fail = (last.results ?? []).filter((r) => r.status === "fail").length;
            runText.content = t`${strong((last.finishedAt ?? "").replace("T", " ").slice(0, 16))}  ${dim("auto")}\n\n${fg(theme.ok)(`✓ ${ok}`)}   ${fg(fail ? theme.error : theme.textDim)(`✗ ${fail}`)}\n\n${dim(last.log ?? "")}`;
          } catch {
            runText.content = t`${dim(tr("overview.never"))}`;
          }
        } else {
          runText.content = files[0] ? t`${strong(runLabel(files[0]))}` : t`${dim(tr("overview.never"))}`;
        }

        const v1 = detectV1Here(homedir());
        const next: TextKey = v1.found && !config.migratedFromV1 ? "overview.nextMigrate" : !initOk ? "overview.nextInit" : c.failed ? "overview.nextFix" : c.outdated ? "overview.nextUpdate" : done === 0 ? "overview.nextInstall" : "overview.nextNone";
        nextTab = next === "overview.nextFix" || next === "overview.nextInit" || next === "overview.nextMigrate" ? "doctor" : "inventory";
        nextText.content = t`${fg(theme.accent)("→ ")}${strong(tr(next))}`;
        keysText.content = t`${fg(theme.accent)(fit("2", 7))}${dim(tr("overview.keyInventory"))}\n${fg(theme.accent)(fit("space", 7))}${dim(tr("key.mark"))}\n${fg(theme.accent)(fit("i / r", 7))}${dim(`${tr("key.install")} / ${tr("key.remove")}`)}\n${fg(theme.accent)(fit("4  f", 7))}${dim(tr("overview.keyFix"))}\n${fg(theme.accent)(fit("?", 7))}${dim(tr("overview.keyHelp"))}`;
      };
      refresh();
      return root;
    },
    onEnter: () => refresh(),
  };
})();

/* ------------------------------------------------------------- Inventory */

/** Width of the item columns; narrower on small terminals (see `fitColumns`). */
const COL = { lead: 6, name: 26, pinned: 14, installed: 14 };

/** Adjusts the columns to the terminal width. */
function fitColumns(width: number): void {
  const narrow = width < 110;
  COL.name = narrow ? 20 : 26;
  COL.pinned = narrow ? 11 : 14;
  COL.installed = narrow ? 11 : 14;
}

function itemLine(theme: Theme, r: InventoryRow, marked: boolean, active: boolean): StyledText {
  const pointer = active ? "▶" : " ";
  const mark = markable(r) ? (marked ? "◼" : "◻") : " ";
  const color = statusColor(theme, r.status);
  const nameColor = active ? theme.textStrong : r.status === "unavailable" ? theme.textDim : theme.text;
  return t`${fg(theme.accent)(pointer)} ${fg(marked ? theme.accent : theme.textDim)(mark)} ${fg(color)(STATUS_GLYPH[r.status] ?? " ")} ${fg(nameColor)(fit(r.item.name, COL.name))}${fg(theme.textDim)(fit(r.item.version, COL.pinned))}${fg(r.installed ? theme.text : theme.textDim)(fit(r.installed ?? "-", COL.installed))}${fg(color)(statusText(r.status))}`;
}

export const inventoryScreen: Screen = (() => {
  let categories: InventoryCategory[] = [];
  let cat = 0;
  let row = 0;
  const marked = new Set<string>();
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
        { key: "h/l", action: tr("key.category"), press: "l" },
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
      load();
      fitColumns(renderer.width);
      const short = renderer.height < 32;
      const root = new BoxRenderable(renderer, { flexDirection: "column", flexGrow: 1, gap: short ? 0 : 1, paddingTop: short ? 0 : 1 });
      const top = new BoxRenderable(renderer, { flexDirection: "row", flexGrow: 1, gap: 2, minHeight: 6 });

      const left = panel(renderer, theme, { title: tr("inv.categories"), width: renderer.width < 110 ? 28 : 32 });
      if (!short) left.add(gap(renderer));
      const catList = scrollBox(renderer, theme);
      left.add(catList);
      const catLines = Array.from({ length: Math.max(categories.length, 1) }, (_, i) => {
        const l = line(renderer, theme, { height: 1 });
        l.onMouseDown = () => {
          if (!categories[i]) return;
          cat = i;
          row = 0;
          pending = undefined;
          planLines = [];
          message = undefined;
          refresh();
        };
        catList.add(l);
        return l;
      });

      const right = panel(renderer, theme, { title: tr("inv.items"), flexGrow: 1, active: true });
      if (!short) right.add(gap(renderer));
      const header = line(renderer, theme, { height: 1 });
      right.add(header);
      const list = scrollBox(renderer, theme);
      right.add(list);
      const poolSize = Math.max(...categories.map((c) => c.rows.length), 1);
      const itemLines = Array.from({ length: poolSize }, (_, i) => {
        const l = line(renderer, theme, { height: 1 });
        l.onMouseDown = (e) => {
          const r = categories[cat]?.rows[i];
          if (!r) return;
          row = i;
          // The first four cells hold the pointer and the marker: a click there marks.
          if (e.x - l.x <= 3 && markable(r)) {
            if (marked.has(r.item.id)) marked.delete(r.item.id);
            else marked.add(r.item.id);
          }
          if (!busy && !pending) message = undefined;
          refresh();
        };
        list.add(l);
        return l;
      });
      const legend = line(renderer, theme, { height: 1 });
      right.add(legend);
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
      const factsBox = new BoxRenderable(renderer, { width: Math.min(54, Math.floor(renderer.width * 0.45)), flexShrink: 0, flexDirection: "column" });
      const detailFacts = line(renderer, theme, { wrap: true });
      factsBox.add(detailFacts);
      const actions = new BoxRenderable(renderer, { flexDirection: "row", gap: 2, height: 1, flexShrink: 0, marginTop: 1 });
      actions.add(button(renderer, theme, `i  ${tr("btn.install")}`, theme.keyBackground, () => run("install")));
      actions.add(button(renderer, theme, `r  ${tr("btn.remove")}`, theme.border, () => run("remove")));
      factsBox.add(actions);
      detailBody.add(detailLeft);
      detailBody.add(factsBox);
      detail.add(detailBody);

      const status = line(renderer, theme, { height: 1 });
      root.add(top);
      root.add(detail);
      root.add(status);

      const dim = fg(theme.textDim);
      header.content = t`${dim(`${" ".repeat(COL.lead)} ${fit(tr("inv.col.item"), COL.name)}${fit(tr("inv.col.pinned"), COL.pinned)}${fit(tr("inv.col.installed"), COL.installed)}${tr("inv.col.status")}`)}`;
      legend.content = t`${fg(theme.ok)("●")} ${dim(statusText("installed"))}  ${fg(theme.warn)("↑")} ${dim(statusText("outdated"))}  ${fg(theme.accent)("○")} ${dim(statusText("available"))}  ${fg(theme.warn)("◐")} ${dim(statusText("other"))}  ${dim("◆")} ${dim(statusText("system"))}`;

      refresh = () => {
        const c = categories[cat];
        catLines.forEach((l, i) => {
          const category = categories[i];
          if (!category) {
            l.content = "";
            return;
          }
          const counts = statusCounts(category.rows);
          const done = counts.installed + counts.outdated + counts.failed;
          const active = i === cat;
          l.content = t`${fg(theme.accent)(active ? "▶ " : "  ")}${fg(active ? theme.textStrong : theme.text)(fit(category.title, renderer.width < 110 ? 17 : 21))}${fg(counts.markable && done === counts.markable ? theme.ok : theme.textDim)(`${done}/${counts.markable}`.padStart(5))}`;
          l.bg = active ? theme.surfaceHigh : theme.surface;
        });
        right.title = ` ${c?.title ?? tr("inv.items")} · ${c?.rows.length ?? 0}${marked.size ? ` · ${marked.size} ${tr("inv.marked")}` : ""} `;
        itemLines.forEach((l, i) => {
          const r = c?.rows[i];
          l.visible = Boolean(r);
          if (!r) return;
          l.content = itemLine(theme, r, marked.has(r.item.id), i === row);
          l.bg = i === row ? theme.surfaceHigh : theme.surface;
        });
        if (itemLines[row]) list.scrollChildIntoView(itemLines[row]!);
        if (catLines[cat]) catList.scrollChildIntoView(catLines[cat]!);

        const r = c?.rows[row];
        if (planLines.length && pending) {
          detail.title = ` ${tr("inv.plan")} · ${tr(`verb.${pending.verb}`)} ${pending.ids.join(", ")} `;
          detail.borderColor = theme.warn;
          detailTitle.content = t`${fg(theme.warn)(tr("inv.steps", { n: planLines.length }))}`;
          detailText.content = planLines.slice(0, 5).join("\n") + (planLines.length > 5 ? `\n… +${planLines.length - 5}` : "");
          detailFacts.content = t`${fg(theme.textStrong)(tr("inv.planHint", { key: pending.verb === "install" ? "i" : "r", verb: tr(`verb.${pending.verb}`) }))}`;
        } else if (r) {
          detail.title = ` ${tr("inv.details")} `;
          detail.borderColor = theme.border;
          detailTitle.content = t`${fg(theme.textStrong)(r.item.name)}   ${dim(r.item.id)}`;
          const note = r.status === "gui" ? `\n\n${r.item.id === "nerd-fonts" ? tr("inv.fontsNote") : tr("inv.guiNote")}` : "";
          detailText.content = `${r.item.description[tuiLanguage()]}${note}`;
          const k = (key: TextKey) => dim(fit(tr(key), 12));
          detailFacts.content = t`${k("inv.pinned")}${fg(theme.text)(`${r.item.version} (${r.item.versionPolicy})`)}\n${k("inv.installedVersion")}${fg(r.installed ? theme.ok : theme.textDim)(r.installed ?? "-")}\n${k("inv.method")}${fg(theme.text)(r.method)}\n${k("inv.status")}${fg(statusColor(theme, r.status))(`${STATUS_GLYPH[r.status] ?? ""} ${statusText(r.status)}`)}\n${r.elsewhere ? k("inv.elsewhere") : k("inv.site")}${fg(r.elsewhere ? theme.warn : theme.accentSecondary)(r.elsewhere ?? r.item.homepage)}`;
        } else {
          detail.title = ` ${tr("inv.details")} `;
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
      if (name === "l" || name === "]") {
        cat = (cat + 1) % Math.max(categories.length, 1);
        row = 0;
      } else if (name === "h" || name === "[") {
        cat = (cat - 1 + categories.length) % Math.max(categories.length, 1);
        row = 0;
      } else if (name === "j" || name === "down") {
        row = Math.min(row + 1, (c?.rows.length ?? 1) - 1);
      } else if (name === "k" || name === "up") {
        row = Math.max(row - 1, 0);
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
  "cc, cx and oc are not defined": "cc, cx e oc não são criados",
  "cc, cx and oc bypass prompts; turn off: config set shell.agentAliases false": "cc, cx e oc pulam as confirmações; para desligar: config set shell.agentAliases false",
};

const checklistText = (text: string) => (tuiLanguage() === "pt-BR" ? (CHECKLIST_PT[text] ?? text) : text);

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
      const who = panel(renderer, theme, { title: tr("user.who"), width: 48, active: true });
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
        const agentAliases = (config.shell as { agentAliases?: boolean } | undefined)?.agentAliases ?? true;
        const entries = userChecklist({ groups: currentGroups(), sudoNoPassword: sudoWithoutPassword(), initDone: Boolean(init?.done), agentAliases });
        const pendingCount = entries.filter((e) => !e.ok).length;
        checks.title = ` Checklist · ${pendingCount ? tr("user.pending", { n: pendingCount }) : `✓ ${tr("user.allGood")}`} `;
        checksBody.add(gap(renderer));
        const groups: Array<["permissions" | "folders" | "setupvibe", TextKey]> = [["permissions", "user.permissions"], ["folders", "user.folders"], ["setupvibe", "user.setupvibe"]];
        groups.forEach(([group, title], gi) => {
          if (gi) checksBody.add(gap(renderer));
          checksBody.add(sectionTitle(renderer, theme, tr(title)));
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
      const box = panel(renderer, theme, { title: tr("doctor.title"), flexGrow: 1, active: true });
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
        summary.content = t`${fg(theme.textStrong)(`${detected.name} · ${detected.arch} · ${variantText(detected.variant)}`)}     ${fg(fail.length ? theme.error : warn.length ? theme.warn : theme.ok)(tr("doctor.summary", { fail: fail.length, warn: warn.length, ok: ok.length }))}`;
        const group = (title: string, color: string, glyph: string, list: typeof findings, withFix: boolean) => {
          if (!list.length) return;
          body.add(sectionTitle(renderer, theme, `${title} (${list.length})`, color));
          for (const f of list) {
            body.add(hangingRow(renderer, t`  ${fg(color)(glyph)}`, 5, t`${fg(withFix ? theme.text : theme.textDim)(f.text)}`));
            if (withFix && f.fix) body.add(hangingRow(renderer, t`     ${fg(theme.accent)("→")}`, 8, t`${fg(theme.textDim)(f.fix)}${f.safe ? fg(theme.ok)("   [f]") : ""}`));
          }
          body.add(gap(renderer));
        };
        group(tr("doctor.problems"), theme.error, "✗", fail, true);
        group(tr("doctor.warnings"), theme.warn, "!", warn, true);
        group(tr("doctor.ok"), theme.ok, "✓", ok, false);
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
      const left = panel(renderer, theme, { title: tr("logs.runs"), width: 36, active: true });
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
          right.title = ` ${tr("logs.events")} `;
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
        right.title = ` ${runLabel(files[index]!)} · ${list.length}${failed ? ` · ✗ ${failed}` : ""} `;
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

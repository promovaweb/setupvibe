/**
 * SetupVibe TUI screens (spec section 10).
 *
 * - Inventory: categories on the left, items on the right, details below.
 *   `h`/`l` change category, `j`/`k` move, `space` marks, `i` installs and
 *   `r` removes the marked items (or the current one). Actions run the CLI in
 *   a subprocess, so the TUI and the CLI share the same code path.
 * - User: the working user and the checklist of permissions and folders.
 * - Doctor: pending prerequisites, failing and outdated items.
 * - Logs: the run logs, newest first.
 */
import { BoxRenderable, TextRenderable, type CliRenderer } from "@opentui/core";
import { manifest } from "../core/app/manifest.ts";
import { edition } from "../core/app/edition.ts";
import { dim, heading, keyValueTable, panel } from "../core/tui/components.ts";
import type { Theme } from "../core/tui/theme.ts";
import type { Screen } from "../core/tui/screen.ts";
import type { Inventory } from "../inventory.ts";
import { detectSystem } from "../system/detect.ts";
import { readState } from "../state/store.ts";
import type { InitRecord } from "../init/plan.ts";
import type { SelectedItem } from "../ops/inventory-ops.ts";
import { selfArgv } from "../commands/auto.ts";
import {
  currentGroups,
  doctorFindings,
  inventoryModel,
  logFiles,
  logTail,
  markable,
  rowLabel,
  sudoWithoutPassword,
  userChecklist,
  userName,
  type InventoryCategory,
} from "./model.ts";

function state() {
  const config = readState<Record<string, unknown>>("config.json", {});
  const selection = readState<{ items?: SelectedItem[] }>("selection.json", {}).items ?? [];
  return { config, selection, init: config.init as InitRecord | undefined };
}

/** Fixed pool of text rows that can be rewritten in place. */
function rowPool(renderer: CliRenderer, theme: Theme, parent: BoxRenderable, size: number) {
  const rows = Array.from({ length: size }, () => {
    const t = new TextRenderable(renderer, { content: "", height: 1, flexShrink: 0, wrapMode: "none", fg: theme.text });
    parent.add(t);
    return t;
  });
  return {
    set(lines: string[], active = -1) {
      rows.forEach((r, i) => {
        r.content = i < lines.length ? `${i === active ? ">" : " "} ${lines[i]}` : "";
        r.fg = i === active ? theme.accent : theme.text;
        r.bg = i === active ? theme.surfaceHigh : theme.surface;
      });
    },
  };
}

export const inventoryScreen: Screen = (() => {
  let categories: InventoryCategory[] = [];
  let cat = 0;
  let row = 0;
  const marked = new Set<string>();
  let refresh = () => {};
  let busy = false;
  let setStatus: (text: string) => void = () => {};

  const load = () => {
    const inventory = edition().inventory as Inventory;
    const detected = detectSystem(inventory.systems);
    const { selection } = state();
    categories = detected.system ? inventoryModel(inventory, detected.system, detected.headless, selection) : [];
    cat = Math.min(cat, Math.max(0, categories.length - 1));
  };

  const run = (verb: "install" | "remove") => {
    if (busy) return;
    const current = categories[cat]?.rows[row];
    const ids = marked.size ? [...marked] : current && markable(current) ? [current.item.id] : [];
    if (!ids.length) return setStatus("Nothing to do: mark items with space.");
    busy = true;
    setStatus(`${verb} ${ids.join(", ")}…`);
    const args = verb === "remove" ? ["remove", ...ids, "--yes", "--json"] : ["install", ...ids, "--json"];
    const proc = Bun.spawn([...selfArgv(), ...args], { stdin: "ignore", stdout: "pipe", stderr: "pipe" });
    void proc.exited.then((code) => {
      busy = false;
      marked.clear();
      load();
      refresh();
      setStatus(code === 0 ? `✓ ${verb} finished: ${ids.join(", ")}` : code === 13 ? `✗ sudo asks for a password. Run in a terminal: ${manifest.bin} ${args.slice(0, -1).join(" ")}` : `✗ ${verb} exited with ${code}; see the Logs tab.`);
    });
  };

  return {
    id: "inventory",
    title: "Inventory",
    description: "Pinned tools by category: mark with space, install with i, remove with r",
    keys: [
      { key: "h/l", action: "category" },
      { key: "j/k", action: "item" },
      { key: "space", action: "mark" },
      { key: "i", action: "install" },
      { key: "r", action: "remove" },
    ],
    mount: ({ renderer, theme }) => {
      load();
      const root = new BoxRenderable(renderer, { flexDirection: "column", flexGrow: 1 });
      const top = new BoxRenderable(renderer, { flexDirection: "row", flexGrow: 1 });
      const left = panel(renderer, theme, { title: "Categories", width: 28 });
      const right = panel(renderer, theme, { title: "Items", flexGrow: 1, active: true });
      const catRows = rowPool(renderer, theme, left, 12);
      const itemRows = rowPool(renderer, theme, right, Math.max(...categories.map((c) => c.rows.length), 1));
      top.add(left);
      top.add(right);
      const detail = panel(renderer, theme, { title: "Details", height: 7 });
      const detailText = new TextRenderable(renderer, { content: "", fg: theme.text, wrapMode: "word" });
      detail.add(detailText);
      const status = new TextRenderable(renderer, { content: "", height: 1, fg: theme.textDim, wrapMode: "none" });
      root.add(top);
      root.add(detail);
      root.add(status);
      setStatus = (text) => {
        status.content = text;
      };
      refresh = () => {
        const c = categories[cat];
        catRows.set(categories.map((x) => x.title), cat);
        itemRows.set(c ? c.rows.map((r) => rowLabel(r, marked.has(r.item.id))) : [], row);
        const r = c?.rows[row];
        detailText.content = r
          ? `${r.item.name} · ${r.item.description["pt-BR"]}\nVersion ${r.item.version} (${r.item.versionPolicy}) · method ${r.method} · status ${r.status}\n${r.item.homepage}`
          : "This system is not supported by this edition.";
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
      } else if (name === "space" || name === " ") {
        const r = c?.rows[row];
        if (r && markable(r)) {
          if (marked.has(r.item.id)) marked.delete(r.item.id);
          else marked.add(r.item.id);
        }
      } else if (name === "i") {
        run("install");
      } else if (name === "r") {
        run("remove");
      } else {
        return false;
      }
      refresh();
      return true;
    },
  };
})();

export const userScreen: Screen = {
  id: "user",
  title: "User",
  description: "Working user, permissions and folders",
  mount: ({ renderer, theme }) => {
    const root = new BoxRenderable(renderer, { flexDirection: "row", flexGrow: 1 });
    const { config, init } = state();
    const who = panel(renderer, theme, { title: "Working user", width: 40, active: true });
    who.add(keyValueTable(renderer, theme, [
      ["User", userName(config), theme.textStrong],
      ["Edition", manifest.edition],
      ["Data", "~/.setupvibe"],
    ]));
    who.add(dim(renderer, theme, `Create one with: ${manifest.bin} user create <name>`));
    const checks = panel(renderer, theme, { title: "Checklist", flexGrow: 1 });
    const entries = userChecklist({ groups: currentGroups(), sudoNoPassword: sudoWithoutPassword(), initDone: Boolean(init?.done) });
    checks.add(keyValueTable(renderer, theme, entries.map((e) => [`${e.ok ? "✓" : "✗"} ${e.label}`, e.detail, e.ok ? theme.ok : theme.warn])));
    root.add(who);
    root.add(checks);
    return root;
  },
};

export const doctorScreen: Screen = {
  id: "doctor",
  title: "Doctor",
  description: "Pending prerequisites, failing and outdated items",
  mount: ({ renderer, theme }) => {
    const root = panel(renderer, theme, { title: "Doctor", flexGrow: 1, active: true });
    const { selection, init } = state();
    const inventory = edition().inventory as Inventory;
    const detected = detectSystem(inventory.systems);
    root.add(heading(renderer, theme, detected.unsupportedReason ? `✗ ${detected.unsupportedReason}` : `${detected.name} · ${detected.arch} · ${detected.variant}`));
    for (const f of doctorFindings(inventory, init, selection)) {
      root.add(new TextRenderable(renderer, { content: `${f.level === "ok" ? "✓" : f.level === "warn" ? "!" : "✗"} ${f.text}${f.fix ? `  →  ${f.fix}` : ""}`, fg: f.level === "ok" ? theme.ok : f.level === "warn" ? theme.warn : theme.error }));
    }
    return root;
  },
};

export const logsScreen: Screen = (() => {
  let files: string[] = [];
  let index = 0;
  let refresh = () => {};
  return {
    id: "logs",
    title: "Logs",
    description: "Run logs in ~/.setupvibe/logs, newest first",
    keys: [{ key: "j/k", action: "log" }],
    mount: ({ renderer, theme }) => {
      const root = new BoxRenderable(renderer, { flexDirection: "row", flexGrow: 1 });
      const left = panel(renderer, theme, { title: "Runs", width: 46, active: true });
      const right = panel(renderer, theme, { title: "Events", flexGrow: 1 });
      const fileRows = rowPool(renderer, theme, left, 20);
      const eventRows = rowPool(renderer, theme, right, 30);
      root.add(left);
      root.add(right);
      refresh = () => {
        files = logFiles();
        index = Math.min(index, Math.max(0, files.length - 1));
        fileRows.set(files.length ? files.slice(0, 20) : ["No runs yet."], files.length ? index : -1);
        eventRows.set(files[index] ? logTail(files[index]!) : []);
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

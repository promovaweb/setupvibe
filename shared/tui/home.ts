/**
 * Home of the TUI: a bento grid with one card per module (no tabs).
 *
 *   → next step (click to open where it is done)
 *   ┌ 1 Inventory ───────────────┐┌ 4 Doctor ─────────┐
 *   └────────────────────────────┘└───────────────────┘
 *   ┌ 5 Tailscale ┐┌ 3 User ┐┌ 6 Logs ┐┌ 7 About ┐
 *   └─────────────┘└────────┘└────────┘└─────────┘
 *
 * Each card sums up its module. Arrows or h/j/k/l move the selection, Enter
 * or space opens the selected module, a click opens the clicked one and the
 * number keys open a module from anywhere (handled by the TUI assembly). The
 * cards read only local state, so the Home opens instantly; the Tailscale
 * card fills in when `tailscale status` answers.
 */
import { BoxRenderable, TextRenderable, fg, t, type StyledText } from "@opentui/core";
import { manifest } from "../core/app/manifest.ts";
import { edition } from "../core/app/edition.ts";
import { panel } from "../core/tui/components.ts";
import type { Screen, ScreenContext } from "../core/tui/screen.ts";
import type { Inventory } from "../inventory.ts";
import { detectSystem } from "../system/detect.ts";
import { readState } from "../state/store.ts";
import type { InitRecord } from "../init/plan.ts";
import { missingPrerequisites } from "../init/plan.ts";
import type { SelectedItem } from "../ops/inventory-ops.ts";
import { homedir } from "../system/home.ts";
import { detectV1Here } from "../legacy/v1.ts";
import { agentAliasesEnabled } from "../shell/config.ts";
import { collect } from "../tailscale/status.ts";
import { formatDuration, machineInfo } from "../system/info.ts";
import { tailscaleSummary } from "./tailscale.ts";
import { checklistText } from "./screens.ts";
import { tr, tuiLanguage, type TextKey } from "./i18n.ts";
import { currentGroups, doctorFindings, fit, inventoryModel, logEvents, logFiles, progressBar, runLabel, statusCounts, sudoWithoutPassword, userChecklist, userName } from "./model.ts";

/** Card layout in reading order: rows of module ids with their relative widths. */
export const BENTO: Array<Array<{ id: string; grow: number }>> = [
  [
    { id: "inventory", grow: 3 },
    { id: "doctor", grow: 2 },
    { id: "machine", grow: 2 },
  ],
  [
    { id: "tailscale", grow: 2 },
    { id: "user", grow: 2 },
    { id: "logs", grow: 2 },
    { id: "about", grow: 2 },
  ],
];

/** Moves the selection in the grid; returns [row, column]. */
export function moveInBento(row: number, col: number, key: string): [number, number] {
  const rows = BENTO.length;
  if (key === "left" || key === "h") return [row, Math.max(0, col - 1)];
  if (key === "right" || key === "l") return [row, Math.min(BENTO[row]!.length - 1, col + 1)];
  const nextRow = key === "up" || key === "k" ? Math.max(0, row - 1) : key === "down" || key === "j" ? Math.min(rows - 1, row + 1) : row;
  if (nextRow === row) return [row, col];
  // Keep the horizontal position: the card whose span covers the same share of the width.
  const share = (r: number, c: number) => BENTO[r]!.slice(0, c).reduce((s, x) => s + x.grow, 0) / BENTO[r]!.reduce((s, x) => s + x.grow, 0);
  const target = share(row, col);
  let best = 0;
  BENTO[nextRow]!.forEach((_, c) => {
    if (share(nextRow, c) <= target + 1e-9) best = c;
  });
  return [nextRow, best];
}

export function createHomeScreen(modules: () => readonly Screen[]): Screen {
  let row = 0;
  let col = 0;
  let refresh = () => {};
  let context: ScreenContext | undefined;
  const numberOf = (id: string) => modules().findIndex((m) => m.id === id) + 1;
  const titleOf = (id: string) => modules().find((m) => m.id === id)?.title ?? id;

  return {
    id: "overview",
    get title() {
      return tr("tab.overview");
    },
    description: "Bento grid with one card per module",
    get keys() {
      return [
        { key: "←↑↓→", action: tr("home.move") },
        { key: "enter", action: tr("home.open"), press: "return" },
      ];
    },
    mount: (ctx) => {
      context = ctx;
      const { renderer, theme } = ctx;
      const root = new BoxRenderable(renderer, { flexDirection: "column", flexGrow: 1, gap: 1, paddingTop: 1 });
      const next = new TextRenderable(renderer, { content: "", height: 1, flexShrink: 0, wrapMode: "none" });
      root.add(next);
      const bodies = new Map<string, TextRenderable>();
      const cards = new Map<string, BoxRenderable>();
      BENTO.forEach((cells, r) => {
        // Fixed heights keep the grid compact; on short terminals the rows shrink.
        const rowBox = new BoxRenderable(renderer, { flexDirection: "row", gap: 2, height: r === 0 ? 15 : 12, flexShrink: 1, minHeight: 6 });
        cells.forEach((cell, c) => {
          const card = panel(renderer, theme, { title: "", flexGrow: cell.grow, flexBasis: 0 });
          const body = new TextRenderable(renderer, { content: "", wrapMode: "word", flexShrink: 1 });
          card.add(new BoxRenderable(renderer, { height: 1, flexShrink: 0 }));
          card.add(body);
          card.onMouseDown = (e) => {
            e.stopPropagation();
            row = r;
            col = c;
            ctx.open(cell.id);
          };
          rowBox.add(card);
          bodies.set(cell.id, body);
          cards.set(cell.id, card);
        });
        root.add(rowBox);
      });

      let tailscale: ReturnType<typeof tailscaleSummary> | undefined;
      let tailnetLine = "";
      let tailscaleIp = "";
      let tailscaleOnline: string[] = [];
      let nextTarget = "inventory";
      next.onMouseDown = (e) => {
        e.stopPropagation();
        ctx.open(nextTarget);
      };

      refresh = () => {
        const dim = fg(theme.textDim);
        const strong = fg(theme.textStrong);
        const inventory = edition().inventory as Inventory;
        const detected = detectSystem(inventory.systems);
        const config = readState<Record<string, unknown>>("config.json", {});
        const selection = readState<{ items?: SelectedItem[] }>("selection.json", {}).items ?? [];
        const init = config.init as InitRecord | undefined;
        const initOk = missingPrerequisites(inventory, init).length === 0;
        const rows = detected.system ? inventoryModel(inventory, detected.system, detected.headless, selection, tuiLanguage(), () => undefined).flatMap((c) => c.rows) : [];
        const counts = statusCounts(rows);
        const done = counts.installed + counts.outdated + counts.failed;
        const findings = doctorFindings(inventory, init, selection);
        const v1 = detectV1Here(homedir());
        const problems = findings.filter((f) => f.level === "fail").length;
        const warnings = findings.filter((f) => f.level === "warn").length + (v1.found ? 1 : 0);
        const checklist = userChecklist({ groups: currentGroups(), sudoNoPassword: sudoWithoutPassword(), initDone: Boolean(init?.done), agentAliases: agentAliasesEnabled(config) });
        const pending = checklist.filter((e) => !e.ok).length;
        const files = logFiles();
        const lastEvents = files[0] ? logEvents(files[0]) : [];
        const failed = lastEvents.filter((e) => e.status === "fail").length;

        // Next step banner, clickable.
        const step: [TextKey, string] = v1.found && !config.migratedFromV1 ? ["overview.nextMigrate", "doctor"] : !initOk ? ["overview.nextInit", "doctor"] : counts.failed ? ["overview.nextFix", "doctor"] : counts.outdated ? ["overview.nextUpdate", "inventory"] : done === 0 ? ["overview.nextInstall", "inventory"] : ["overview.nextNone", "inventory"];
        nextTarget = step[1];
        next.content = t`${fg(theme.accent)(" → ")}${strong(tr(step[0]))}`;

        const categories = detected.system ? inventoryModel(inventory, detected.system, detected.headless, selection, tuiLanguage(), () => undefined) : [];
        const catLines = categories
          .map((c) => {
            const cc = statusCounts(c.rows);
            const d = cc.installed + cc.outdated + cc.failed;
            return `${fit(c.title, 22)} ${progressBar(d, cc.markable, 12)} ${d}/${cc.markable}`;
          })
          .join("\n");
        const findingLines = findings
          .filter((f) => f.level !== "ok")
          .slice(0, 3)
          .map((f) => `${f.level === "fail" ? "✗" : "!"} ${f.text}`)
          .join("\n");
        const runLines = files
          .slice(0, 4)
          .map((f) => runLabel(f))
          .join("\n");
        const pendingLines = checklist
          .filter((e) => !e.ok)
          .slice(0, 4)
          .map((e) => `! ${checklistText(e.label)}`)
          .join("\n");
        const mi = machineInfo();
        const memPct = mi.memTotal ? Math.round(((mi.memTotal - mi.memAvailable) / mi.memTotal) * 100) : 0;
        const rootDisk = mi.disks.find((d) => d.mount === "/") ?? mi.disks[0];
        const loadPct = Math.round((mi.load[0] / Math.max(mi.cores, 1)) * 100);
        const body: Record<string, StyledText> = {
          machine: t`${strong(mi.hostname)}\n${dim(`${mi.cores} ${tr("mc.cores")} · ${formatDuration(mi.uptimeSec)}`)}\n\n${dim(fit(tr("mc.load"), 9))}${fg(loadPct >= 90 ? theme.error : loadPct >= 75 ? theme.warn : theme.ok)(mi.load[0].toFixed(2))}\n${dim(fit(tr("mc.memory"), 9))}${fg(memPct >= 90 ? theme.error : memPct >= 75 ? theme.warn : theme.ok)(`${progressBar(memPct, 100, 12)} ${memPct}%`)}\n${dim(fit(rootDisk ? tr("mc.disks") : "", 9))}${fg(rootDisk && rootDisk.percent >= 90 ? theme.error : rootDisk && rootDisk.percent >= 75 ? theme.warn : theme.ok)(rootDisk ? `${progressBar(rootDisk.percent, 100, 12)} ${rootDisk.percent}%` : "")}`,
          inventory: t`${fg(theme.ok)(progressBar(done, counts.markable, 30))}  ${strong(`${done}/${counts.markable}`)}\n\n${fg(theme.ok)(`● ${String(counts.installed).padStart(3)}`)} ${dim(tr("summary.installed"))}    ${fg(theme.warn)(`↑ ${String(counts.outdated).padStart(3)}`)} ${dim(tr("summary.outdated"))}\n${fg(theme.accent)(`○ ${String(counts.available).padStart(3)}`)} ${dim(tr("summary.available"))}    ${fg(theme.error)(`✗ ${String(counts.failed).padStart(3)}`)} ${dim(tr("status.failed"))}\n\n${dim(catLines)}`,
          doctor: t`${fg(problems ? theme.error : theme.ok)(`✗ ${problems}`)} ${dim(tr("doctor.problems").toLowerCase())}\n${fg(warnings ? theme.warn : theme.ok)(`! ${warnings}`)} ${dim(tr("doctor.warnings").toLowerCase())}\n\n${initOk ? fg(theme.ok)(`✓ init ${tr("overview.initDone")}`) : fg(theme.warn)(`! init ${tr("overview.initPending")}`)}${v1.found ? fg(theme.warn)(`\n! SetupVibe 1`) : ""}\n\n${dim(findingLines)}`,
          tailscale: tailscale
            ? tailscale.state
              ? t`${fg(tailscale.ok ? theme.ok : theme.warn)(`● ${tailscale.state}`)}  ${strong(tailscaleIp)}\n${dim(tailnetLine)}\n\n${strong(`${tailscale.online}/${tailscale.total}`)} ${dim("online")}\n${dim(tailscaleOnline.slice(0, 4).join("\n"))}`
              : t`${dim(tr("ts.notInstalled"))}`
            : t`${dim(tr("ts.loading"))}`,
          user: t`${strong(userName(config))}\n${pending ? fg(theme.warn)(tr("user.pending", { n: pending })) : fg(theme.ok)(`✓ ${tr("user.allGood")}`)}\n${dim(checklist[1]?.ok ? tr("home.sudoOk") : tr("home.sudoPassword"))}\n\n${fg(theme.warn)(pendingLines)}`,
          logs: files[0] ? t`${strong(runLabel(files[0]))}\n${fg(theme.ok)(`✓ ${lastEvents.length - failed}`)}  ${fg(failed ? theme.error : theme.textDim)(`✗ ${failed}`)}\n\n${dim(runLines)}\n${dim(`${files.length} ${tr("logs.runs").toLowerCase()}`)}` : t`${dim(tr("logs.empty"))}`,
          about: t`${strong(`v${manifest.version}`)}  ${dim(manifest.edition)}\n\n${dim(detected.name)}\n${dim(`${detected.arch} · ${detected.variant ?? ""}`)}`,
        };
        for (const cells of BENTO) {
          for (const cell of cells) {
            const card = cards.get(cell.id)!;
            const selected = BENTO[row]![col]!.id === cell.id;
            card.title = ` ${numberOf(cell.id)} ${titleOf(cell.id)} `;
            card.borderColor = selected ? theme.borderActive : theme.border;
            card.titleColor = selected ? theme.accent : theme.textDim;
            bodies.get(cell.id)!.content = body[cell.id] ?? "";
          }
        }
      };

      refresh();
      void collect().then((s) => {
        tailscale = tailscaleSummary(s);
        tailnetLine = s.tailnet?.name ?? "";
        tailscaleIp = s.self?.ips[0] ?? "";
        tailscaleOnline = s.peers.filter((p) => p.online).map((p) => p.name);
        refresh();
      });
      return root;
    },
    onEnter: () => refresh(),
    onKey: (name) => {
      if (["left", "right", "up", "down", "h", "j", "k", "l"].includes(name)) {
        [row, col] = moveInBento(row, col, name);
        refresh();
        return true;
      }
      if ((name === "return" || name === "enter" || name === "space" || name === " ") && context) {
        context.open(BENTO[row]![col]!.id);
        return true;
      }
      return false;
    },
  };
}


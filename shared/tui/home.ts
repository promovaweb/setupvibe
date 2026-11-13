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
import { BoxRenderable, StyledText, TextRenderable, bold, fg, t } from "@opentui/core";
import { checkForUpdate, type UpdateStatus } from "../state/update.ts";
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
import { LiveSampler, rate, sparkline, type LiveReading } from "../system/live.ts";
import { meter, usageColor } from "./style.ts";
import { tailscaleSummary } from "./tailscale.ts";
import { checklistText } from "./screens.ts";
import { findingText, tr, tuiLanguage, type TextKey } from "./i18n.ts";
import { machineFindings } from "../commands/maintenance.ts";
import type { Finding } from "../ops/maintenance.ts";
import { icon } from "./icons.ts";
import { currentGroups, fit, inventoryModel, logEvents, logFiles, runLabel, statusCounts, sudoWithoutPassword, userChecklist, userName } from "./model.ts";

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
  let refresh = (_full?: boolean) => {};
  let context: ScreenContext | undefined;
  let fast: ReturnType<typeof setInterval> | undefined;
  let slow: ReturnType<typeof setInterval> | undefined;
  let pollTailscale = () => {};
  let sampler = new LiveSampler();
  let live: LiveReading | undefined;
  let update: UpdateStatus | undefined;
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
        { key: "u", action: tr("key.refresh"), press: "u" },
      ];
    },
    mount: (ctx) => {
      context = ctx;
      const { renderer, theme } = ctx;
      const root = new BoxRenderable(renderer, { flexDirection: "column", flexGrow: 1, gap: 1, paddingTop: 1 });
      const next = new TextRenderable(renderer, { content: "", height: 1, flexShrink: 0, wrapMode: "none" });
      root.add(next);
      const bodies = new Map<string, (content: Array<StyledText | string>) => void>();
      const cards = new Map<string, BoxRenderable>();
      BENTO.forEach((cells, r) => {
        // Fixed heights keep the grid compact; on short terminals the rows shrink.
        const rowBox = new BoxRenderable(renderer, { flexDirection: "row", gap: 2, ...(r === 0 ? { height: 18, flexShrink: 1 } : { flexGrow: 1 }), minHeight: 6 });
        cells.forEach((cell, c) => {
          const card = panel(renderer, theme, { title: "", flexGrow: cell.grow, flexBasis: 0 });
          card.add(new BoxRenderable(renderer, { height: 1, flexShrink: 0 }));
          const bodyBox = new BoxRenderable(renderer, { flexDirection: "column", flexGrow: 1, minHeight: 0, overflow: "hidden" });
          card.add(bodyBox);
          // One text line per entry, rewritten on each refresh.
          const body = (content: Array<StyledText | string>) => {
            for (const child of bodyBox.getChildren()) bodyBox.remove(child);
            for (const c of content) bodyBox.add(new TextRenderable(renderer, { content: c, fg: theme.text, flexShrink: 0, wrapMode: "word" }));
          };
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

      // Local state is read when the Home opens, after an action and on u; the
      // live timer only redraws the Machine card from the sampler.
      const gather = () => {
        const inventory = edition().inventory as Inventory;
        const detected = detectSystem(inventory.systems);
        const config = readState<Record<string, unknown>>("config.json", {});
        const selection = readState<{ items?: SelectedItem[] }>("selection.json", {}).items ?? [];
        const init = config.init as InitRecord | undefined;
        const initOk = missingPrerequisites(inventory, init).length === 0;
        const categories = detected.system ? inventoryModel(inventory, detected.system, detected.headless, selection, tuiLanguage(), () => undefined) : [];
        const rows = categories.flatMap((c) => c.rows);
        const counts = statusCounts(rows);
        const done = counts.installed + counts.outdated + counts.failed;
        let findings: Finding[] = [];
        try {
          findings = machineFindings();
        } catch {
          findings = [];
        }
        const v1 = detectV1Here(homedir());
        const problems = findings.filter((f) => f.level === "fail").length;
        const warnings = findings.filter((f) => f.level === "warn").length;
        const checklist = userChecklist({ groups: currentGroups(), sudoNoPassword: sudoWithoutPassword(), initDone: Boolean(init?.done), agentAliases: agentAliasesEnabled(config) });
        const pending = checklist.filter((e) => !e.ok).length;
        const files = logFiles();
        const lastEvents = files[0] ? logEvents(files[0]) : [];
        const failed = lastEvents.filter((e) => e.status === "fail").length;
        // Last runs, oldest first: true when the run had a failed step.
        const history = files.slice(0, 16).reverse().map((file) => logEvents(file).some((e) => e.status === "fail"));
        return { history, inventory, detected, config, init, initOk, counts, done, findings, v1, problems, warnings, checklist, pending, files, lastEvents, failed, categories, mi: machineInfo() };
      };
      let snapshot: ReturnType<typeof gather> | undefined;
      let snapshotAt = 0;

      refresh = (full = false) => {
        // A full refresh re-reads the state; two in a row (mount, then enter) read it once.
        if (!snapshot || (full && Date.now() - snapshotAt > 500)) {
          snapshot = gather();
          snapshotAt = Date.now();
        }
        const { history, detected, config, initOk, counts, done, findings, v1, problems, warnings, checklist, pending, files, lastEvents, failed, categories, mi } = snapshot;
        const dim = fg(theme.textDim);
        const strong = fg(theme.textStrong);

        // Next step banner, clickable.
        const step: [TextKey, string] = v1.found && !config.migratedFromV1 ? ["overview.nextMigrate", "doctor"] : !initOk ? ["overview.nextInit", "doctor"] : counts.failed ? ["overview.nextFix", "doctor"] : counts.outdated ? ["overview.nextUpdate", "inventory"] : done === 0 ? ["overview.nextInstall", "inventory"] : ["overview.nextNone", "inventory"];
        nextTarget = step[1];
        next.content = t`${fg(theme.accent)(" → ")}${strong(tr(step[0]))}`;

        if (!live) live = sampler.tick();
        const l = live;
        const memPct = l.memTotal ? Math.round((l.memUsed / l.memTotal) * 100) : 0;
        const rootDisk = mi.disks.find((d) => d.mount === "/") ?? mi.disks[0];
        const loadPct = Math.round((l.load[0] / Math.max(mi.cores, 1)) * 100);
        const lbl = (text: string, w = 9) => dim(fit(text, w));
        const [invOn, invOff] = meter(theme, done, counts.markable, 34, theme.ok);
        const [cpuOn, cpuOff] = meter(theme, l.cpu, 100, 14);
        const [memOn, memOff] = meter(theme, memPct, 100, 14);
        const [dskOn, dskOff] = meter(theme, rootDisk?.percent ?? 0, 100, 14);
        const netNow = l.net.reduce((acc, n) => ({ rx: acc.rx + n.rxPerSec, tx: acc.tx + n.txPerSec }), { rx: 0, tx: 0 });

        const body: Record<string, Array<StyledText | string>> = {
          inventory: [
            t`${invOn}${invOff}  ${bold(strong(`${done}/${counts.markable}`))}`,
            "",
            t`${fg(theme.ok)(`● ${String(counts.installed).padStart(3)}`)} ${dim(fit(tr("summary.installed"), 14))}${fg(theme.warn)(`↑ ${String(counts.outdated).padStart(3)}`)} ${dim(tr("summary.outdated"))}`,
            t`${fg(theme.accent)(`○ ${String(counts.available).padStart(3)}`)} ${dim(fit(tr("summary.available"), 14))}${fg(theme.error)(`✗ ${String(counts.failed).padStart(3)}`)} ${dim(tr("status.failed"))}`,
            "",
            ...categories.map((c) => {
              const cc = statusCounts(c.rows);
              const d = cc.installed + cc.outdated + cc.failed;
              const [on, off] = meter(theme, d, cc.markable, 14, theme.ok);
              return t`${fg(theme.accent)(icon(c.id))}  ${dim(fit(c.title, 22))}${on}${off} ${dim(`${d}/${cc.markable}`)}`;
            }),
          ],
          doctor: [
            t`${bold(fg(problems ? theme.error : theme.ok)(`✗ ${problems}`))} ${dim(tr("doctor.problems").toLowerCase())}    ${bold(fg(warnings ? theme.warn : theme.ok)(`! ${warnings}`))} ${dim(tr("doctor.warnings").toLowerCase())}`,
            "",
            initOk ? t`${fg(theme.ok)(`✓ init ${tr("overview.initDone")}`)}` : t`${fg(theme.warn)(`! init ${tr("overview.initPending")}`)}`,
            "",
            // Only the head of each finding (before the list of names): the module shows the rest.
            ...[...findings.filter((x) => x.level === "fail"), ...findings.filter((x) => x.level === "warn")].slice(0, 4).map((x) => t`${fg(x.level === "fail" ? theme.error : theme.warn)(x.level === "fail" ? "✗" : "!")} ${dim(findingText(x).split(/: |; /)[0]!)}`),
          ],
          machine: [
            t`${bold(strong(mi.hostname))}`,
            t`${dim(`${mi.cores} ${tr("mc.cores")} · ${formatDuration(l.uptimeSec)}`)}`,
            "",
            t`${lbl("CPU")}${cpuOn}${cpuOff} ${fg(usageColor(theme, l.cpu))(`${l.cpu}%`)}`,
            t`${lbl(tr("mc.ram"))}${memOn}${memOff} ${fg(usageColor(theme, memPct))(`${memPct}%`)}`,
            t`${lbl(tr("mc.disks"))}${dskOn}${dskOff} ${fg(usageColor(theme, rootDisk?.percent ?? 0))(`${rootDisk?.percent ?? 0}%`)}`,
            t`${lbl(tr("mc.load"))}${fg(usageColor(theme, loadPct))(l.load.map((x) => x.toFixed(2)).join("  "))}`,
            t`${lbl(tr("mc.network"))}${fg(theme.ok)(`↓ ${fit(rate(netNow.rx), 11)}`)}${fg(theme.accent)(`↑ ${rate(netNow.tx)}`)}`,
            "",
            t`${lbl(tr("mc.history"))}${fg(theme.accent)(sparkline(l.cpuHistory, 22))}`,
          ],
          tailscale: tailscale
            ? tailscale.state
              ? [
                  t`${fg(tailscale.ok ? theme.ok : theme.warn)(`● ${tailscale.state}`)}`,
                  t`${bold(strong(tailscaleIp))}`,
                  t`${dim(tailnetLine)}`,
                  "",
                  t`${bold(strong(`${tailscale.online}/${tailscale.total}`))} ${dim("online")}`,
                  ...tailscaleOnline.slice(0, 5).map((n) => t`${fg(theme.ok)("●")} ${dim(n)}`),
                ]
              : [t`${dim(tr("ts.notInstalled"))}`]
            : [t`${dim(tr("ts.loading"))}`],
          user: [
            t`${bold(strong(userName(config)))}`,
            pending ? t`${fg(theme.warn)(tr("user.pending", { n: pending }))}` : t`${fg(theme.ok)(`✓ ${tr("user.allGood")}`)}`,
            t`${dim(checklist[1]?.ok ? tr("home.sudoOk") : tr("home.sudoPassword"))}`,
            "",
            ...checklist.filter((e) => !e.ok).slice(0, 5).map((e) => t`${fg(theme.warn)("!")} ${dim(checklistText(e.label))}`),
          ],
          logs: files[0]
            ? [
                t`${bold(strong(runLabel(files[0])))}`,
                t`${fg(theme.ok)(`✓ ${lastEvents.length - failed}`)}  ${fg(failed ? theme.error : theme.textDim)(`✗ ${failed}`)}`,
                "",
                // One mark per run, oldest to newest: green without failures, red with any.
                new StyledText(history.flatMap((bad, i) => [...(i ? [fg(theme.border)(" ")] : []), fg(bad ? theme.error : theme.ok)(bad ? "▮" : "▮")]) as never),
                t`${dim(tr("home.runsHistory", { n: history.length, bad: history.filter(Boolean).length }))}`,
                "",
                ...files.slice(1, 6).map((x) => t`${dim(runLabel(x))}`),
              ]
            : [t`${dim(tr("logs.empty"))}`, "", t`${dim(tr("logs.emptyHint"))}`],
          about: [
            t`${bold(strong(`v${manifest.version}`))}  ${dim(manifest.edition)}`,
            update === undefined
              ? t`${dim(tr("home.updateChecking"))}`
              : update.updateAvailable
                ? t`${fg(theme.warn)(`↑ ${tr("home.updateAvailable", { version: update.latest ?? "?" })}`)}`
                : update.source === "offline"
                  ? t`${dim(tr("home.updateOffline"))}`
                  : t`${fg(theme.ok)(`✓ ${tr("home.updateCurrent")}`)}`,
            ...(counts.outdated ? [t`${fg(theme.warn)(`↑ ${tr("home.itemsOutdated", { n: counts.outdated })}`)}`] : []),
            "",
            t`${dim(detected.name)}`,
            t`${dim(`${detected.arch} · ${detected.variant ?? ""}`)}`,
            t`${dim(tuiLanguage() === "pt-BR" ? "português · PT" : "English · EN")}`,
          ],
        };
        for (const cells of BENTO) {
          for (const cell of cells) {
            const card = cards.get(cell.id)!;
            const selected = BENTO[row]![col]!.id === cell.id;
            card.title = ` ${icon(cell.id)}  ${numberOf(cell.id)} ${titleOf(cell.id)} `;
            // The selected card stands out with a lighter surface, not only the border.
            card.backgroundColor = selected ? theme.surfaceHigh : theme.surface;
            card.borderColor = selected ? theme.borderActive : theme.border;
            card.titleColor = selected ? theme.accent : theme.textDim;
            bodies.get(cell.id)!(body[cell.id] ?? []);
          }
        }
      };

      // Update status for the About card: cache first, a short network check otherwise.
      void checkForUpdate(manifest.version, "stable").then((u) => {
        update = u;
        refresh();
      });

      pollTailscale = () =>
        void collect().then((s) => {
          tailscale = tailscaleSummary(s);
          tailnetLine = s.tailnet?.name ?? "";
          tailscaleIp = s.self?.ips[0] ?? "";
          tailscaleOnline = s.peers.filter((p) => p.online).map((p) => p.name);
          refresh();
        });
      refresh(true);
      pollTailscale();
      return root;
    },
    onEnter: () => {
      refresh(true);
      // Live cards: machine every 2 s, Tailscale every 15 s, while the Home is shown.
      if (fast) clearInterval(fast);
      if (slow) clearInterval(slow);
      sampler = new LiveSampler();
      fast = setInterval(() => {
        live = sampler.tick(5);
        refresh();
      }, 2000);
      slow = setInterval(() => pollTailscale(), 15_000);
      fast.unref?.();
      slow.unref?.();
    },
    onLeave: () => {
      if (fast) clearInterval(fast);
      if (slow) clearInterval(slow);
      fast = undefined;
      slow = undefined;
    },
    onKey: (name) => {
      if (name === "u") {
        refresh(true);
        return true;
      }
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


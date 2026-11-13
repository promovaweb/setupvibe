/**
 * Machine module of the TUI, live.
 *
 *   ┌ System ───────────┐┌ CPU ──────────────────────────────────┐
 *   │ host, OS, kernel… ││ total, 60 s history, load, each core  │
 *   ├ Memory ───────────┤├ Network ──────────────────────────────┤
 *   │ RAM, swap, history││ ↓ ↑ per interface, per second         │
 *   ├ Disks ────────────┤├ Processes ────────────────────────────┤
 *   │ usage, read/write ││ the ones using the most CPU           │
 *
 * Everything refreshes every second while the module is open (processes
 * every two seconds), from a `LiveSampler`. Nothing calls the network.
 */
import { BoxRenderable, TextRenderable, bold, fg, t, type CliRenderer, type StyledText } from "@opentui/core";
import { edition } from "../core/app/edition.ts";
import { panel } from "../core/tui/components.ts";
import type { Screen } from "../core/tui/screen.ts";
import type { Inventory } from "../inventory.ts";
import { detectSystem } from "../system/detect.ts";
import { formatDuration, machineInfo, type MachineInfo } from "../system/info.ts";
import { LiveSampler, rate, sparkline, type LiveReading } from "../system/live.ts";
import { formatBytes } from "../tailscale/status.ts";
import { tr, type TextKey } from "./i18n.ts";
import { fit } from "./model.ts";
import { icon } from "./icons.ts";
import { meter, usageColor } from "./style.ts";

export { usageColor };

/** A panel body made of one text line per entry, rewritten on each refresh. */
function lines(renderer: CliRenderer, parent: BoxRenderable) {
  const box = new BoxRenderable(renderer, { flexDirection: "column", flexGrow: 1, minHeight: 0 });
  parent.add(box);
  return (content: Array<StyledText | string>) => {
    for (const child of box.getChildren()) box.remove(child);
    for (const c of content) box.add(new TextRenderable(renderer, { content: c, height: 1, flexShrink: 0, wrapMode: "none" }));
  };
}

export const machineScreen: Screen = (() => {
  let info: MachineInfo | undefined;
  let sampler = new LiveSampler();
  let live: LiveReading | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let refresh = () => {};

  return {
    id: "machine",
    get title() {
      return tr("tab.machine");
    },
    description: "System, CPU, memory, disks, network and processes of this machine, live",
    get keys() {
      return [{ key: "u", action: tr("key.refresh"), press: "u" }];
    },
    mount: ({ renderer, theme }) => {
      const cores = machineInfo().cores;
      const root = new BoxRenderable(renderer, { flexDirection: "column", flexGrow: 1, gap: 1, paddingTop: 1 });
      const row = (height?: number) => new BoxRenderable(renderer, { flexDirection: "row", gap: 2, ...(height ? { height, flexShrink: 0 } : { flexGrow: 1, minHeight: 6 }) });
      const box = (title: TextKey, grow: number, parent: BoxRenderable, active = false, glyph = "") => {
        const p = panel(renderer, theme, { title: `${icon(glyph)}  ${tr(title)}`, flexGrow: grow, flexBasis: 0, active });
        p.add(new BoxRenderable(renderer, { height: 1, flexShrink: 0 }));
        parent.add(p);
        return lines(renderer, p);
      };
      const r1Height = Math.max(12, 11 + Math.ceil(cores / 2));
      const r1 = row(r1Height);
      const r2 = row(9);
      const r3 = row();
      const sys = box("mc.system", 2, r1, true, "machine");
      const cpu = box("mc.cpuTitle", 3, r1, false, "cpu");
      const mem = box("mc.memory", 2, r2, false, "memory");
      const net = box("mc.network", 3, r2, false, "network");
      const disk = box("mc.disks", 2, r3, false, "disk");
      const proc = box("mc.processes", 3, r3, false, "process");
      root.add(r1);
      root.add(r2);
      root.add(r3);

      refresh = () => {
        if (!info) info = machineInfo();
        if (!live) live = sampler.tick();
        const m = info;
        const l = live;
        const dim = fg(theme.textDim);
        const strong = fg(theme.textStrong);
        const k = (key: TextKey, w = 14) => dim(fit(tr(key), w));
        const pct = (v: number) => fg(usageColor(theme, v))(`${String(v).padStart(3)}%`);
        const detected = detectSystem((edition().inventory as Inventory).systems);

        sys([
          t`${bold(strong(m.hostname))}`,
          t`${dim(detected.name)}`,
          "",
          t`${k("mc.kernel")}${strong(m.kernel)}`,
          t`${k("mc.virt")}${strong(m.virtualization || "-")}  ${dim(m.arch)}`,
          t`${k("user.variant")}${strong(detected.variant ? tr(`variant.${detected.variant}` as TextKey) : "-")}`,
          t`${k("mc.uptime")}${fg(theme.accent)(formatDuration(l.uptimeSec))}`,
          t`${k("user.user")}${strong(m.user)}  ${dim(m.shell)}`,
          t`${k("mc.timezone")}${strong(m.timezone)}`,
          t`${k("mc.processCount")}${strong(String(l.processCount || "-"))}`,
        ]);

        const [cpuOn, cpuOff] = meter(theme, l.cpu, 100, 30);
        const loadPct = Math.round((l.load[0] / Math.max(m.cores, 1)) * 100);
        const temp = l.temps.length ? l.temps.map((x) => `${x.name} ${x.celsius}°C`).join("  ") : tr("mc.noTemp");
        const coreLines: StyledText[] = [];
        for (let i = 0; i < l.perCore.length; i += 2) {
          const a = l.perCore[i]!;
          const b = l.perCore[i + 1];
          const [aOn, aOff] = meter(theme, a, 100, 12);
          if (b === undefined) coreLines.push(t`${dim(`core ${String(i).padStart(2)}`)} ${aOn}${aOff} ${pct(a)}`);
          else {
            const [bOn, bOff] = meter(theme, b, 100, 12);
            coreLines.push(t`${dim(`core ${String(i).padStart(2)}`)} ${aOn}${aOff} ${pct(a)}     ${dim(`core ${String(i + 1).padStart(2)}`)} ${bOn}${bOff} ${pct(b)}`);
          }
        }
        cpu([
          t`${dim(fit(m.cpuModel, 44))}  ${dim(`${m.cores} ${tr("mc.cores")}`)}`,
          "",
          t`${k("mc.cpu", 10)}${cpuOn}${cpuOff} ${bold(fg(usageColor(theme, l.cpu))(`${l.cpu}%`))}`,
          t`${k("mc.history", 10)}${fg(theme.accent)(sparkline(l.cpuHistory, 40))}`,
          t`${k("mc.load", 10)}${fg(usageColor(theme, loadPct))(l.load.map((x) => x.toFixed(2)).join("  "))}  ${dim("1 · 5 · 15 min")}`,
          t`${k("mc.temp", 10)}${dim(temp)}`,
          "",
          ...coreLines,
        ]);

        const memPct = l.memTotal ? Math.round((l.memUsed / l.memTotal) * 100) : 0;
        const swapPct = l.swapTotal ? Math.round((l.swapUsed / l.swapTotal) * 100) : 0;
        const [mOn, mOff] = meter(theme, memPct, 100, 22);
        const [sOn, sOff] = meter(theme, swapPct, 100, 22);
        mem([
          t`${k("mc.ram", 9)}${mOn}${mOff} ${bold(fg(usageColor(theme, memPct))(`${memPct}%`))}`,
          t`${dim(" ".repeat(9))}${dim(`${formatBytes(l.memUsed)} / ${formatBytes(l.memTotal)}`)}`,
          t`${k("mc.swap", 9)}${sOn}${sOff} ${fg(l.swapTotal ? usageColor(theme, swapPct) : theme.textDim)(l.swapTotal ? `${swapPct}%` : tr("ts.none"))}`,
          t`${dim(" ".repeat(9))}${dim(l.swapTotal ? `${formatBytes(l.swapUsed)} / ${formatBytes(l.swapTotal)}` : "")}`,
          t`${k("mc.history", 10)}${fg(theme.accentSecondary)(sparkline(l.memHistory, 30))}`,
        ]);

        const addresses = m.interfaces.slice(0, 3).map((i) => t`${dim(fit(i.name, 13))}${dim(i.addresses.filter((a) => !a.startsWith("fe80")).join("  "))}`);
        net([
          ...l.net.slice(0, 4).map((n) => t`${strong(fit(n.name, 13))}${fg(theme.ok)(`↓ ${fit(rate(n.rxPerSec), 12)}`)}${fg(theme.accent)(`↑ ${fit(rate(n.txPerSec), 12)}`)}${dim(`${formatBytes(n.rxTotal)} ↓  ${formatBytes(n.txTotal)} ↑`)}`),
          ...(addresses.length ? [""] : []),
          ...addresses,
        ]);

        disk([
          ...m.disks.slice(0, 3).map((d) => {
            const [on, off] = meter(theme, d.percent, 100, 14);
            return t`${strong(fit(d.mount, 12))}${on}${off} ${pct(d.percent)}  ${dim(`${formatBytes(d.availKb * 1024)} ${tr("mc.free").toLowerCase()}`)}`;
          }),
          ...(l.disks.length ? [""] : []),
          ...l.disks.slice(0, 3).map((d) => t`${dim(fit(d.name, 12))}${fg(theme.ok)(`R ${fit(rate(d.readPerSec), 12)}`)}${fg(theme.warn)(`W ${rate(d.writePerSec)}`)}`),
        ]);

        proc([
          t`${dim(`${fit("PID", 9)}${fit(tr("mc.procName"), 24)}${fit("CPU", 9)}${fit("MEM", 9)}RSS`)}`,
          ...l.processes.slice(0, Math.max(3, renderer.height - r1Height - 9 - 13)).map((p) => t`${dim(fit(String(p.pid), 9))}${strong(fit(p.name, 24))}${fg(usageColor(theme, Math.min(100, p.cpu)))(fit(`${p.cpu.toFixed(1)}%`, 9))}${fg(usageColor(theme, p.mem * 4))(fit(`${p.mem.toFixed(1)}%`, 9))}${dim(formatBytes(p.rssKb * 1024))}`),
        ]);
      };

      refresh();
      return root;
    },
    onEnter: () => {
      info = machineInfo();
      sampler = new LiveSampler();
      live = undefined;
      refresh();
      if (timer) clearInterval(timer);
      // Live while the module is open: one reading per second.
      timer = setInterval(() => {
        live = sampler.tick();
        refresh();
      }, 1000);
      timer.unref?.();
    },
    onLeave: () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    },
    onKey: (name) => {
      if (name !== "u") return false;
      info = machineInfo();
      live = sampler.tick();
      refresh();
      return true;
    },
  };
})();

/**
 * Machine module of the TUI.
 *
 * System (host, OS, kernel, architecture, virtualization, variant, uptime,
 * user, shell, time zone, locale), CPU and memory with live bars (refreshed
 * every two seconds while the module is open), disks and network interfaces.
 * Container bridges are counted, not listed. `u` refreshes everything.
 */
import { BoxRenderable, ScrollBoxRenderable, TextRenderable, fg, t, type CliRenderer } from "@opentui/core";
import { edition } from "../core/app/edition.ts";
import { panel } from "../core/tui/components.ts";
import type { Theme } from "../core/tui/theme.ts";
import type { Screen } from "../core/tui/screen.ts";
import type { Inventory } from "../inventory.ts";
import { detectSystem } from "../system/detect.ts";
import { cpuSample, cpuUsage, formatDuration, machineInfo, type CpuSample, type MachineInfo } from "../system/info.ts";
import { formatBytes } from "../tailscale/status.ts";
import { tr, type TextKey } from "./i18n.ts";
import { fit, progressBar } from "./model.ts";

function line(renderer: CliRenderer, wrap = false): TextRenderable {
  return new TextRenderable(renderer, { content: "", wrapMode: wrap ? "word" : "none", flexShrink: 0 });
}

/** Color of a usage percentage: green, amber from 75%, red from 90%. */
export function usageColor(theme: Theme, percent: number): string {
  return percent >= 90 ? theme.error : percent >= 75 ? theme.warn : theme.ok;
}

export const machineScreen: Screen = (() => {
  let info: MachineInfo | undefined;
  let sample: CpuSample = cpuSample();
  let cpu = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let first: ReturnType<typeof setTimeout> | undefined;
  let refresh = () => {};

  return {
    id: "machine",
    get title() {
      return tr("tab.machine");
    },
    description: "System, CPU, memory, disks and network of this machine",
    get keys() {
      return [{ key: "u", action: tr("key.refresh"), press: "u" }];
    },
    mount: ({ renderer, theme }) => {
      const root = new BoxRenderable(renderer, { flexDirection: "column", flexGrow: 1, gap: 1, paddingTop: 1 });
      const top = new BoxRenderable(renderer, { flexDirection: "row", gap: 2, height: 15, flexShrink: 0 });
      const sysPanel = panel(renderer, theme, { title: tr("mc.system"), flexGrow: 1, flexBasis: 0, active: true });
      const sysText = line(renderer);
      const livePanel = panel(renderer, theme, { title: tr("mc.live"), flexGrow: 1, flexBasis: 0 });
      const liveText = line(renderer);
      for (const [p, l] of [[sysPanel, sysText], [livePanel, liveText]] as const) {
        p.add(new BoxRenderable(renderer, { height: 1, flexShrink: 0 }));
        p.add(l);
        top.add(p);
      }
      const bottom = new BoxRenderable(renderer, { flexDirection: "row", gap: 2, flexGrow: 1, minHeight: 6 });
      const diskPanel = panel(renderer, theme, { title: tr("mc.disks"), flexGrow: 1, flexBasis: 0 });
      const diskList = new BoxRenderable(renderer, { flexDirection: "column", flexGrow: 1 });
      const netPanel = panel(renderer, theme, { title: tr("mc.network"), flexGrow: 1, flexBasis: 0 });
      const netList = new ScrollBoxRenderable(renderer, { flexGrow: 1, minHeight: 0, scrollY: true, backgroundColor: theme.surface, contentOptions: { flexDirection: "column" } });
      diskPanel.add(new BoxRenderable(renderer, { height: 1, flexShrink: 0 }));
      diskPanel.add(diskList);
      netPanel.add(new BoxRenderable(renderer, { height: 1, flexShrink: 0 }));
      netPanel.add(netList);
      bottom.add(diskPanel);
      bottom.add(netPanel);
      root.add(top);
      root.add(bottom);

      refresh = () => {
        if (!info) info = machineInfo();
        const m = info;
        const dim = fg(theme.textDim);
        const strong = fg(theme.textStrong);
        const k = (key: TextKey) => dim(fit(tr(key), 14));
        const detected = detectSystem((edition().inventory as Inventory).systems);
        sysText.content = t`${k("mc.host")}${strong(m.hostname)}
${k("user.system")}${strong(detected.name)}
${k("mc.kernel")}${strong(m.kernel)}  ${dim(m.arch)}
${k("mc.virt")}${strong(m.virtualization || "-")}
${k("user.variant")}${strong(detected.variant ? tr(`variant.${detected.variant}` as TextKey) : "-")}
${k("mc.uptime")}${strong(formatDuration(m.uptimeSec))}
${k("user.user")}${strong(m.user)}  ${dim(m.shell)}
${k("mc.timezone")}${strong(m.timezone)}
${k("mc.locale")}${strong(m.locale || "-")}`;

        const memUsed = m.memTotal - m.memAvailable;
        const memPct = m.memTotal ? Math.round((memUsed / m.memTotal) * 100) : 0;
        const swapUsed = m.swapTotal - m.swapFree;
        const swapPct = m.swapTotal ? Math.round((swapUsed / m.swapTotal) * 100) : 0;
        const loadPct = Math.round((m.load[0] / Math.max(m.cores, 1)) * 100);
        liveText.content = t`${dim(fit(m.cpuModel, 44))}
${dim(`${m.cores} ${tr("mc.cores")}`)}

${k("mc.cpu")}${fg(usageColor(theme, cpu))(progressBar(cpu, 100, 24))} ${strong(`${cpu}%`)}
${k("mc.load")}${fg(usageColor(theme, loadPct))(m.load.map((l) => l.toFixed(2)).join("  "))}  ${dim(`(1, 5, 15 min)`)}
${k("mc.memory")}${fg(usageColor(theme, memPct))(progressBar(memPct, 100, 24))} ${strong(`${memPct}%`)}  ${dim(`${formatBytes(memUsed)} / ${formatBytes(m.memTotal)}`)}
${k("mc.swap")}${fg(m.swapTotal ? usageColor(theme, swapPct) : theme.textDim)(m.swapTotal ? `${progressBar(swapPct, 100, 24)} ${swapPct}%` : tr("ts.none"))}  ${dim(m.swapTotal ? `${formatBytes(swapUsed)} / ${formatBytes(m.swapTotal)}` : "")}`;

        for (const child of diskList.getChildren()) diskList.remove(child);
        const head = line(renderer);
        head.content = t`${dim(`${fit(tr("mc.mount"), 16)}${fit(tr("mc.size"), 10)}${fit(tr("mc.free"), 10)}${tr("mc.used")}`)}`;
        diskList.add(head);
        for (const d of m.disks) {
          const l = line(renderer);
          l.content = t`${strong(fit(d.mount, 16))}${dim(fit(formatBytes(d.sizeKb * 1024), 10))}${dim(fit(formatBytes(d.availKb * 1024), 10))}${fg(usageColor(theme, d.percent))(`${progressBar(d.percent, 100, 16)} ${d.percent}%`)}`;
          diskList.add(l);
        }

        for (const child of netList.getChildren()) netList.remove(child);
        for (const iface of m.interfaces) {
          const l = line(renderer, true);
          l.content = t`${strong(fit(iface.name, 14))}${dim(iface.addresses.join("  "))}`;
          netList.add(l);
        }
        if (m.hiddenInterfaces) {
          const l = line(renderer, true);
          l.content = t`${dim(tr("mc.hidden", { n: m.hiddenInterfaces }))}`;
          netList.add(l);
        }
      };
      refresh();
      return root;
    },
    onEnter: () => {
      info = machineInfo();
      refresh();
      // Live CPU and memory while the module is open; the first reading comes after half a second.
      const tick = () => {
        const next = cpuSample();
        cpu = cpuUsage(sample, next);
        sample = next;
        info = machineInfo();
        refresh();
      };
      sample = cpuSample();
      if (timer) clearInterval(timer);
      timer = setInterval(tick, 2000);
      first = setTimeout(tick, 500);
      first.unref?.();
      timer.unref?.();
    },
    onLeave: () => {
      if (timer) clearInterval(timer);
      if (first) clearTimeout(first);
      timer = undefined;
      first = undefined;
    },
    onKey: (name) => {
      if (name !== "u") return false;
      info = machineInfo();
      refresh();
      return true;
    },
  };
})();

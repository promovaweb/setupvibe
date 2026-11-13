/**
 * Tailscale module of the TUI (task 18).
 *
 * Top: this machine (state, names, IPs, tailnet, MagicDNS, version, key
 * expiry, exit node, tags, routes, capabilities) and a panel with the
 * services published with serve or Funnel, the health warnings and, after
 * `n`, the network check (UDP, IPv4/IPv6, port mapping, nearest relays).
 * Bottom: the machines of the tailnet, online first, and the details of the
 * selected one (DNS, every IP, user, connection, relay, traffic, key expiry).
 * `j`/`k` or a click select a machine, `u` refreshes, `n` runs netcheck.
 * Nothing calls the Tailscale API: every value comes from the local client.
 */
import { BoxRenderable, ScrollBoxRenderable, TextAttributes, TextRenderable, fg, t, type CliRenderer } from "@opentui/core";
import { panel } from "../core/tui/components.ts";
import type { Theme } from "../core/tui/theme.ts";
import type { Screen } from "../core/tui/screen.ts";
import { collect, daysUntil, formatBytes, runNetcheck, since, type NetcheckResult, type TailscalePeer, type TailscaleSnapshot } from "../tailscale/status.ts";
import { tr, type TextKey } from "./i18n.ts";
import { icon } from "./icons.ts";
import { fit } from "./model.ts";

function line(renderer: CliRenderer, wrap = false, height?: number): TextRenderable {
  return new TextRenderable(renderer, { content: "", wrapMode: wrap ? "word" : "none", flexShrink: 0, ...(height ? { height } : {}) });
}

function scroll(renderer: CliRenderer, theme: Theme): ScrollBoxRenderable {
  return new ScrollBoxRenderable(renderer, { flexGrow: 1, minHeight: 0, scrollY: true, scrollX: false, backgroundColor: theme.surface, contentOptions: { flexDirection: "column" } });
}

/** Connection of a peer: direct address, relay or offline. */
export function connection(p: TailscalePeer): "direct" | "relay" | "idle" | "offline" {
  if (!p.online) return "offline";
  if (p.curAddr) return "direct";
  return p.active ? "relay" : "idle";
}

/** Short summary for the Home card: state, machine, online peers. */
export function tailscaleSummary(s: TailscaleSnapshot): { state: string; ok: boolean; online: number; total: number } {
  return { state: s.installed ? s.state || "?" : "", ok: s.state === "Running", online: s.peers.filter((p) => p.online).length, total: s.peers.length };
}

export const tailscaleScreen: Screen = (() => {
  let snapshot: TailscaleSnapshot | undefined;
  let netcheck: NetcheckResult | undefined;
  let checking = false;
  let loading = false;
  let row = 0;
  let refresh = () => {};
  let load = () => {};

  return {
    id: "tailscale",
    get title() {
      return "Tailscale";
    },
    description: "This machine, the tailnet, published services, health and network check",
    get keys() {
      return [
        { key: "j/k", action: tr("key.item"), press: "j" },
        { key: "n", action: "netcheck", press: "n" },
        { key: "u", action: tr("key.refresh"), press: "u" },
      ];
    },
    mount: ({ renderer, theme }) => {
      const root = new BoxRenderable(renderer, { flexDirection: "column", flexGrow: 1, gap: 1, paddingTop: 1 });
      const top = new BoxRenderable(renderer, { flexDirection: "row", gap: 2, height: 15, flexShrink: 0 });
      const selfPanel = panel(renderer, theme, { title: `${icon("machine")}  ${tr("ts.self")}`, flexGrow: 3, flexBasis: 0, active: true });
      const selfText = line(renderer);
      selfPanel.add(new BoxRenderable(renderer, { height: 1, flexShrink: 0 }));
      selfPanel.add(selfText);
      const sidePanel = panel(renderer, theme, { title: `${icon("services")}  ${tr("ts.services")}`, flexGrow: 2, flexBasis: 0 });
      const side = scroll(renderer, theme);
      sidePanel.add(new BoxRenderable(renderer, { height: 1, flexShrink: 0 }));
      sidePanel.add(side);
      top.add(selfPanel);
      top.add(sidePanel);

      const bottom = new BoxRenderable(renderer, { flexDirection: "row", gap: 2, flexGrow: 1, minHeight: 6 });
      const peersPanel = panel(renderer, theme, { title: `${icon("peers")}  ${tr("ts.peers")}`, flexGrow: 3, flexBasis: 0 });
      const header = line(renderer, false, 1);
      const peerList = scroll(renderer, theme);
      peersPanel.add(header);
      peersPanel.add(peerList);
      const detailPanel = panel(renderer, theme, { title: `${icon("details")}  ${tr("inv.details")}`, flexGrow: 2, flexBasis: 0 });
      const detailText = line(renderer, true);
      detailPanel.add(new BoxRenderable(renderer, { height: 1, flexShrink: 0 }));
      detailPanel.add(detailText);
      bottom.add(peersPanel);
      bottom.add(detailPanel);
      root.add(top);
      root.add(bottom);

      const dim = fg(theme.textDim);
      const strong = fg(theme.textStrong);
      const k = (key: TextKey) => dim(fit(tr(key), 13));
      const yes = (b: boolean) => (b ? fg(theme.ok)(tr("ts.yes")) : dim(tr("ts.no")));
      const connColor = (c: string) => (c === "direct" ? theme.ok : c === "relay" ? theme.warn : theme.textDim);
      const connText = (p: TailscalePeer) => {
        const c = connection(p);
        return c === "relay" ? `${tr("ts.relay")} ${p.relay}` : tr(`ts.${c}` as TextKey);
      };

      let peerLines: TextRenderable[] = [];
      refresh = () => {
        const s = snapshot;
        for (const child of side.getChildren()) side.remove(child);
        for (const child of peerList.getChildren()) peerList.remove(child);
        peerLines = [];
        if (!s || loading) {
          selfText.content = t`${dim(tr("ts.loading"))}`;
          return;
        }
        if (!s.installed) {
          selfText.content = t`${fg(theme.warn)(tr("ts.notInstalled"))}\n\n${fg(theme.accent)("setupvibe install tailscale")}`;
          detailText.content = "";
          header.content = "";
          return;
        }
        const running = s.state === "Running";
        const me = s.self;
        const expiry = daysUntil(me?.keyExpiry);
        selfText.content = t`${k("ts.state")}${fg(running ? theme.ok : theme.warn)(`● ${s.state || "?"}`)}${s.authUrl ? fg(theme.accent)(`  ${s.authUrl}`) : ""}
${k("ts.name")}${strong(me?.name ?? "-")}  ${dim(me?.dnsName ?? "")}
${k("ts.ips")}${strong((me?.ips ?? []).join("  ") || "-")}
${k("ts.tailnet")}${strong(s.tailnet?.name ?? "-")}${s.tailnet ? dim(`  MagicDNS ${s.tailnet.magicDNSEnabled ? "on" : "off"} · ${s.tailnet.magicDNSSuffix}`) : ""}
${k("ts.version")}${strong(s.version || "-")}  ${dim(me?.os ?? "")}
${k("ts.keyExpiry")}${expiry === undefined ? dim("-") : fg(expiry < 14 ? theme.warn : theme.text)(`${(me?.keyExpiry ?? "").slice(0, 10)} (${expiry} ${tr("ts.days")})`)}
${k("ts.exitNode")}${s.exitNodeInUse ? fg(theme.accent)(s.exitNodeInUse) : dim(tr("ts.none"))}  ${dim(tr("ts.offers"))} ${yes(Boolean(me?.exitNodeOption))}
${k("ts.tags")}${me?.tags.length ? strong(me.tags.join(", ")) : dim("-")}
${k("ts.routes")}${strong(String(me?.routes.length ?? 0))}  ${dim(tr("ts.certs"))} ${strong(String(me?.certDomains.length ?? 0))}
${k("ts.caps")}${dim((me?.capabilities ?? []).join(", ") || "-")}`;
        if (!running) {
          selfText.content = t`${k("ts.state")}${fg(theme.warn)(`● ${s.state || "?"}`)}\n\n${dim(tr("ts.startHint"))}\n${fg(theme.accent)(s.authUrl ?? "sudo tailscale up")}`;
        }

        const add = (content: ReturnType<typeof t> | string, wrap = true) => {
          const l = line(renderer, wrap);
          l.content = content;
          side.add(l);
        };
        add(t`${strong(tr("ts.serve"))} ${dim(`(${s.serve.length})`)}`, false);
        if (!s.serve.length) add(t`  ${dim(tr("ts.none"))}`);
        for (const entry of s.serve) {
          // "url → target": the address on one line, where it goes on the next.
          const [from, to] = entry.split(" → ");
          add(t`  ${fg(theme.accent)("•")} ${from ?? entry}`);
          if (to) add(t`    ${dim(`→ ${to}`)}`);
        }
        add("", false);
        add(t`${strong(tr("ts.health"))} ${dim(`(${s.health.length})`)}`, false);
        if (!s.health.length) add(t`  ${fg(theme.ok)("✓")} ${dim(tr("ts.healthy"))}`);
        for (const h of s.health) add(t`  ${fg(theme.warn)("!")} ${h}`);
        add("", false);
        add(t`${strong("netcheck")} ${dim(checking ? tr("ts.checking") : netcheck ? "" : tr("ts.netcheckHint"))}`, false);
        if (netcheck) {
          const n = netcheck;
          add(t`  UDP ${yes(n.udp)}   IPv4 ${yes(n.ipv4)}   IPv6 ${yes(n.ipv6)}`);
          add(t`  UPnP ${yes(n.upnp)}   NAT-PMP ${yes(n.pmp)}   PCP ${yes(n.pcp)}`);
          add(t`  ${dim(tr("ts.hardNat"))} ${n.hardNat ? fg(theme.warn)(tr("ts.yes")) : dim(tr("ts.no"))}   ${dim(tr("ts.captive"))} ${n.captivePortal ? fg(theme.warn)(tr("ts.yes")) : dim(tr("ts.no"))}`);
          add(t`  ${dim(tr("ts.nearest"))} ${strong(n.preferred ?? "-")}`);
          for (const l of n.latencies.slice(0, 5)) add(t`    ${fg(theme.accent)(String(l.ms).padStart(4))} ms  ${l.region}`);
        }

        const online = s.peers.filter((p) => p.online).length;
        peersPanel.title = ` ${icon("peers")}  ${tr("ts.peers")} · ${online}/${s.peers.length} online `;
        header.content = t`${dim(`    ${fit(tr("ts.col.name").toLocaleUpperCase(), 20)}${fit(tr("ts.col.os").toLocaleUpperCase(), 9)}${fit("IP", 16)}${fit(tr("ts.col.conn").toLocaleUpperCase(), 12)}${tr("ts.col.seen").toLocaleUpperCase()}`)}`;
        row = Math.min(row, Math.max(0, s.peers.length - 1));
        s.peers.forEach((p, i) => {
          const l = line(renderer, false, 1);
          const active = i === row;
          const c = connection(p);
          const seen = p.online ? (p.lastSeen ? since(p.lastSeen) : tr("ts.now")) : since(p.lastSeen) || "-";
          l.content = t`${fg(theme.accent)(active ? "▶" : " ")} ${fg(p.online ? theme.ok : theme.textDim)(p.online ? "●" : "○")} ${fg(active ? theme.textStrong : theme.text)(fit(p.name, 20))}${dim(fit(p.os, 9))}${dim(fit(p.ips[0] ?? "", 16))}${fg(connColor(c))(fit(connText(p), 12))}${dim(seen)}${p.exitNode ? fg(theme.accent)("  exit") : ""}`;
          l.bg = active ? theme.surfaceHigh : theme.surface;
          l.onMouseDown = () => {
            row = i;
            refresh();
          };
          peerList.add(l);
          peerLines.push(l);
        });
        if (peerLines[row]) peerList.scrollChildIntoView(peerLines[row]!);

        const p = s.peers[row];
        if (!p) {
          detailText.content = t`${dim(tr("ts.noPeers"))}`;
          return;
        }
        const pExpiry = daysUntil(p.keyExpiry);
        detailText.content = t`${strong(p.name)}  ${dim(p.os)}
${dim(p.dnsName)}

${k("ts.ips")}${p.ips.join("\n" + " ".repeat(13))}
${k("ts.user")}${p.user ?? (p.tags.length ? p.tags.join(", ") : "-")}
${k("ts.state")}${p.online ? fg(theme.ok)("online") : dim("offline")}${p.lastSeen ? dim(`  · ${since(p.lastSeen)}`) : ""}
${k("ts.col.conn")}${fg(connColor(connection(p)))(connText(p))}${p.curAddr ? dim(`  ${p.curAddr}`) : ""}
${k("ts.traffic")}${dim("↓")} ${formatBytes(p.rxBytes)}  ${dim("↑")} ${formatBytes(p.txBytes)}
${k("ts.exitNode")}${p.exitNode ? fg(theme.accent)(tr("ts.inUse")) : p.exitNodeOption ? tr("ts.offered") : dim(tr("ts.no"))}
${k("ts.keyExpiry")}${pExpiry === undefined ? dim("-") : `${(p.keyExpiry ?? "").slice(0, 10)} (${pExpiry} ${tr("ts.days")})`}`;
      };

      load = () => {
        loading = !snapshot;
        refresh();
        void collect().then((s) => {
          snapshot = s;
          loading = false;
          refresh();
        });
      };
      load();
      return root;
    },
    onEnter: () => load(),
    onKey: (name) => {
      const total = snapshot?.peers.length ?? 0;
      if (name === "j" || name === "down") row = Math.min(row + 1, Math.max(total - 1, 0));
      else if (name === "k" || name === "up") row = Math.max(row - 1, 0);
      else if (name === "u") load();
      else if (name === "n" && snapshot?.installed && !checking) {
        checking = true;
        refresh();
        void runNetcheck().then((r) => {
          netcheck = r;
          checking = false;
          refresh();
        });
      } else return false;
      refresh();
      return true;
    },
  };
})();

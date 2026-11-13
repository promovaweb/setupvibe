/** Tailscale and Machine modules and the Home bento (task 18). */
import "../../desktop/src/edition.ts";
import { describe, expect, test } from "bun:test";
import { daysUntil, formatBytes, parseDerpMap, parseNetcheck, parseServe, parseStatus, since } from "../tailscale/status";
import { connection, tailscaleSummary } from "../tui/tailscale";
import { cpuUsage, formatDuration, groupInterfaces, parseDf, parseMeminfo } from "../system/info";
import { BENTO, moveInBento } from "../tui/home";

const STATUS = JSON.stringify({
  Version: "1.104.6-tabc-gdef",
  BackendState: "Running",
  AuthURL: "",
  Health: ["System DNS config not ideal."],
  CurrentTailnet: { Name: "example@example.com", MagicDNSSuffix: "tail000.ts.net", MagicDNSEnabled: true },
  CertDomains: ["box.tail000.ts.net"],
  User: { "1": { LoginName: "example@example.com" } },
  Self: { ID: "s", HostName: "box", DNSName: "box.tail000.ts.net.", OS: "linux", UserID: 1, TailscaleIPs: ["100.64.0.1", "fd7a::1"], Online: true, Relay: "sao", CurAddr: "", Tags: ["tag:dev"], PrimaryRoutes: ["10.0.0.0/24"], Capabilities: ["https", "https://tailscale.com/cap/ssh", "HTTPS://TAILSCALE.COM/s/DEPRECATED-NODE-CAPS#x"], KeyExpiry: "2099-01-01T00:00:00Z", ExitNodeOption: false },
  Peer: {
    a: { ID: "a", HostName: "zeta", DNSName: "zeta.tail000.ts.net.", OS: "windows", UserID: 1, TailscaleIPs: ["100.64.0.2"], Online: true, Active: true, Relay: "sao", CurAddr: "192.168.1.5:41641", RxBytes: 2048, TxBytes: 10, LastSeen: "0001-01-01T00:00:00Z" },
    b: { ID: "b", HostName: "alpha", DNSName: "alpha.tail000.ts.net.", OS: "linux", UserID: 1, TailscaleIPs: ["100.64.0.3"], Online: false, Relay: "iad", CurAddr: "", LastSeen: "2026-11-01T00:00:00Z" },
    c: { ID: "c", HostName: "phone", DNSName: "phone.tail000.ts.net.", OS: "iOS", UserID: 1, TailscaleIPs: ["100.64.0.4"], Online: true, Active: false, Relay: "sao", CurAddr: "", ExitNode: true },
  },
});

describe("tailscale status", () => {
  test("the snapshot reads state, tailnet, this machine, health and peers", () => {
    const s = parseStatus(STATUS);
    expect(s.state).toBe("Running");
    expect(s.version).toBe("1.104.6");
    expect(s.tailnet).toEqual({ name: "example@example.com", magicDNSSuffix: "tail000.ts.net", magicDNSEnabled: true });
    expect(s.self!.dnsName).toBe("box.tail000.ts.net");
    expect(s.self!.capabilities).toEqual(["https", "ssh"]);
    expect(s.health.length).toBe(1);
    expect(s.peers.map((p) => p.name)).toEqual(["phone", "zeta", "alpha"]);
    expect(s.peers[0]!.user).toBe("example@example.com");
    expect(s.exitNodeInUse).toBe("phone");
    expect(s.peers.find((p) => p.name === "zeta")!.lastSeen).toBeUndefined();
  });

  test("connection: direct, relay, idle and offline", () => {
    const [phone, zeta, alpha] = parseStatus(STATUS).peers;
    expect(connection(zeta!)).toBe("direct");
    expect(connection(phone!)).toBe("idle");
    expect(connection(alpha!)).toBe("offline");
    expect(connection({ ...phone!, active: true })).toBe("relay");
  });

  test("summary for the Home card and a bad output", () => {
    expect(tailscaleSummary({ installed: true, serve: [], ...parseStatus(STATUS) })).toEqual({ state: "Running", ok: true, online: 2, total: 3 });
    expect(parseStatus("not json").error).toContain("no JSON");
  });

  test("serve, netcheck and the relay map", () => {
    expect(parseServe(JSON.stringify({ Web: { "box.tail000.ts.net:443": { Handlers: { "/": { Proxy: "http://127.0.0.1:3000" } } } }, AllowFunnel: { "box.tail000.ts.net:443": true }, Services: { "svc:api": {} } }))).toEqual(["https://box.tail000.ts.net → http://127.0.0.1:3000 (Funnel)", "service api"]);
    const regions = parseDerpMap(JSON.stringify({ Regions: { "11": { RegionID: 11, RegionCode: "sao", RegionName: "São Paulo" }, "1": { RegionID: 1, RegionCode: "nyc", RegionName: "New York City" } } }));
    const n = parseNetcheck(`# Warning\n${JSON.stringify({ UDP: true, IPv4: true, IPv6: false, UPnP: true, MappingVariesByDestIP: true, PreferredDERP: 11, RegionLatency: { "1": 146e6, "11": 25e6 } })}`, regions)!;
    expect(n.preferred).toBe("São Paulo (sao)");
    expect(n.latencies[0]).toEqual({ region: "São Paulo (sao)", ms: 25 });
    expect(n.hardNat).toBe(true);
    expect(parseNetcheck("no json")).toBeUndefined();
  });

  test("bytes, time since and days until", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(487 * 1024 * 1024)).toBe("487 MB");
    const now = Date.parse("2026-11-12T12:00:00Z");
    expect(since("2026-11-12T11:58:00Z", now)).toBe("2 min");
    expect(since("2026-11-12T09:00:00Z", now)).toBe("3 h");
    expect(since("2026-11-02T12:00:00Z", now)).toBe("10 d");
    expect(since(undefined, now)).toBe("");
    expect(daysUntil("2026-11-22T12:00:00Z", now)).toBe(10);
  });
});

describe("machine info", () => {
  test("df, meminfo and interfaces", () => {
    const disks = parseDf("Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/sda1 1000 760 240 76% /\ntmpfs 100 0 100 0% /run\n/dev/sda1 1000 760 240 76% /\n/dev/sdb1 2000 200 1800 10% /mnt/data disk\n");
    expect(disks.map((d) => d.mount)).toEqual(["/", "/mnt/data disk"]);
    expect(disks[0]!.percent).toBe(76);
    expect(parseMeminfo("MemAvailable:   1024 kB\nSwapTotal: 2048 kB\n")).toEqual({ MemAvailable: 1048576, SwapTotal: 2097152 });
    const g = groupInterfaces({ lo: [{ address: "127.0.0.1", internal: true, family: "IPv4" } as never], ens18: [{ address: "192.168.1.2", internal: false, family: "IPv4" } as never, { address: "fe80::1%ens18", internal: false, family: "IPv6" } as never], veth1: [{ address: "fe80::2", internal: false, family: "IPv6" } as never], "br-1": [{ address: "172.18.0.1", internal: false, family: "IPv4" } as never] });
    expect(g.interfaces).toEqual([{ name: "ens18", addresses: ["192.168.1.2", "fe80::1"] }]);
    expect(g.hidden).toBe(2);
  });

  test("cpu usage between samples and durations", () => {
    expect(cpuUsage([{ idle: 100, total: 200 }], [{ idle: 150, total: 400 }])).toBe(75);
    expect(cpuUsage([], [])).toBe(0);
    expect(formatDuration(345838)).toBe("4 d 0 h");
    expect(formatDuration(3700)).toBe("1 h 1 min");
    expect(formatDuration(59)).toBe("0 min");
  });
});

describe("home bento", () => {
  test("every module has a card and the arrows move inside the grid", () => {
    expect(BENTO.flat().map((c) => c.id).sort()).toEqual(["about", "doctor", "inventory", "logs", "machine", "tailscale", "user"]);
    expect(moveInBento(0, 0, "right")).toEqual([0, 1]);
    expect(moveInBento(0, 0, "left")).toEqual([0, 0]);
    expect(moveInBento(0, 0, "down")).toEqual([1, 0]);
    expect(moveInBento(0, 2, "j")).toEqual([1, 2]);
    expect(moveInBento(1, 3, "up")).toEqual([0, 2]);
    expect(moveInBento(1, 0, "x")).toEqual([1, 0]);
  });
});

describe("live machine readings", () => {
  const live = require("../system/live") as typeof import("../system/live");

  test("network, disk and process parsers", () => {
    const net = live.parseNetDev("Inter-| Receive\n face |bytes\n    lo: 10 1 0 0 0 0 0 0 10 1 0 0 0 0 0 0\n ens18: 2048 5 0 0 0 0 0 0 4096 7 0 0 0 0 0 0\n veth1: 1 1 0 0 0 0 0 0 1 1 0 0 0 0 0 0\n");
    expect(net).toEqual({ ens18: { rx: 2048, tx: 4096 } });
    expect(live.parseDiskstats("   8       0 sda 100 0 4000 0 50 0 2000 0 0 0 0\n   8       1 sda1 1 0 1 0 1 0 1 0 0 0 0\n 259 0 nvme0n1 1 0 8 0 1 0 16 0 0 0 0\n")).toEqual({ sda: { read: 4000, write: 2000 }, nvme0n1: { read: 8, write: 16 } });
    expect(live.parsePs(" 123 node 12.5 3.0 40960\n 9 kworker/0:1 0.0 0.0 0\nbad line\n")).toEqual([{ pid: 123, name: "node", cpu: 12.5, mem: 3, rssKb: 40960 }, { pid: 9, name: "kworker/0:1", cpu: 0, mem: 0, rssKb: 0 }]);
  });

  test("sparkline, rates and a real tick", () => {
    expect(live.sparkline([0, 50, 100], 5)).toBe("  ▁▅█");
    expect(live.rate(512)).toBe("512 B/s");
    expect(live.rate(15 * 1024)).toBe("15 KB/s");
    expect(live.rate(3.4 * 1024 * 1024)).toBe("3.4 MB/s");
    const sampler = new live.LiveSampler();
    const r = sampler.tick(3);
    expect(r.cpu).toBeGreaterThanOrEqual(0);
    expect(r.perCore.length).toBeGreaterThan(0);
    expect(r.memTotal).toBeGreaterThan(0);
    expect(r.cpuHistory.length).toBe(1);
  });
});

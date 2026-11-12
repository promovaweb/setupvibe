/**
 * Tailscale on this machine, for the Tailscale tab of the TUI.
 *
 * Everything comes from the local Tailscale client, without calling the
 * Tailscale API: `tailscale status --json` (state, tailnet, this machine,
 * health warnings and every peer), `tailscale serve status --json` (services
 * published with serve and Funnel), `tailscale debug derp-map` (relay names)
 * and, on demand, `tailscale netcheck --format=json` (UDP, IPv4/IPv6, port
 * mapping and the latency to each relay). The parsers are pure so they can be
 * tested with recorded output; `collect` runs the commands with short limits.
 */

/** One machine of the tailnet. */
export interface TailscalePeer {
  id: string;
  name: string;
  dnsName: string;
  ips: string[];
  os: string;
  user?: string;
  online: boolean;
  active: boolean;
  /** Undefined when Tailscale reports the zero date (online now or never). */
  lastSeen?: string;
  /** Relay region code, such as "sao". */
  relay: string;
  /** Direct address in use; empty when the traffic goes through a relay. */
  curAddr: string;
  rxBytes: number;
  txBytes: number;
  exitNode: boolean;
  exitNodeOption: boolean;
  keyExpiry?: string;
  tags: string[];
}

export interface TailscaleSnapshot {
  installed: boolean;
  /** Running, NeedsLogin, Stopped, NoState, Starting; empty when unreadable. */
  state: string;
  version: string;
  /** Login URL while the state is NeedsLogin. */
  authUrl?: string;
  tailnet?: { name: string; magicDNSSuffix: string; magicDNSEnabled: boolean };
  self?: TailscalePeer & { routes: string[]; capabilities: string[]; certDomains: string[] };
  health: string[];
  peers: TailscalePeer[];
  /** Name of the peer used as exit node, if any. */
  exitNodeInUse?: string;
  serve: string[];
  error?: string;
}

const ZERO_DATE = "0001-01-01T00:00:00Z";

type RawPeer = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function peerOf(raw: RawPeer, users: Record<string, { LoginName?: string; DisplayName?: string }>): TailscalePeer {
  const lastSeen = str(raw.LastSeen);
  const keyExpiry = str(raw.KeyExpiry);
  const user = users[String(raw.UserID ?? "")];
  return {
    id: str(raw.ID),
    name: str(raw.HostName) || str(raw.DNSName).split(".")[0] || "?",
    dnsName: str(raw.DNSName).replace(/\.$/, ""),
    ips: strs(raw.TailscaleIPs),
    os: str(raw.OS),
    ...(user?.LoginName ? { user: user.LoginName } : {}),
    online: raw.Online === true,
    active: raw.Active === true,
    ...(lastSeen && lastSeen !== ZERO_DATE ? { lastSeen } : {}),
    relay: str(raw.Relay),
    curAddr: str(raw.CurAddr),
    rxBytes: Number(raw.RxBytes ?? 0) || 0,
    txBytes: Number(raw.TxBytes ?? 0) || 0,
    exitNode: raw.ExitNode === true,
    exitNodeOption: raw.ExitNodeOption === true,
    ...(keyExpiry && keyExpiry !== ZERO_DATE ? { keyExpiry } : {}),
    tags: strs(raw.Tags),
  };
}

/** Reads `tailscale status --json`. Peers come online first, then by name. */
export function parseStatus(text: string): Omit<TailscaleSnapshot, "installed" | "serve"> {
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { state: "", version: "", health: [], peers: [], error: "tailscale status gave no JSON" };
  }
  const users = (json.User ?? {}) as Record<string, { LoginName?: string }>;
  const peers = Object.values((json.Peer ?? {}) as Record<string, RawPeer>)
    .map((p) => peerOf(p, users))
    .sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));
  const rawSelf = json.Self as RawPeer | undefined;
  const tailnet = json.CurrentTailnet as { Name?: string; MagicDNSSuffix?: string; MagicDNSEnabled?: boolean } | undefined;
  const exit = peers.find((p) => p.exitNode);
  return {
    state: str(json.BackendState),
    version: str(json.Version).split("-")[0] ?? "",
    ...(str(json.AuthURL) ? { authUrl: str(json.AuthURL) } : {}),
    ...(tailnet?.Name ? { tailnet: { name: tailnet.Name, magicDNSSuffix: tailnet.MagicDNSSuffix ?? "", magicDNSEnabled: tailnet.MagicDNSEnabled === true } } : {}),
    ...(rawSelf
      ? {
          self: {
            ...peerOf(rawSelf, users),
            routes: strs(rawSelf.PrimaryRoutes),
            // Capability URLs are long; keep the readable part.
            capabilities: strs(rawSelf.Capabilities).filter((c) => !c.includes("DEPRECATED")).map((c) => c.replace(/^https:\/\/tailscale\.com\/cap\//, "")),
            certDomains: strs(json.CertDomains),
          },
        }
      : {}),
    health: strs(json.Health),
    peers,
    ...(exit ? { exitNodeInUse: exit.name } : {}),
  };
}

/** Reads `tailscale serve status --json` into "address → target" lines. */
export function parseServe(text: string): string[] {
  let json: { Web?: Record<string, { Handlers?: Record<string, Record<string, string>> }>; AllowFunnel?: Record<string, boolean>; Services?: Record<string, unknown> };
  try {
    json = JSON.parse(text);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const [host, web] of Object.entries(json.Web ?? {})) {
    const funnel = json.AllowFunnel?.[host] ? " (Funnel)" : "";
    for (const [path, handler] of Object.entries(web.Handlers ?? {})) {
      const target = handler.Proxy ?? handler.Path ?? handler.Text ?? "?";
      out.push(`https://${host.replace(/:443$/, "")}${path === "/" ? "" : path} → ${target}${funnel}`);
    }
  }
  for (const name of Object.keys(json.Services ?? {})) out.push(`${name.replace(/^svc:/, "service ")}`);
  return out;
}

export interface NetcheckResult {
  udp: boolean;
  ipv4: boolean;
  ipv6: boolean;
  upnp: boolean;
  pmp: boolean;
  pcp: boolean;
  captivePortal: boolean;
  /** NAT that changes the port per destination (harder for direct links). */
  hardNat: boolean;
  preferred?: string;
  /** Fastest relays first, in milliseconds. */
  latencies: Array<{ region: string; ms: number }>;
}

/** Reads `tailscale netcheck --format=json` (it starts with a "#" warning line). */
export function parseNetcheck(text: string, regions: Record<string, string> = {}): NetcheckResult | undefined {
  const start = text.indexOf("{");
  if (start === -1) return undefined;
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(text.slice(start));
  } catch {
    return undefined;
  }
  const name = (id: string) => regions[id] ?? `region ${id}`;
  const latencies = Object.entries((j.RegionLatency ?? {}) as Record<string, number>)
    .map(([id, ns]) => ({ region: name(id), ms: Math.round(ns / 1e6) }))
    .sort((a, b) => a.ms - b.ms);
  return {
    udp: j.UDP === true,
    ipv4: j.IPv4 === true,
    ipv6: j.IPv6 === true,
    upnp: j.UPnP === true,
    pmp: j.PMP === true,
    pcp: j.PCP === true,
    captivePortal: j.CaptivePortal === true,
    hardNat: j.MappingVariesByDestIP === true,
    ...(j.PreferredDERP ? { preferred: name(String(j.PreferredDERP)) } : {}),
    latencies,
  };
}

/** Reads `tailscale debug derp-map` into region id → "Name (code)". */
export function parseDerpMap(text: string): Record<string, string> {
  try {
    const j = JSON.parse(text) as { Regions?: Record<string, { RegionID: number; RegionCode: string; RegionName: string }> };
    return Object.fromEntries(Object.values(j.Regions ?? {}).map((r) => [String(r.RegionID), `${r.RegionName} (${r.RegionCode})`]));
  } catch {
    return {};
  }
}

/** 1536 → "1.5 KB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

/** Time since a date, short: "now", "5 min", "3 h", "12 d". */
export function since(date: string | undefined, now = Date.now()): string {
  if (!date) return "";
  const minutes = Math.floor((now - Date.parse(date)) / 60_000);
  if (!Number.isFinite(minutes)) return "";
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 60 * 48) return `${Math.floor(minutes / 60)} h`;
  return `${Math.floor(minutes / 1440)} d`;
}

/** Days until a date (negative when past). */
export function daysUntil(date: string | undefined, now = Date.now()): number | undefined {
  if (!date) return undefined;
  const ms = Date.parse(date) - now;
  return Number.isFinite(ms) ? Math.floor(ms / 86_400_000) : undefined;
}

async function output(argv: string[], timeoutMs: number): Promise<{ code: number; text: string }> {
  try {
    const proc = Bun.spawn(argv, { stdout: "pipe", stderr: "pipe", stdin: "ignore", env: process.env, timeout: timeoutMs });
    const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
    return { code: await proc.exited, text: out || err };
  } catch (e) {
    return { code: 1, text: (e as Error).message };
  }
}

/** Reads the local Tailscale client: status and serve. */
export async function collect(which: (cmd: string) => string | null = (c) => Bun.which(c)): Promise<TailscaleSnapshot> {
  if (!which("tailscale")) return { installed: false, state: "", version: "", health: [], peers: [], serve: [] };
  const [status, serve] = await Promise.all([output(["tailscale", "status", "--json"], 5000), output(["tailscale", "serve", "status", "--json"], 5000)]);
  const parsed = parseStatus(status.text);
  return { installed: true, ...parsed, serve: serve.code === 0 ? parseServe(serve.text) : [] };
}

/** Runs netcheck (a few seconds) with relay names from the DERP map. */
export async function runNetcheck(): Promise<NetcheckResult | undefined> {
  const [map, check] = await Promise.all([output(["tailscale", "debug", "derp-map"], 5000), output(["tailscale", "netcheck", "--format=json"], 20_000)]);
  return parseNetcheck(check.text, parseDerpMap(map.text));
}

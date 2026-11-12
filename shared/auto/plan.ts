/**
 * `setupvibe auto` plan.
 *
 * Order: init (when not done), the selected items, the configuration items
 * (lingering, swap, Portainer), the security module, Git identity, Tailscale
 * login, Docker Swarm on the server, and finally the removal of the temporary
 * sudo rule. The check runs after the plan, in the command.
 *
 * Spec sections 9, 12 and 18.
 */
import { readFileSync } from "node:fs";
import { homedir } from "../system/home.ts";
import { join } from "node:path";
import type { Inventory, Item, System } from "../inventory.ts";
import { resolveInstall } from "../inventory.ts";
import type { Step } from "../exec/runner.ts";
import { itemSteps, miseCmd, nativeRefreshCmd, type DistroInfo } from "../install/methods.ts";
import { initPlan } from "../init/plan.ts";
import { securityPlan } from "../security/plan.ts";
import { removeNopasswdStep } from "../users/create.ts";
import { applyBlock, shellSteps } from "../shell/config.ts";
import { migrateSteps, type V1Detection } from "../legacy/v1.ts";
import type { AutoAnswers } from "./answers.ts";
import type { Selection } from "./selection.ts";

export interface AutoContext {
  inventory: Inventory;
  edition: "desktop" | "server";
  system: System;
  arch: string;
  distro?: DistroInfo;
  variant: "local" | "remote-headless" | "remote-exposed";
  user: string;
  userHasKey: boolean;
  initDone: boolean;
  /** Total memory in GB, to decide the swap file. */
  memoryGb: number;
  answers: AutoAnswers;
  selection: Selection;
  /** The working user was created by this run with a temporary sudo rule. */
  createdNopasswd: boolean;
  home?: string;
  /** Configure the shell environment (spec section 7). Default true. */
  shell?: boolean;
  /** Load the agent aliases (cco, cxo, oco, cx, oc). Default true. */
  agentAliases?: boolean;
  /** SetupVibe 1 files on the machine: converted before the shell blocks are written. */
  legacy?: V1Detection;
}

export interface AutoPlan {
  steps: Step[];
  skipped: { id: string; reason: string }[];
  /** True when the security module runs. */
  security: boolean;
}

/** True when the security module applies (spec sections 12 and 18). */
export function securityApplies(edition: "desktop" | "server", variant: AutoContext["variant"], selection: Selection): boolean {
  if (edition === "server") return true;
  if (variant === "remote-exposed") return true;
  return selection.items.some((i) => i.securityModule);
}

/** Swap file size in GB for a machine with `memoryGb` of RAM. */
export function swapSizeGb(memoryGb: number): number {
  if (memoryGb < 2) return 2;
  if (memoryGb < 4) return 4;
  return 0;
}

function configSteps(item: Item, ctx: AutoContext): Step[] {
  const entry = resolveInstall(item, ctx.system);
  if (!entry) return [];
  const home = ctx.home ?? homedir();
  if (entry.method === "config" && entry.action === "loginctl enable-linger") {
    return [{ id: item.id, description: `Keep ${ctx.user}'s services running after logout`, commands: [{ argv: ["loginctl", "enable-linger", ctx.user], sudo: true }] }];
  }
  if (entry.method === "config" && entry.action === "wsl-base") {
    // WSL 2 base without a distribution (spec section 14.6). Needs an elevated
    // PowerShell, which auto requires on Windows; a restart may follow.
    return [
      {
        id: item.id,
        description: "Install the WSL 2 base without a Linux distribution",
        skipIf: { argv: ["wsl.exe", "--status"] },
        commands: [
          { argv: ["wsl.exe", "--install", "--no-distribution", "--web-download"], retries: 2 },
          { argv: ["wsl.exe", "--set-default-version", "2"], optional: true },
        ],
      },
      {
        id: "wslconfig",
        description: "Mirrored networking, DNS tunneling, proxy, memory reclaim and sparse disks in ~/.wslconfig",
        commands: [],
        actionDescription: `write the SetupVibe block in ${join(home, ".wslconfig")}, after a backup`,
        action: async () => applyBlock(join(home, ".wslconfig"), WSL_CONFIG, home),
      },
    ];
  }
  if (entry.method === "config" && entry.action === "swapfile") {
    const size = swapSizeGb(ctx.memoryGb);
    if (size === 0) return [];
    return [
      {
        id: item.id,
        description: `Create a ${size} GB swap file`,
        skipIf: { argv: ["sh", "-c", "swapon --show=NAME --noheadings | grep -q ."] },
        commands: [
          { argv: ["fallocate", "-l", `${size}G`, "/swapfile"], sudo: true },
          { argv: ["chmod", "0600", "/swapfile"], sudo: true },
          { argv: ["mkswap", "/swapfile"], sudo: true },
          { argv: ["swapon", "/swapfile"], sudo: true },
          { argv: ["sh", "-c", "grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab"], sudo: true },
        ],
      },
    ];
  }
  if (entry.method === "compose" && item.id === "portainer") {
    const bind = ctx.variant === "local" ? "" : "127.0.0.1:";
    const dir = join(ctx.home ?? homedir(), ".setupvibe", "portainer");
    const image = (entry.image ?? "").replaceAll("{version}", item.version);
    const compose = `# Managed by SetupVibe\nservices:\n  portainer:\n    image: ${image}\n    container_name: portainer\n    restart: always\n    security_opt:\n      - no-new-privileges:true\n    ports:\n      - "${bind}${entry.port}:${entry.port}"\n    volumes:\n      - /etc/localtime:/etc/localtime:ro\n      - /var/run/docker.sock:/var/run/docker.sock\n      - ./data:/data\n`;
    return [
      {
        id: item.id,
        description: `Run Portainer ${item.version} on ${bind || "all interfaces, "}port ${entry.port}`,
        commands: [
          { argv: ["mkdir", "-p", join(dir, "data")] },
          { argv: ["tee", join(dir, "compose.yml")], input: compose },
          { argv: ["docker", "compose", "-f", join(dir, "compose.yml"), "up", "-d"], sudo: true },
        ],
      },
    ];
  }
  return [];
}

/**
 * SetupVibe block of ~/.wslconfig (spec section 14.6). The Hyper-V firewall
 * stays on with its default: inbound connections to WSL are blocked until
 * the person opens a port, which doctor explains. SetupVibe 1 opened every
 * inbound connection.
 */
export const WSL_CONFIG = [
  "[wsl2]",
  "networkingMode=mirrored",
  "dnsTunneling=true",
  "autoProxy=true",
  "firewall=true",
  "",
  "[experimental]",
  "autoMemoryReclaim=gradual",
  "sparseVhd=true",
].join("\n");

/** Builds the auto plan. */
export function autoPlan(ctx: AutoContext): AutoPlan {
  const steps: Step[] = [];
  const skipped = [...ctx.selection.skipped];
  const home = ctx.home ?? homedir();

  if (!ctx.initDone) steps.push(...initPlan({ inventory: ctx.inventory, system: ctx.system, arch: ctx.arch, distro: ctx.distro, home }));
  else {
    const refresh = nativeRefreshCmd(ctx.system);
    if (refresh) steps.push({ id: "package-index", description: "Refresh the package index", commands: [refresh] });
  }

  for (const item of ctx.selection.items) {
    if (item.securityModule) continue;
    const entry = resolveInstall(item, ctx.system);
    if (entry?.method === "config" || entry?.method === "compose") steps.push(...configSteps(item, ctx));
    else steps.push(...itemSteps(item, ctx.system, { arch: ctx.arch, inventory: ctx.inventory, distro: ctx.distro, home }));
  }

  if (ctx.selection.items.some((i) => i.id === "docker") && !["macos", "windows"].includes(ctx.system) && resolveInstall(ctx.selection.items.find((i) => i.id === "docker")!, ctx.system)?.method === "native") {
    steps.push({
      id: "docker-group",
      description: `Add ${ctx.user} to the docker group`,
      commands: [
        { argv: ["usermod", "--append", "--groups", "docker", ctx.user], sudo: true },
        { argv: ["systemctl", "enable", "--now", "docker"], sudo: true },
      ],
    });
  }

  if (ctx.selection.items.some((i) => i.id === "openssh-server") && resolveInstall(ctx.selection.items.find((i) => i.id === "openssh-server")!, ctx.system)?.method === "native") {
    // Debian and Ubuntu start ssh on install; Arch ships sshd disabled.
    steps.push({
      id: "openssh-service",
      description: "Enable and start the SSH server",
      commands: [{ argv: ["sh", "-c", "systemctl enable --now ssh 2>/dev/null || systemctl enable --now sshd"], sudo: true }],
    });
  }

  const dockerItem = ctx.selection.items.find((i) => i.id === "docker");
  if (dockerItem && resolveInstall(dockerItem, ctx.system)?.method === "native") steps.push(dockerDaemonStep(ctx.edition, ctx.variant));

  const pm2Item = ctx.selection.items.find((i) => i.id === "pm2");
  if (pm2Item && ctx.answers.pm2Autostart && !["windows", "macos"].includes(ctx.system)) {
    const mise = join(home, ".local", "bin", "mise");
    steps.push({
      id: "pm2-autostart",
      description: "Start PM2 and its saved apps at boot (systemd)",
      commands: [
        { argv: ["sh", "-c", `"${mise}" exec -- pm2 save --force`] },
        { argv: ["sh", "-c", `env PATH="$("${mise}" bin-paths | tr '\\n' ':')$PATH" "$("${mise}" which pm2)" startup systemd -u "$1" --hp "$2"`, "sh", ctx.user, home], sudo: true },
      ],
    });
  }

  if (ctx.selection.items.some((i) => resolveInstall(i, ctx.system)?.method === "mise")) {
    steps.push({
      id: "mise-lock",
      description: "Record the checksums of the mise tools in ~/.config/mise/mise.lock",
      commands: [{ argv: [miseCmd(home, ctx.system), "lock", "--global"], retries: 2, optional: true }],
    });
  }

  if (ctx.shell !== false && ctx.system !== "windows") {
    // A SetupVibe 1 .zshrc or .tmux.conf is converted first (backup, personal lines to .local),
    // so the new block never lands on top of the old file.
    if (ctx.legacy?.found) steps.push(...migrateSteps({ home, detection: { ...ctx.legacy, sshCopyId: false } }));
    const has = (id: string) => ctx.selection.items.some((i) => i.id === id) || resolveInstall(ctx.inventory.items.find((i) => i.id === id) ?? ({ install: {} } as Item), ctx.system)?.method === "preinstalled";
    steps.push(...shellSteps({ system: ctx.system, edition: ctx.edition, bin: ctx.edition === "server" ? "setupvibe-server" : "setupvibe", user: ctx.user, home, agentAliases: ctx.agentAliases ?? true, zsh: has("zsh"), tmux: has("tmux") && has("tpm"), starship: has("starship") }));
  }

  const security = securityApplies(ctx.edition, ctx.variant, ctx.selection);
  if (security) {
    const plan = securityPlan({
      system: ctx.system,
      edition: ctx.edition,
      user: ctx.user,
      userHasKey: ctx.userHasKey,
      swarm: ctx.edition === "server" && (ctx.answers.manager || Boolean(ctx.answers.join)),
      timezone: ctx.answers.timezone,
    });
    steps.push(...plan.steps);
    skipped.push(...plan.skipped.map((s) => ({ id: s.part, reason: s.reason })));
  }

  if (ctx.answers.gitName || ctx.answers.gitEmail) {
    steps.push({
      id: "git-identity",
      description: "Set the Git name and e-mail",
      commands: [
        ...(ctx.answers.gitName ? [{ argv: ["git", "config", "--global", "user.name", ctx.answers.gitName] }] : []),
        ...(ctx.answers.gitEmail ? [{ argv: ["git", "config", "--global", "user.email", ctx.answers.gitEmail] }] : []),
        { argv: ["git", "config", "--global", "init.defaultBranch", "main"] },
      ],
    });
  } else {
    skipped.push({ id: "git-identity", reason: "no --git-name or --git-email" });
  }

  if (ctx.selection.items.some((i) => i.id === "tailscale")) {
    if (ctx.answers.tailscaleAuthKey) {
      steps.push({
        id: "tailscale-up",
        description: "Join the Tailscale network with TAILSCALE_AUTHKEY",
        skipIf: { argv: ["sh", "-c", "tailscale status >/dev/null 2>&1"] },
        commands: [{ argv: ["sh", "-c", `tailscale up --authkey="$TAILSCALE_AUTHKEY"${ctx.answers.tailscaleSsh ? " --ssh" : ""}`], sudo: true, env: { TAILSCALE_AUTHKEY: ctx.answers.tailscaleAuthKey } }],
      });
    } else {
      skipped.push({ id: "tailscale-up", reason: "installed without joining; set TAILSCALE_AUTHKEY to join" });
    }
    if (ctx.answers.tailscaleSsh) {
      // Also covers a machine that had already joined, where tailscale up is skipped.
      steps.push({ id: "tailscale-ssh", description: "Turn on Tailscale SSH", commands: [{ argv: ["tailscale", "set", "--ssh"], sudo: true }] });
    }
  }

  if (ctx.edition === "server") steps.push(...swarmSteps(ctx.answers));

  if (ctx.createdNopasswd && !ctx.answers.keepNopasswd) steps.push(removeNopasswdStep(ctx.user));

  return { steps, skipped, security };
}

/**
 * Docker daemon settings (spec section 11): log rotation everywhere, and
 * live-restore on the desktop only, because dockerd refuses live-restore in
 * Swarm mode. An existing daemon.json is merged, not replaced.
 */
export function daemonSettings(edition: "desktop" | "server", current: Record<string, unknown> = {}, variant: AutoContext["variant"] = "local"): Record<string, unknown> {
  return {
    ...current,
    // A desktop reachable from outside publishes container ports on 127.0.0.1
    // by default; Docker writes its own iptables rules and skips UFW.
    ...(edition === "desktop" && variant !== "local" && current.ip === undefined ? { ip: "127.0.0.1" } : {}),
    "log-driver": current["log-driver"] ?? "json-file",
    "log-opts": { "max-size": "10m", "max-file": "3", ...(current["log-opts"] as Record<string, string> | undefined) },
    ...(edition === "desktop" ? { "live-restore": true } : {}),
  };
}

function dockerDaemonStep(edition: "desktop" | "server", variant: AutoContext["variant"]): Step {
  const file = "/etc/docker/daemon.json";
  return {
    id: "docker-daemon",
    description: `Docker daemon: log rotation${edition === "desktop" ? " and live-restore" : ""} in ${file}`,
    commands: [],
    actionDescription: `merge the SetupVibe settings into ${file} and restart Docker`,
    actionSudo: true,
    action: async (runner) => {
      let current: Record<string, unknown> = {};
      try {
        current = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
      } catch {
        // Missing or unreadable: start from the defaults.
      }
      const next = daemonSettings(edition, current, variant);
      if (JSON.stringify(next) === JSON.stringify(current)) return;
      for (const cmd of [
        { argv: ["install", "-d", "-m", "0755", "/etc/docker"], sudo: true },
        { argv: ["tee", file], sudo: true, input: `${JSON.stringify(next, null, 2)}\n` },
        { argv: ["systemctl", "restart", "docker"], sudo: true },
      ]) {
        const r = await runner.exec(cmd);
        if (r.code !== 0) throw new Error(`${cmd.argv.join(" ")} failed: ${r.stderr.trim()}`);
      }
    },
  };
}

/** Docker Swarm steps: init as manager or join an existing swarm. */
export function swarmSteps(answers: AutoAnswers): Step[] {
  const active = { argv: ["sh", "-c", "docker info --format '{{.Swarm.LocalNodeState}}' | grep -q active"], sudo: true };
  if (answers.join) {
    if (!answers.advertiseAddr) throw new Error("--join needs --advertise-addr with the manager address (host:2377).");
    return [
      {
        id: "swarm-join",
        description: `Join the Docker Swarm managed at ${answers.advertiseAddr}`,
        skipIf: active,
        commands: [{ argv: ["sh", "-c", 'docker swarm join --token "$SETUPVIBE_SWARM_TOKEN" "$1"', "sh", answers.advertiseAddr], sudo: true, env: { SETUPVIBE_SWARM_TOKEN: answers.join } }],
      },
    ];
  }
  if (!answers.manager) return [];
  return [
    {
      id: "swarm-init",
      description: `Initialize Docker Swarm as manager${answers.advertiseAddr ? ` on ${answers.advertiseAddr}` : ""}`,
      skipIf: active,
      commands: [{ argv: ["docker", "swarm", "init", ...(answers.advertiseAddr ? ["--advertise-addr", answers.advertiseAddr] : [])], sudo: true }],
    },
    {
      id: "swarm-network",
      description: "Create the overlay network network_swarm_public",
      skipIf: { argv: ["docker", "network", "inspect", "network_swarm_public"], sudo: true },
      commands: [{ argv: ["docker", "network", "create", "--driver", "overlay", "--attachable", ...(answers.encryptedNetwork ? ["--opt", "encrypted"] : []), "network_swarm_public"], sudo: true }],
    },
  ];
}

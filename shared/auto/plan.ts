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
import { homedir } from "node:os";
import { join } from "node:path";
import type { Inventory, Item, System } from "../inventory.ts";
import { resolveInstall } from "../inventory.ts";
import type { Step } from "../exec/runner.ts";
import { itemSteps, nativeRefreshCmd, type DistroInfo } from "../install/methods.ts";
import { initPlan } from "../init/plan.ts";
import { securityPlan } from "../security/plan.ts";
import { removeNopasswdStep } from "../users/create.ts";
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
  if (entry.method === "config" && entry.action === "loginctl enable-linger") {
    return [{ id: item.id, description: `Keep ${ctx.user}'s services running after logout`, commands: [{ argv: ["loginctl", "enable-linger", ctx.user], sudo: true }] }];
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
        commands: [{ argv: ["sh", "-c", 'tailscale up --authkey="$TAILSCALE_AUTHKEY"'], sudo: true, env: { TAILSCALE_AUTHKEY: ctx.answers.tailscaleAuthKey } }],
      });
    } else {
      skipped.push({ id: "tailscale-up", reason: "installed without joining; set TAILSCALE_AUTHKEY to join" });
    }
  }

  if (ctx.edition === "server") steps.push(...swarmSteps(ctx.answers));

  if (ctx.createdNopasswd && !ctx.answers.keepNopasswd) steps.push(removeNopasswdStep(ctx.user));

  return { steps, skipped, security };
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
      commands: [{ argv: ["docker", "network", "create", "--driver", "overlay", "--attachable", "network_swarm_public"], sudo: true }],
    },
  ];
}

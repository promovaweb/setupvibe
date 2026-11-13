/**
 * Item selection for `auto` and the TUI.
 *
 * Without a profile, `auto` selects every inventory item that installs on the
 * detected system; GUI items are dropped on headless machines (spec sections
 * 9 and 18). `--only` adds items, `--exclude` removes them, and requirements
 * are pulled in automatically. The result is ordered so every item comes
 * after what it requires.
 */
import { existsSync } from "node:fs";
import type { Inventory, Item, System } from "../inventory.ts";
import { flagsFor, profileItems, resolveInstall } from "../inventory.ts";

export interface SelectionInput {
  inventory: Inventory;
  system: System;
  headless: boolean;
  /** WSL facts (spec section 2); detected when omitted on WSL. */
  wsl?: WslProbes;
  profile?: string;
  /** Explicit items, used by `install <items>` instead of a profile. */
  ids?: string[];
  only?: string[];
  exclude?: string[];
}

export interface Selection {
  items: Item[];
  /** Items left out and why. */
  skipped: { id: string; reason: string }[];
}

/** Facts about a WSL distribution. */
export interface WslProbes {
  /** systemd runs as PID 1. */
  systemd: boolean;
  /** Docker Desktop for Windows integration is enabled. */
  dockerDesktop: boolean;
}

/** Reads the WSL facts from the running distribution. */
export function wslProbes(): WslProbes {
  return { systemd: existsSync("/run/systemd/system"), dockerDesktop: existsSync("/mnt/wsl/docker-desktop") };
}

/** True when the item does something on the system. */
export function installable(item: Item, system: System): boolean {
  const entry = resolveInstall(item, system);
  return Boolean(entry && entry.method !== "unsupported" && entry.method !== "preinstalled");
}

/**
 * Orders items so that requirements come first.
 *
 * @throws on a requirement cycle
 */
export function orderByRequirements(items: Item[], all: Map<string, Item>): Item[] {
  const out: Item[] = [];
  const state = new Map<string, "visiting" | "done">();
  const visit = (item: Item, path: string[]) => {
    const s = state.get(item.id);
    if (s === "done") return;
    if (s === "visiting") throw new Error(`Requirement cycle: ${[...path, item.id].join(" -> ")}`);
    state.set(item.id, "visiting");
    for (const req of item.requires ?? []) {
      const dep = all.get(req);
      if (dep && items.includes(dep)) visit(dep, [...path, item.id]);
    }
    state.set(item.id, "done");
    out.push(item);
  };
  for (const item of items) visit(item, []);
  return out;
}

/**
 * Builds the selection.
 *
 * @throws when `--only` or `--exclude` names an unknown item, or the profile
 *   does not exist
 */
export function selectItems(input: SelectionInput): Selection {
  const { inventory, system, headless } = input;
  const byId = new Map(inventory.items.map((i) => [i.id, i]));
  for (const id of [...(input.ids ?? []), ...(input.only ?? []), ...(input.exclude ?? [])]) {
    if (!byId.has(id)) throw new Error(`Unknown inventory item: ${id}.`);
  }
  // "none" (written by config export) means an empty base: only the items in `only`, plus requirements.
  const base = input.ids ? input.ids : input.profile === "none" ? [] : input.profile ? profileItems(inventory, input.profile) : inventory.items.map((i) => i.id);
  const wanted = new Set([...base, ...(input.only ?? [])]);
  for (const id of input.exclude ?? []) wanted.delete(id);

  // Pull in requirements of wanted items.
  const queue = [...wanted];
  while (queue.length) {
    const id = queue.shift()!;
    for (const req of byId.get(id)?.requires ?? []) {
      if (!wanted.has(req) && !(input.exclude ?? []).includes(req)) {
        wanted.add(req);
        queue.push(req);
      }
    }
  }

  const skipped: Selection["skipped"] = [];
  const chosen: Item[] = [];
  for (const item of inventory.items) {
    if (!wanted.has(item.id)) continue;
    if (item.initOnly) continue;
    const entry = resolveInstall(item, system);
    if (!entry || entry.method === "unsupported") {
      skipped.push({ id: item.id, reason: entry?.reason ?? `not available on ${system}` });
      continue;
    }
    if (entry.method === "preinstalled") {
      skipped.push({ id: item.id, reason: `already part of ${system}` });
      continue;
    }
    if (headless && flagsFor(item, system).includes("gui")) {
      skipped.push({ id: item.id, reason: item.id === "nerd-fonts" ? "graphical item on a headless machine; install the fonts on the computer you connect from" : "graphical item on a headless machine" });
      continue;
    }
    if (system === "wsl") {
      const probes = input.wsl ?? wslProbes();
      if (entry.skipWhen === "docker-desktop-integration" && probes.dockerDesktop) {
        skipped.push({ id: item.id, reason: "Docker Desktop for Windows already provides Docker in this WSL distribution" });
        continue;
      }
      if (!probes.systemd && (item.flags ?? []).includes("service")) {
        skipped.push({ id: item.id, reason: "needs systemd, which is off in this WSL distribution; set systemd=true under [boot] in /etc/wsl.conf and restart WSL" });
        continue;
      }
    }
    chosen.push(item);
  }
  return { items: orderByRequirements(chosen, byId), skipped };
}

/**
 * `init` plan: the prerequisites every later install relies on.
 *
 * Installs the inventory items marked `initOnly` (build dependencies and
 * mise) for the detected system and records the result in `config.json`.
 * The TUI, `install` and `auto` refuse to install items until init is done
 * (spec section 6).
 */
import type { Inventory, System } from "../inventory.ts";
import type { Step } from "../exec/runner.ts";
import { itemSteps, miseSteps, nativeRefreshCmd, type DistroInfo } from "../install/methods.ts";

export interface InitContext {
  inventory: Inventory;
  system: System;
  arch: string;
  distro?: DistroInfo;
  home?: string;
}

/** Steps of `init` for one system, in order. */
export function initPlan(ctx: InitContext): Step[] {
  const steps: Step[] = [];
  const refresh = nativeRefreshCmd(ctx.system);
  if (refresh) steps.push({ id: "package-index", description: "Refresh the package index", commands: [refresh] });
  for (const item of ctx.inventory.items.filter((i) => i.initOnly)) {
    if (item.id === "mise") steps.push(...miseSteps(item, ctx.system, ctx.arch, ctx.home));
    else steps.push(...itemSteps(item, ctx.system, { arch: ctx.arch, inventory: ctx.inventory, distro: ctx.distro, home: ctx.home }));
  }
  return steps;
}

/** Shape of the `init` record in config.json. */
export interface InitRecord {
  done: boolean;
  at: string;
  version: string;
  system: System;
  /** Item ids installed by this init, to detect new prerequisites later. */
  prerequisites: string[];
}

/**
 * Prerequisites added to the inventory after init ran. `doctor` reports them
 * and tells the user to run init again.
 */
export function missingPrerequisites(inventory: Inventory, record: InitRecord | undefined): string[] {
  const required = inventory.items.filter((i) => i.initOnly).map((i) => i.id);
  if (!record?.done) return required;
  return required.filter((id) => !record.prerequisites.includes(id));
}

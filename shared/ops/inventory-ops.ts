/**
 * Inventory operations behind `list`, `install`, `remove` and `update`.
 *
 * Spec sections 5, 6 and 8:
 *
 * - install is idempotent: an item that already passes its check is left
 *   alone unless `--force` is given;
 * - remove covers what SetupVibe installs in the user's space (mise, Git
 *   sources, archives, Composer and gem packages); packages from the system
 *   package manager are only removed with `--include-native`, because other
 *   software may depend on them;
 * - an item that other selected items require is not removed without
 *   `--force`;
 * - update reinstalls the selected items whose pinned version changed in the
 *   inventory;
 * - apps outside the inventory are installed through mise with a pinned
 *   version and recorded in external.json.
 */
import { homedir } from "../system/home.ts";
import { join } from "node:path";
import type { Inventory, Item, System } from "../inventory.ts";
import { resolveInstall, withVersion } from "../inventory.ts";
import type { Cmd, Step } from "../exec/runner.ts";
import { expandHome, miseCmd, usesApt } from "../install/methods.ts";

/** One entry of selection.json. */
export interface SelectedItem {
  id: string;
  version: string;
  status?: "ok" | "fail";
  /** Found on the machine by init, not installed by SetupVibe; remove needs --force. */
  adopted?: boolean;
}

/** One entry of external.json. */
export interface ExternalApp {
  tool: string;
  version: string;
  installedAt: string;
}

const mise = (home: string) => miseCmd(home);

/** Merges new entries into the selection, replacing items with the same id. */
export function mergeSelection(current: SelectedItem[], added: SelectedItem[]): SelectedItem[] {
  const out = current.filter((c) => !added.some((a) => a.id === c.id));
  return [...out, ...added].sort((a, b) => a.id.localeCompare(b.id));
}

/** Removes ids from the selection. */
export function dropFromSelection(current: SelectedItem[], ids: string[]): SelectedItem[] {
  return current.filter((c) => !ids.includes(c.id));
}

/** Selected items that require `id`. */
export function dependentsOf(id: string, selected: string[], inventory: Inventory): string[] {
  return inventory.items.filter((i) => selected.includes(i.id) && i.id !== id && (i.requires ?? []).includes(id)).map((i) => i.id);
}

/** Items whose inventory version differs from the version recorded at install time. */
export function outdatedItems(selection: SelectedItem[], inventory: Inventory): { item: Item; from: string; to: string }[] {
  const out: { item: Item; from: string; to: string }[] = [];
  for (const s of selection) {
    const item = inventory.items.find((i) => i.id === s.id);
    if (item && item.version !== s.version) out.push({ item, from: s.version, to: item.version });
  }
  return out;
}

export interface RemovePlan {
  steps: Step[];
  /** Items that cannot be removed here, and why. */
  refused: { id: string; reason: string }[];
}

/**
 * Steps that remove items from one system.
 *
 * @param options.includeNative also remove system packages
 */
export function removePlan(items: Item[], system: System, options: { includeNative?: boolean; home?: string } = {}): RemovePlan {
  const home = options.home ?? homedir();
  const steps: Step[] = [];
  const refused: RemovePlan["refused"] = [];
  for (const item of items) {
    const entry = resolveInstall(item, system);
    if (!entry || entry.method === "unsupported") {
      refused.push({ id: item.id, reason: `not available on ${system}` });
      continue;
    }
    if (item.initOnly) {
      refused.push({ id: item.id, reason: "installed by init; SetupVibe needs it" });
      continue;
    }
    switch (entry.method) {
      case "preinstalled":
        refused.push({ id: item.id, reason: `part of ${system}; SetupVibe does not remove it` });
        break;
      case "mise": {
        const tool = withVersion(entry.tool ?? item.id, item).replace(/@[^@/]+$/, "");
        steps.push({ id: item.id, description: `Remove ${tool} from mise`, commands: [{ argv: [mise(home), "unuse", "--global", "--yes", tool] }] });
        break;
      }
      case "git": {
        const paths = [expandHome(entry.path ?? "", home)];
        for (const repo of Object.keys(item.plugins ?? {})) paths.push(join(expandHome(entry.path ?? "", home), "..", repo.split("/")[1]!));
        steps.push({ id: item.id, description: `Remove ${paths.length === 1 ? paths[0] : `${entry.path} and its plugins`}`, commands: [{ argv: ["rm", "-rf", ...paths] }] });
        break;
      }
      case "composer":
        steps.push({ id: item.id, description: `Remove ${entry.package} from Composer`, commands: [{ argv: ["composer", "global", "remove", "--no-interaction", entry.package ?? item.id] }] });
        break;
      case "gem":
        steps.push({ id: item.id, description: `Remove the ${entry.gem} gem`, commands: [{ argv: [mise(home), "exec", "--", "gem", "uninstall", entry.gem ?? item.id, "--all", "--executables", "--ignore-dependencies"] }] });
        break;
      case "native":
      case "brew":
      case "winget": {
        if (!options.includeNative) {
          refused.push({ id: item.id, reason: "installed by the system package manager; pass --include-native to remove it" });
          break;
        }
        steps.push({ id: item.id, description: `Remove ${item.name} with the system package manager`, commands: nativeRemoveCmds(entry, system) });
        break;
      }
      default:
        refused.push({ id: item.id, reason: `installed by its vendor installer; remove it with the vendor's instructions (${item.homepage})` });
    }
  }
  return { steps, refused };
}

function nativeRemoveCmds(entry: NonNullable<ReturnType<typeof resolveInstall>>, system: System): Cmd[] {
  const packages = entry.packages ?? [];
  if (entry.method === "brew") {
    const names = entry.cask ? [entry.cask] : Array.isArray(entry.formula) ? entry.formula : [entry.formula ?? ""];
    return [{ argv: ["brew", "uninstall", ...(entry.cask ? ["--cask"] : []), ...names] }];
  }
  if (entry.method === "winget") {
    const ids = Array.isArray(entry.id) ? entry.id : [entry.id ?? ""];
    return ids.map((id) => ({ argv: ["winget", "uninstall", "--exact", "--id", id, "--silent", "--disable-interactivity"] }));
  }
  if (usesApt(system)) return [{ argv: ["apt-get", "remove", "-y", ...packages], sudo: true }];
  if (system === "arch" || system === "omarchy") return [{ argv: ["pacman", "-Rns", "--noconfirm", ...packages], sudo: true }];
  if (system === "macos") return [{ argv: ["brew", "uninstall", ...packages] }];
  return [];
}

/** Valid mise tool spec, optionally with a backend and a version. */
export const MISE_TOOL = /^([a-z0-9-]+:)?[@\w./+-]+(@[\w.+-]+)?$/i;

/** Splits `tool@version`, keeping scoped npm names such as `npm:@scope/pkg@1.0`. */
export function splitToolSpec(spec: string): { tool: string; version?: string } {
  const at = spec.lastIndexOf("@");
  const scopeAt = spec.indexOf(":@") + 1;
  if (at > 0 && at !== scopeAt && !spec.slice(at).includes("/")) return { tool: spec.slice(0, at), version: spec.slice(at + 1) };
  return { tool: spec };
}

/** Step that installs an app outside the inventory with a pinned version. */
export function externalInstallStep(tool: string, version: string, home = homedir()): Step {
  return { id: `external:${tool}`, description: `Install ${tool}@${version} with mise (outside the inventory)`, commands: [{ argv: [mise(home), "use", "--global", "--yes", `${tool}@${version}`] }] };
}

/** Step that removes an app installed outside the inventory. */
export function externalRemoveStep(tool: string, home = homedir()): Step {
  return { id: `external:${tool}`, description: `Remove ${tool} from mise`, commands: [{ argv: [mise(home), "unuse", "--global", "--yes", tool] }] };
}

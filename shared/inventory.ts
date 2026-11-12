/**
 * SetupVibe 2 inventory model.
 *
 * Types for desktop/inventory.json and server/inventory.json, plus the rules
 * that turn an item into the install entry for one system. The JSON Schema in
 * shared/inventory.schema.json describes the same shape for editors; this
 * module is what the binaries and the tests use.
 */

/** Systems a SetupVibe edition can run on. */
export type System = "ubuntu" | "debian" | "mint" | "zorin" | "arch" | "omarchy" | "macos" | "windows" | "wsl";

/** Keys accepted in an item's `install` map, from specific to general. */
export type InstallKey = System | "debian-family" | "arch-family" | "linux" | "unix" | "all";

export type Flag = "gui" | "service" | "port";

export type VersionPolicy = "exact" | "series" | "minimum" | "commit" | "repository" | "distro" | "managed" | "system";

export interface Localized {
  en: string;
  "pt-BR": string;
}

export interface InstallEntry {
  method:
    | "mise" | "native" | "brew" | "winget" | "installer" | "archive" | "git"
    | "composer" | "gem" | "compose" | "config" | "preinstalled" | "unsupported";
  tool?: string;
  packages?: string[];
  optional?: string[];
  conflicts?: string[];
  repository?: string;
  formula?: string | string[];
  cask?: string;
  id?: string | string[];
  url?: string;
  args?: string[];
  checksum?: string;
  checksumAlgorithm?: "sha256" | "sha384" | "sha512";
  files?: { url: string; sha256: string }[];
  repo?: string;
  path?: string;
  package?: string;
  gem?: string;
  image?: string;
  port?: number;
  action?: string;
  skipWhen?: string;
  /** Flags that apply only to this entry, such as a GUI cask on macOS. */
  flags?: Flag[];
  reason?: string;
  note?: string;
}

export interface Item {
  id: string;
  name: string;
  category: string;
  description: Localized;
  homepage: string;
  version: string;
  versionPolicy: VersionPolicy;
  default: boolean;
  initOnly?: boolean;
  securityModule?: boolean;
  flags?: Flag[];
  requires?: string[];
  /** tmux plugins pinned to commits, keyed by GitHub owner/repo. */
  plugins?: Record<string, string>;
  install: Partial<Record<InstallKey, InstallEntry>>;
  verify: { command: string; expect?: string };
}

export interface Repository {
  type: "apt";
  url: string;
  suite: string;
  components: string[];
  key: string;
  fingerprints: string[];
  systems: System[];
}

export interface Profile {
  description: Localized;
  extends?: string;
  items: string[];
}

export interface Inventory {
  $schema?: string;
  schemaVersion: 1;
  edition: "desktop" | "server";
  updated: string;
  systems: System[];
  categories: { id: string; name: Localized }[];
  repositories: Record<string, Repository>;
  profiles: Record<string, Profile>;
  items: Item[];
}

export const ALL_SYSTEMS: readonly System[] = ["ubuntu", "debian", "mint", "zorin", "arch", "omarchy", "macos", "windows", "wsl"];

const DEBIAN_FAMILY: readonly System[] = ["ubuntu", "debian", "mint", "zorin", "wsl"];
const ARCH_FAMILY: readonly System[] = ["arch", "omarchy"];

/**
 * Install keys that apply to a system, from the most specific to the most
 * general. The first key present in an item's `install` map wins.
 *
 * Example: WSL looks at `wsl`, then `debian-family`, `linux`, `unix`, `all`.
 */
export function installKeysFor(system: System): InstallKey[] {
  const keys: InstallKey[] = [system];
  if (DEBIAN_FAMILY.includes(system)) keys.push("debian-family");
  if (ARCH_FAMILY.includes(system)) keys.push("arch-family");
  if (system !== "macos" && system !== "windows") keys.push("linux");
  if (system !== "windows") keys.push("unix");
  keys.push("all");
  return keys;
}

/** Install entry for `item` on `system`, or undefined when none matches. */
export function resolveInstall(item: Item, system: System): InstallEntry | undefined {
  for (const key of installKeysFor(system)) {
    const entry = item.install[key];
    if (entry) return entry;
  }
  return undefined;
}

/** Flags of an item on one system: the item flags plus the entry flags. */
export function flagsFor(item: Item, system: System): Flag[] {
  const entry = resolveInstall(item, system);
  return [...new Set([...(item.flags ?? []), ...(entry?.flags ?? [])])];
}

/**
 * Item ids of a profile, following `extends` chains.
 *
 * @throws when the profile is missing or the chain loops.
 */
export function profileItems(inventory: Inventory, name: string, seen: string[] = []): string[] {
  const profile = inventory.profiles[name];
  if (!profile) throw new Error(`Unknown profile: ${name}`);
  if (seen.includes(name)) throw new Error(`Profile loop: ${[...seen, name].join(" -> ")}`);
  const base = profile.extends ? profileItems(inventory, profile.extends, [...seen, name]) : [];
  return [...new Set([...base, ...profile.items])];
}

/** Replaces {version} in a string with the item version. */
export function withVersion(text: string, item: Item): string {
  return text.replaceAll("{version}", item.version.replace(/^v/, ""));
}

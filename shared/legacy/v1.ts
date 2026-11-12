/**
 * SetupVibe 1 on this machine: detection and migration (spec section 16).
 *
 * SetupVibe 1 (0.41.x, the desktop.sh, server.sh, omarchy.sh and desktop.ps1
 * scripts) records no version on disk. It leaves these traces:
 *
 * - `~/.zshrc` and `~/.tmux.conf` replaced by the files in `conf/`, without
 *   markers, with personal settings in `~/.zshrc.local` and
 *   `~/.tmux.conf.local`;
 * - `~/.setupvibe/bin/ssh_copy_id` and `~/.setupvibe/portainer-compose.yml`;
 * - on Omarchy, a `# >>> SetupVibe Omarchy 4 >>>` block in `~/.bashrc`;
 * - on Windows, state files in `%ProgramData%\SetupVibe\` and
 *   `~/.setupvibe/windows-utilities.json`;
 * - duplicates of what SetupVibe 2 installs with mise (see `legacyFindings`).
 *
 * `migrate` turns those files into the SetupVibe 2 layout without losing
 * anything: lines the person added to the SetupVibe 1 `.zshrc` and
 * `.tmux.conf` (lines that are not in the original 0.41.21 files embedded
 * below) move to the `.local` files, every file is backed up first, and the
 * duplicates are only removed when the person confirms each one.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { dirname, join } from "node:path";
import zshrcLinux from "./v1/zshrc-linux.zsh" with { type: "text" };
import zshrcMacos from "./v1/zshrc-macos.zsh" with { type: "text" };
import zshrcServer from "./v1/zshrc-server.zsh" with { type: "text" };
import tmuxDesktop from "./v1/tmux-desktop.conf" with { type: "text" };
import tmuxServer from "./v1/tmux-server.conf" with { type: "text" };
import sshCopyIdShortcut from "./ssh_copy_id.sh" with { type: "text" };
import type { Step } from "../exec/runner.ts";
import { backupOnce, BLOCK_START } from "../shell/config.ts";

/** First line of every SetupVibe 1 zshrc. */
const ZSHRC_SIGNATURE = "# 1. PATH CONFIGURATION (Must come first!)";
const OMARCHY_START = "# >>> SetupVibe Omarchy";
const OMARCHY_END = "# <<< SetupVibe Omarchy";

export type V1Edition = "desktop" | "server" | "omarchy" | "windows";

export interface V1Detection {
  found: boolean;
  /** Edition guessed from the files; undefined when nothing was found. */
  edition?: V1Edition;
  /** What was found, for system, doctor and the TUI. */
  traces: string[];
  zshrc: boolean;
  tmux: boolean;
  omarchyBlock: boolean;
  sshCopyId: boolean;
  /** Windows state files of desktop.ps1. */
  windowsState: string[];
}

export interface V1Probe {
  home: string;
  exists: (path: string) => boolean;
  read: (path: string) => string;
  programData?: string;
}

const realProbe = (home: string): V1Probe => ({
  home,
  exists: existsSync,
  read: (p) => {
    try {
      return readFileSync(p, "utf8");
    } catch {
      return "";
    }
  },
  programData: process.env.ProgramData ?? process.env.PROGRAMDATA,
});

/** True when a zshrc is the SetupVibe 1 file (not yet migrated). */
export function isV1Zshrc(text: string): boolean {
  if (text.includes(BLOCK_START)) return false;
  return text.includes(ZSHRC_SIGNATURE) || similarity(text, V1_ZSHRC) >= 0.6;
}

/**
 * Share of the non-empty lines of `text` that appear in the original files.
 * Older 0.41.x files differ a little from 0.41.21, so detection uses this
 * share instead of an exact match.
 */
export function similarity(text: string, originals: string[]): number {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return 0;
  const known = new Set(originals.flatMap((o) => o.split("\n").map((l) => l.trim())));
  return lines.filter((l) => known.has(l)).length / lines.length;
}

/** True when a tmux.conf is the SetupVibe 1 file (not yet migrated). */
export function isV1Tmux(text: string): boolean {
  if (text.includes(BLOCK_START) || !text.includes("tmux-plugins/tpm")) return false;
  return text.includes(".tmux.conf.local") || similarity(text, V1_TMUX) >= 0.6;
}

/** Hides the value of variables that look like secrets, for plans and logs. */
export function maskSecretLine(line: string): string {
  return line.replace(/\b([A-Z0-9_]*(?:TOKEN|PAT|KEY|SECRET|PASSWORD|PASS)[A-Z0-9_]*\s*=\s*)(["']?)[^"'\s]+/gi, "$1$2****");
}

/** Finds SetupVibe 1 on this machine. */
export function detectV1(probe: V1Probe): V1Detection {
  const { home, exists, read } = probe;
  const traces: string[] = [];
  const zshrcText = read(join(home, ".zshrc"));
  const zshrc = isV1Zshrc(zshrcText);
  if (zshrc) traces.push("~/.zshrc from SetupVibe 1");
  const tmux = isV1Tmux(read(join(home, ".tmux.conf")));
  if (tmux) traces.push("~/.tmux.conf from SetupVibe 1");
  const omarchyBlock = read(join(home, ".bashrc")).includes(OMARCHY_START);
  if (omarchyBlock) traces.push("SetupVibe Omarchy block in ~/.bashrc");
  const sshCopyIdPath = join(home, ".setupvibe", "bin", "ssh_copy_id");
  const sshCopyId = exists(sshCopyIdPath) && !read(sshCopyIdPath).includes("kept by SetupVibe 2");
  if (sshCopyId) traces.push("~/.setupvibe/bin/ssh_copy_id");
  if (exists(join(home, ".setupvibe", "portainer-compose.yml"))) traces.push("~/.setupvibe/portainer-compose.yml");
  const windowsState: string[] = [];
  if (probe.programData) {
    for (const f of ["wsl-feature-state.json", "wsl-firewall-inbound.txt", "openssh-firewall-state.json", "windows-runtime-paths.json", "windows-ai-cli-paths.json", "windows-package-paths.json"]) {
      const p = join(probe.programData, "SetupVibe", f);
      if (exists(p)) windowsState.push(p);
    }
  }
  if (exists(join(home, ".setupvibe", "windows-utilities.json"))) windowsState.push(join(home, ".setupvibe", "windows-utilities.json"));
  if (windowsState.length) traces.push(`Windows state of desktop.ps1 (${windowsState.length} file(s))`);
  const found = traces.length > 0;
  const edition: V1Edition | undefined = !found
    ? undefined
    : windowsState.length
      ? "windows"
      : omarchyBlock
        ? "omarchy"
        : zshrcText.includes('export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"')
          ? "server"
          : "desktop";
  return { found, ...(edition ? { edition } : {}), traces, zshrc, tmux, omarchyBlock, sshCopyId, windowsState };
}

/** Detection on the running machine. */
export function detectV1Here(home: string): V1Detection {
  return detectV1(realProbe(home));
}

/** Lines of `current` that are not in any of the original files (the person's own lines). */
export function addedLines(current: string, originals: string[]): string[] {
  const known = new Set(originals.flatMap((o) => o.split("\n").map((l) => l.trim())));
  return current
    .split("\n")
    .filter((l) => l.trim() !== "" && !known.has(l.trim()));
}

export const V1_ZSHRC = [zshrcLinux, zshrcMacos, zshrcServer];
export const V1_TMUX = [tmuxDesktop, tmuxServer];

/**
 * Text appended to a `.local` file with the lines moved out of a SetupVibe 1
 * file. Empty when there is nothing to move.
 */
export function movedBlock(lines: string[], from: string, at: string): string {
  if (!lines.length) return "";
  return `\n# Moved from ${from} by setupvibe migrate on ${at.slice(0, 10)}: lines you added to the SetupVibe 1 file.\n${lines.join("\n")}\n`;
}

/** Removes the SetupVibe 1 Omarchy block from a .bashrc. */
export function withoutOmarchyBlock(text: string): string {
  const start = text.indexOf(OMARCHY_START);
  if (start === -1) return text;
  const endMarker = text.indexOf(OMARCHY_END, start);
  if (endMarker === -1) return text;
  const end = text.indexOf("\n", endMarker);
  return `${text.slice(0, start).replace(/\n+$/, "\n")}${end === -1 ? "" : text.slice(end + 1)}`;
}

/** Converts one SetupVibe 1 file: backup, personal lines to `.local`, file emptied for the new block. */
function convertStep(id: string, description: string, file: string, local: string, originals: string[], home: string, now: () => string): Step {
  return {
    id,
    description,
    commands: [],
    actionDescription: `back up ${file}, move the lines you added to ${local}, then let SetupVibe 2 write its block`,
    action: async () => {
      const current = existsSync(file) ? readFileSync(file, "utf8") : "";
      backupOnce(file, home);
      const moved = movedBlock(addedLines(current, originals), file.replace(home, "~"), now());
      if (moved) writeFileSync(local, (existsSync(local) ? readFileSync(local, "utf8") : "") + moved);
      else if (!existsSync(local)) writeFileSync(local, "");
      writeFileSync(file, "");
    },
  };
}

export interface MigrateOptions {
  home: string;
  detection: V1Detection;
  /** Clock for the note in the `.local` files. */
  now?: () => string;
}

/**
 * Steps that move the SetupVibe 1 files to the SetupVibe 2 layout. The shell
 * blocks themselves come from `shellSteps`, added by the command after these.
 */
export function migrateSteps(o: MigrateOptions): Step[] {
  const now = o.now ?? (() => new Date().toISOString());
  const steps: Step[] = [];
  const zshrc = join(o.home, ".zshrc");
  const tmux = join(o.home, ".tmux.conf");
  if (o.detection.zshrc) steps.push(convertStep("migrate-zshrc", "Move ~/.zshrc from SetupVibe 1 to the SetupVibe 2 block, keeping your lines in ~/.zshrc.local", zshrc, join(o.home, ".zshrc.local"), V1_ZSHRC, o.home, now));
  if (o.detection.tmux) steps.push(convertStep("migrate-tmux", "Move ~/.tmux.conf from SetupVibe 1 to the SetupVibe 2 block, keeping your lines in ~/.tmux.conf.local", tmux, join(o.home, ".tmux.conf.local"), V1_TMUX, o.home, now));
  if (o.detection.omarchyBlock) {
    const bashrc = join(o.home, ".bashrc");
    steps.push({
      id: "migrate-omarchy-block",
      description: "Replace the SetupVibe Omarchy block in ~/.bashrc with the SetupVibe 2 block",
      commands: [],
      actionDescription: `back up ${bashrc} and remove the "# >>> SetupVibe Omarchy" block`,
      action: async () => {
        backupOnce(bashrc, o.home);
        writeFileSync(bashrc, withoutOmarchyBlock(readFileSync(bashrc, "utf8")));
      },
    });
  }
  if (o.detection.sshCopyId) {
    const file = join(o.home, ".setupvibe", "bin", "ssh_copy_id");
    steps.push({
      id: "migrate-ssh-copy-id",
      description: "Keep ssh_copy_id as a shortcut to setupvibe ssh copy-id, with the same options",
      commands: [],
      actionDescription: `back up ${file} and write the shortcut`,
      action: async () => {
        backupOnce(file, o.home);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, sshCopyIdShortcut);
        chmodSync(file, 0o755);
      },
    });
  }
  return steps;
}

/** Removal steps for the SetupVibe 1 duplicates, by `legacyFindings` id. */
export function legacyRemoveStep(id: string, home: string): Step | undefined {
  switch (id) {
    case "legacy-go":
      return { id, description: "Remove Go from SetupVibe 1 (~/.local/go)", commands: [{ argv: ["rm", "-rf", join(home, ".local", "go")] }] };
    case "legacy-rbenv":
      return { id, description: "Remove rbenv from SetupVibe 1 (~/.rbenv)", commands: [{ argv: ["rm", "-rf", join(home, ".rbenv")] }] };
    case "legacy-npm-global":
      return { id, description: "Remove the global npm packages from SetupVibe 1 (~/.npm-global)", commands: [{ argv: ["rm", "-rf", join(home, ".npm-global")] }] };
    case "legacy-nodesource":
      return {
        id,
        description: "Remove the NodeSource repository from SetupVibe 1 (Node stays until you remove it)",
        commands: [
          { argv: ["rm", "-f", "/etc/apt/sources.list.d/nodesource.list", "/etc/apt/sources.list.d/nodesource.sources", "/etc/apt/keyrings/nodesource.gpg", "/usr/share/keyrings/nodesource.gpg"], sudo: true },
        ],
      };
    default:
      // Linuxbrew is shared by every brew formula of the person; SetupVibe only points at its uninstaller.
      return undefined;
  }
}

/** Manual instruction for duplicates SetupVibe does not remove itself. */
export const LINUXBREW_UNINSTALL = 'NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/uninstall.sh)"';

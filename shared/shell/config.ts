/**
 * Environment configuration (spec section 7).
 *
 * SetupVibe edits user files only between markers:
 *
 *   # >>> setupvibe >>>
 *   ...managed lines...
 *   # <<< setupvibe <<<
 *
 * An update replaces only the block; removal deletes only the block. Before
 * the first change, the original file goes to ~/.setupvibe/backups/. The
 * managed files themselves (aliases, tmux settings, Starship preset) live in
 * ~/.setupvibe/shell/ and ~/.config/setupvibe/, and personal changes go in
 * ~/.zshrc.local, ~/.bashrc.local and ~/.tmux.conf.local, which SetupVibe
 * creates empty and never overwrites.
 *
 * - ZSH (desktop and server, except Omarchy): PATH, mise, Oh My Zsh with
 *   plugins, zoxide, Starship, aliases, ~/.zshrc.local;
 * - Bash (Omarchy): PATH and aliases, with Starship pointed at SetupVibe's own
 *   file so Omarchy's configuration stays untouched;
 * - tmux: the SetupVibe settings and TPM, then ~/.tmux.conf.local.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { System } from "../inventory.ts";
import type { Step } from "../exec/runner.ts";
import aliases from "./files/aliases.sh" with { type: "text" };
import agentAliases from "./files/aliases-agents.sh" with { type: "text" };
import tmuxDesktop from "./files/tmux-desktop.conf" with { type: "text" };
import tmuxServer from "./files/tmux-server.conf" with { type: "text" };

export const BLOCK_START = "# >>> setupvibe >>>";
export const BLOCK_END = "# <<< setupvibe <<<";

/** Oh My Zsh plugins loaded by the SetupVibe block. */
export const ZSH_PLUGINS = ["git", "rsync", "cp", "extract", "zoxide", "fzf", "zsh-autosuggestions", "zsh-syntax-highlighting", "tmux", "gh", "docker", "docker-compose"];

/** Replaces the SetupVibe block in `text`, or appends it. */
export function upsertBlock(text: string, body: string): string {
  const block = `${BLOCK_START}\n${body.trimEnd()}\n${BLOCK_END}`;
  const start = text.indexOf(BLOCK_START);
  const end = text.indexOf(BLOCK_END);
  if (start !== -1 && end > start) return `${text.slice(0, start)}${block}${text.slice(end + BLOCK_END.length)}`;
  const base = text.length && !text.endsWith("\n") ? `${text}\n` : text;
  return `${base}${base.length ? "\n" : ""}${block}\n`;
}

/** Removes the SetupVibe block from `text`, leaving everything else. */
export function removeBlock(text: string): string {
  const start = text.indexOf(BLOCK_START);
  const end = text.indexOf(BLOCK_END);
  if (start === -1 || end < start) return text;
  const before = text.slice(0, start).replace(/\n\n$/, "\n");
  return `${before}${text.slice(end + BLOCK_END.length).replace(/^\n/, "")}`;
}

/** Body of the ZSH block. */
export function zshBlock(home: string): string {
  return [
    "# Managed by SetupVibe. Personal settings go in ~/.zshrc.local.",
    'export PATH="$HOME/.local/bin:$PATH"',
    '[ -x "$HOME/.local/bin/mise" ] && eval "$("$HOME/.local/bin/mise" activate zsh)"',
    'if [ -d "$HOME/.oh-my-zsh" ]; then',
    '  export ZSH="$HOME/.oh-my-zsh"',
    '  ZSH_THEME=""',
    `  plugins=(${ZSH_PLUGINS.join(" ")})`,
    '  source "$ZSH/oh-my-zsh.sh"',
    "fi",
    'command -v zoxide >/dev/null && eval "$(zoxide init zsh)"',
    'command -v starship >/dev/null && eval "$(starship init zsh)"',
    `[ -f "${join(home, ".setupvibe", "shell", "aliases.sh")}" ] && source "${join(home, ".setupvibe", "shell", "aliases.sh")}"`,
    `[ -f "${join(home, ".setupvibe", "shell", "aliases-agents.sh")}" ] && source "${join(home, ".setupvibe", "shell", "aliases-agents.sh")}"`,
    '[ -f "$HOME/.zshrc.local" ] && source "$HOME/.zshrc.local"',
  ].join("\n");
}

/** Body of the Bash block used on Omarchy. */
export function bashBlock(home: string): string {
  return [
    "# Managed by SetupVibe. Personal settings go in ~/.bashrc.local.",
    'export PATH="$HOME/.local/bin:$PATH"',
    `export STARSHIP_CONFIG="${join(home, ".config", "setupvibe", "starship.toml")}"`,
    `[ -f "${join(home, ".setupvibe", "shell", "aliases.sh")}" ] && source "${join(home, ".setupvibe", "shell", "aliases.sh")}"`,
    `[ -f "${join(home, ".setupvibe", "shell", "aliases-agents.sh")}" ] && source "${join(home, ".setupvibe", "shell", "aliases-agents.sh")}"`,
    '[ -f "$HOME/.bashrc.local" ] && source "$HOME/.bashrc.local"',
  ].join("\n");
}

/** Body of the tmux block. */
export function tmuxBlock(home: string): string {
  return [`# Managed by SetupVibe. Personal settings go in ~/.tmux.conf.local.`, `source-file "${join(home, ".setupvibe", "shell", "tmux.conf")}"`].join("\n");
}

/**
 * Managed tmux settings: the SetupVibe 1 file of the edition, which already
 * loads ~/.tmux.conf.local before TPM and restores the bindings plugins
 * override after it.
 */
export function tmuxSettings(edition: "desktop" | "server"): string {
  return edition === "server" ? tmuxServer : tmuxDesktop;
}

/** Files SetupVibe owns and replaces on every apply. */
export function managedFiles(home: string, edition: "desktop" | "server", agentAliasesOn: boolean): Record<string, string> {
  const files: Record<string, string> = {
    [join(home, ".setupvibe", "shell", "aliases.sh")]: aliases,
    [join(home, ".setupvibe", "shell", "tmux.conf")]: tmuxSettings(edition),
  };
  if (agentAliasesOn) files[join(home, ".setupvibe", "shell", "aliases-agents.sh")] = agentAliases;
  return files;
}

/** Keeps a copy of a user file before its first change. Returns the backup path, if one was made. */
export function backupOnce(path: string, home: string, now = new Date()): string | undefined {
  if (!existsSync(path)) return undefined;
  const name = path.split("/").pop()!;
  const marker = join(home, ".setupvibe", "backups", `${name}.first`);
  if (existsSync(marker)) return undefined;
  mkdirSync(dirname(marker), { recursive: true, mode: 0o700 });
  const target = join(home, ".setupvibe", "backups", `${name}.${now.toISOString().replace(/[:.]/g, "-")}`);
  copyFileSync(path, target);
  copyFileSync(path, marker);
  return target;
}

/** Writes the block into a user file, backing it up first. */
export function applyBlock(path: string, body: string, home: string): void {
  const current = existsSync(path) ? readFileSync(path, "utf8") : "";
  const next = upsertBlock(current, body);
  if (next === current) return;
  backupOnce(path, home);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, next);
}

/** Removes the block from a user file, when present. */
export function dropBlock(path: string): boolean {
  if (!existsSync(path)) return false;
  const current = readFileSync(path, "utf8");
  const next = removeBlock(current);
  if (next === current) return false;
  writeFileSync(path, next);
  return true;
}

export interface ShellOptions {
  system: System;
  edition: "desktop" | "server";
  user: string;
  home?: string;
  /** Load the agent aliases (cc, cx, oc). */
  agentAliases?: boolean;
  /** The items present on this machine, to configure only what exists. */
  zsh: boolean;
  tmux: boolean;
  starship: boolean;
}

/** Steps that configure the shell environment. */
export function shellSteps(o: ShellOptions): Step[] {
  const home = o.home ?? homedir();
  const omarchy = o.system === "omarchy";
  const steps: Step[] = [];
  if (o.system === "windows") return steps;
  steps.push({
    id: "shell-files",
    description: "Write the SetupVibe aliases and tmux settings to ~/.setupvibe/shell/",
    commands: [],
    actionDescription: `write ${Object.keys(managedFiles(home, o.edition, o.agentAliases ?? true)).join(", ")}`,
    action: async () => {
      for (const [path, content] of Object.entries(managedFiles(home, o.edition, o.agentAliases ?? true))) {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, content);
      }
      const agents = join(home, ".setupvibe", "shell", "aliases-agents.sh");
      if (!(o.agentAliases ?? true) && existsSync(agents)) writeFileSync(agents, "");
      for (const local of [omarchy ? ".bashrc.local" : ".zshrc.local", ...(o.tmux ? [".tmux.conf.local"] : [])]) {
        const p = join(home, local);
        if (!existsSync(p)) writeFileSync(p, `# Personal settings. SetupVibe never overwrites this file.\n`);
      }
    },
  });
  if (o.starship) {
    const target = omarchy ? join(home, ".config", "setupvibe", "starship.toml") : join(home, ".config", "starship.toml");
    steps.push({
      id: "starship-preset",
      description: `Starship gruvbox-rainbow preset in ${target}`,
      skipIf: { argv: ["test", "-s", target] },
      commands: [
        { argv: ["mkdir", "-p", dirname(target)] },
        { argv: ["sh", "-c", 'PATH="$HOME/.local/share/mise/shims:$HOME/.local/bin:$PATH" starship preset gruvbox-rainbow -o "$1"', "sh", target] },
      ],
    });
  }
  const rc = join(home, omarchy ? ".bashrc" : ".zshrc");
  if (omarchy || o.zsh) {
    steps.push({
      id: "shell-block",
      description: `SetupVibe block in ${rc}`,
      commands: [],
      actionDescription: `back up ${rc} once, then write the block between "${BLOCK_START}" and "${BLOCK_END}"`,
      action: async () => applyBlock(rc, omarchy ? bashBlock(home) : zshBlock(home), home),
    });
  }
  if (o.tmux && !omarchy) {
    const conf = join(home, ".tmux.conf");
    steps.push({
      id: "tmux-block",
      description: `SetupVibe block in ${conf}`,
      commands: [],
      actionDescription: `back up ${conf} once, then write the block that loads ~/.setupvibe/shell/tmux.conf`,
      action: async () => applyBlock(conf, tmuxBlock(home), home),
    });
  }
  if (o.zsh && !omarchy && o.system !== "macos") {
    steps.push({
      id: "login-shell",
      description: `Make ZSH the login shell of ${o.user}`,
      skipIf: { argv: ["sh", "-c", `getent passwd "${o.user}" | cut -d: -f7 | grep -q zsh`] },
      commands: [{ argv: ["sh", "-c", 'chsh -s "$(command -v zsh)" "$1"', "sh", o.user], sudo: true }],
    });
  }
  return steps;
}

/** Steps that remove the SetupVibe blocks (self uninstall). */
export function shellRemoveSteps(home = homedir()): Step[] {
  return [
    {
      id: "shell-blocks-remove",
      description: "Remove the SetupVibe blocks from ~/.zshrc, ~/.bashrc and ~/.tmux.conf",
      commands: [],
      actionDescription: "delete only the lines between the SetupVibe markers",
      action: async () => {
        for (const f of [".zshrc", ".bashrc", ".tmux.conf"]) dropBlock(join(home, f));
      },
    },
  ];
}

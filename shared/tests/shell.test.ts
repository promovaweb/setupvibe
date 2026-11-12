/** Environment configuration: managed blocks, files, backups and the auto plan (spec section 7). */
import "../../desktop/src/edition.ts";
import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import desktopJson from "../../desktop/inventory.json";
import type { Inventory } from "../inventory";
import { dryRunner, runSteps } from "../exec/runner";
import { applyBlock, bashBlock, BLOCK_END, BLOCK_START, dropBlock, managedFiles, removeBlock, shellSteps, tmuxSettings, upsertBlock, zshBlock } from "../shell/config";
import { autoPlan } from "../auto/plan";
import { resolveAnswers } from "../auto/answers";
import { selectItems } from "../auto/selection";

const desktop = desktopJson as Inventory;

describe("managed blocks", () => {
  test("append, replace in place and remove, keeping the user's lines", () => {
    const user = "export EDITOR=vim\nalias ll='ls -l'\n";
    const once = upsertBlock(user, "A=1");
    expect(once).toBe(`${user}\n${BLOCK_START}\nA=1\n${BLOCK_END}\n`);
    const twice = upsertBlock(`${once}export AFTER=1\n`, "A=2");
    expect(twice).toContain("A=2");
    expect(twice).not.toContain("A=1");
    expect(twice).toContain("export AFTER=1");
    expect(twice.indexOf("A=2")).toBeLessThan(twice.indexOf("export AFTER=1"));
    expect(upsertBlock(twice, "A=2")).toBe(twice);
    const removed = removeBlock(twice);
    expect(removed).toContain("export EDITOR=vim");
    expect(removed).toContain("export AFTER=1");
    expect(removed).not.toContain(BLOCK_START);
  });

  test("empty files get only the block", () => {
    expect(upsertBlock("", "X")).toBe(`${BLOCK_START}\nX\n${BLOCK_END}\n`);
  });

  test("files are backed up once, before the first change", () => {
    const home = mkdtempSync(join(tmpdir(), "sv-shell-"));
    const rc = join(home, ".zshrc");
    writeFileSync(rc, "# mine\n");
    applyBlock(rc, "A=1", home);
    applyBlock(rc, "A=2", home);
    const backups = readdirSync(join(home, ".setupvibe", "backups"));
    expect(backups.filter((b) => b.startsWith(".zshrc.") && !b.endsWith(".first"))).toHaveLength(1);
    expect(readFileSync(join(home, ".setupvibe", "backups", ".zshrc.first"), "utf8")).toBe("# mine\n");
    expect(dropBlock(rc)).toBe(true);
    expect(readFileSync(rc, "utf8")).toBe("# mine\n");
    rmSync(home, { recursive: true, force: true });
  });
});

describe("contents", () => {
  test("ZSH block: PATH, mise, Oh My Zsh, Starship, aliases and the .local file last", () => {
    const b = zshBlock("/home/u");
    expect(b).toContain('export PATH="$HOME/.local/bin:$PATH"');
    expect(b).toContain("mise\" activate zsh");
    expect(b).toContain("starship init zsh");
    expect(b.trimEnd().split("\n").at(-1)).toContain(".zshrc.local");
  });

  test("Omarchy Bash block keeps Omarchy's Starship config", () => {
    expect(bashBlock("/home/u")).toContain('STARSHIP_CONFIG="/home/u/.config/setupvibe/starship.toml"');
  });

  test("tmux settings load .local before TPM", () => {
    for (const edition of ["desktop", "server"] as const) {
      const lines = tmuxSettings(edition).split("\n");
      const local = lines.findIndex((l) => l.startsWith("if-shell") && l.includes("tmux.conf.local"));
      const tpm = lines.findIndex((l) => l.startsWith("run '~/.tmux/plugins/tpm/tpm'"));
      expect(local).toBeGreaterThan(-1);
      expect(local).toBeLessThan(tpm);
    }
  });

  test("agent aliases are optional", () => {
    expect(Object.keys(managedFiles("/h", "desktop", true))).toContain("/h/.setupvibe/shell/aliases-agents.sh");
    expect(Object.keys(managedFiles("/h", "desktop", false))).not.toContain("/h/.setupvibe/shell/aliases-agents.sh");
    expect(managedFiles("/h", "desktop", true)["/h/.setupvibe/shell/aliases.sh"]).not.toContain("--dangerously-skip-permissions");
  });

  test("the aliases file is valid in Bash and ZSH", () => {
    const file = join(import.meta.dir, "../shell/files/aliases.sh");
    expect(Bun.spawnSync(["bash", "-n", file]).exitCode).toBe(0);
    if (Bun.which("zsh")) expect(Bun.spawnSync(["zsh", "-n", file]).exitCode).toBe(0);
  });
});

describe("steps", () => {
  test("a real apply writes the files, the blocks and the .local files", async () => {
    const home = mkdtempSync(join(tmpdir(), "sv-shell-apply-"));
    const steps = shellSteps({ system: "debian", edition: "desktop", user: "u", home, zsh: true, tmux: true, starship: false });
    await runSteps(steps.filter((s) => s.action), { dryRun: false, exec: async () => ({ code: 0, stdout: "", stderr: "" }) });
    expect(readFileSync(join(home, ".zshrc"), "utf8")).toContain(BLOCK_START);
    expect(readFileSync(join(home, ".tmux.conf"), "utf8")).toContain(".setupvibe/shell/tmux.conf");
    for (const f of [".zshrc.local", ".tmux.conf.local", ".setupvibe/shell/aliases.sh"]) expect(existsSync(join(home, f)), f).toBe(true);
    rmSync(home, { recursive: true, force: true });
  });

  test("Omarchy edits .bashrc only and never switches the login shell", () => {
    const steps = shellSteps({ system: "omarchy", edition: "desktop", user: "u", home: "/h", zsh: false, tmux: true, starship: true });
    expect(steps.map((s) => s.id)).toEqual(["shell-files", "starship-preset", "shell-block"]);
    expect(steps.find((s) => s.id === "shell-block")!.description).toContain("/h/.bashrc");
  });

  test("auto configures the shell; a plain install does not", async () => {
    const base = {
      inventory: desktop,
      edition: "desktop" as const,
      system: "debian" as const,
      arch: "x64",
      variant: "local" as const,
      distro: { distro: "debian", codename: "trixie" },
      user: "u",
      userHasKey: false,
      initDone: true,
      memoryGb: 8,
      answers: resolveAnswers({}, {}),
      createdNopasswd: false,
      home: "/h",
    };
    const full = autoPlan({ ...base, selection: selectItems({ inventory: desktop, system: "debian", headless: false, profile: "essencial" }) });
    expect(full.steps.map((s) => s.id)).toContain("shell-block");
    const one = autoPlan({ ...base, shell: false, selection: selectItems({ inventory: desktop, system: "debian", headless: false, ids: ["go"] }) });
    expect(one.steps.map((s) => s.id)).not.toContain("shell-block");
    const runner = dryRunner();
    await runSteps(full.steps, runner);
    expect(runner.calls.length).toBeGreaterThan(0);
  });
});

describe("aliases never hide your setup or a real program (task 17)", () => {
  const { aliasNames, skippedAliases, agentAliasesEnabled } = require("../shell/config") as typeof import("../shell/config");
  const { mkdtempSync: mk, mkdirSync: md, writeFileSync: wf, chmodSync: cm, rmSync: rm } = require("node:fs") as typeof import("node:fs");
  const { tmpdir: td } = require("node:os") as typeof import("node:os");

  test("the renamed aliases replace the names that hid programs", () => {
    const names = aliasNames();
    for (const n of ["cco", "cxo", "oco", "gstat", "cin", "tsv", "dco", "gofmtw"]) expect(names).toContain(n);
    for (const n of ["cc", "gs", "ci", "ts", "dc", "gofmt"]) expect(names).not.toContain(n);
    expect(aliasNames(false)).not.toContain("cco");
  });

  test("doctor lists aliases whose name is an installed command, except df, pn and pnx", () => {
    const which = (n: string) => (["gstat", "df", "pn", "oc"].includes(n) ? `/usr/bin/${n}` : null);
    expect(skippedAliases(which)).toEqual([{ name: "gstat", path: "/usr/bin/gstat" }, { name: "oc", path: "/usr/bin/oc" }]);
    expect(skippedAliases(which, false)).toEqual([{ name: "gstat", path: "/usr/bin/gstat" }]);
  });

  test("shell.agentAliases in settings turns the agent aliases off; config.json false still counts", () => {
    expect(agentAliasesEnabled({}, () => true)).toBe(true);
    expect(agentAliasesEnabled({}, () => false)).toBe(false);
    expect(agentAliasesEnabled({ shell: { agentAliases: false } }, () => true)).toBe(false);
  });

  for (const shell of ["bash", "zsh"]) {
    test.skipIf(!Bun.which(shell))(`${shell}: your alias stays, a command with the same name wins, df wraps`, () => {
      const dir = mk(join(td(), "sv-alias-"));
      try {
        md(join(dir, "bin"));
        wf(join(dir, "bin", "gstat"), "#!/bin/sh\n");
        cm(join(dir, "bin", "gstat"), 0o755);
        const files = join(import.meta.dir, "../shell/files");
        const script = `alias ll="echo mine"; . "${files}/aliases.sh"; . "${files}/aliases-agents.sh"; for n in ll gstat df cco cxo oco; do alias $n 2>/dev/null || echo "$n=skipped"; done; type _sv_alias >/dev/null 2>&1 && echo leaked || echo clean`;
        const out = Bun.spawnSync([shell, "-c", script], { env: { HOME: dir, PATH: `${join(dir, "bin")}:/usr/bin:/bin` } }).stdout.toString();
        expect(out).toContain("ll='echo mine'");
        expect(out).toContain("gstat=skipped");
        expect(out).toContain("df='df -h'");
        expect(out).toContain("cxo='codex --yolo'");
        expect(out).toContain("oco='opencode --auto'");
        expect(out).toContain("clean");
      } finally {
        rm(dir, { recursive: true, force: true });
      }
    });
  }
});

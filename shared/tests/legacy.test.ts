/** SetupVibe 1 detection and migration (task 15, spec section 16). */
import "../../desktop/src/edition.ts";
import { describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  addedLines,
  detectV1,
  isV1Tmux,
  isV1Zshrc,
  legacyRemoveStep,
  maskSecretLine,
  migrateSteps,
  V1_TMUX,
  V1_ZSHRC,
  withoutOmarchyBlock,
  type V1Probe,
} from "../legacy/v1";
import { parseRemoveLegacy } from "../commands/migrate";
import { dryRunner, runSteps } from "../exec/runner";

const zshrcV1 = V1_ZSHRC[0]!;
const tmuxV1 = V1_TMUX[0]!;

function probe(files: Record<string, string>, programData?: string): V1Probe {
  return { home: "/h", exists: (p) => p in files, read: (p) => files[p] ?? "", ...(programData ? { programData } : {}) };
}

describe("detection", () => {
  test("a clean machine has no SetupVibe 1", () => {
    expect(detectV1(probe({})).found).toBe(false);
  });

  test("the desktop files, ssh_copy_id and Portainer are found", () => {
    const d = detectV1(probe({ "/h/.zshrc": zshrcV1, "/h/.tmux.conf": tmuxV1, "/h/.setupvibe/bin/ssh_copy_id": "#!/usr/bin/env bash", "/h/.setupvibe/portainer-compose.yml": "x" }));
    expect(d).toMatchObject({ found: true, edition: "desktop", zshrc: true, tmux: true, sshCopyId: true });
    expect(d.traces.length).toBe(4);
  });

  test("the server zshrc, the Omarchy block and the Windows state choose the edition", () => {
    expect(detectV1(probe({ "/h/.zshrc": V1_ZSHRC[2]! })).edition).toBe("server");
    expect(detectV1(probe({ "/h/.bashrc": "a\n# >>> SetupVibe Omarchy 4 >>>\nx\n# <<< SetupVibe Omarchy 4 <<<\n" })).edition).toBe("omarchy");
    expect(detectV1(probe({ "C:/PD/SetupVibe/openssh-firewall-state.json": "{}" }, "C:/PD")).edition).toBe("windows");
  });

  test("files already migrated, and an older tmux.conf, are told apart", () => {
    expect(isV1Zshrc(`${zshrcV1}\n# >>> setupvibe >>>\n`)).toBe(false);
    const older = tmuxV1.split("\n").filter((l) => !l.includes(".tmux.conf.local")).join("\n");
    expect(isV1Tmux(older)).toBe(true);
    expect(isV1Tmux("set -g @plugin 'tmux-plugins/tpm'\nmy own line 1\nmy own line 2\nmy own line 3\n")).toBe(false);
  });

  test("the ssh_copy_id shortcut of SetupVibe 2 is not taken for SetupVibe 1", () => {
    expect(detectV1(probe({ "/h/.setupvibe/bin/ssh_copy_id": "# kept by SetupVibe 2 as a shortcut" })).sshCopyId).toBe(false);
  });
});

describe("migration", () => {
  test("only the lines the person added move, and secrets are masked in the plan", () => {
    const current = `${zshrcV1}\nexport MY_TOKEN='abc123'\nalias k=kubectl\n`;
    expect(addedLines(current, V1_ZSHRC)).toEqual(["export MY_TOKEN='abc123'", "alias k=kubectl"]);
    expect(maskSecretLine("export MY_TOKEN='abc123'")).toBe("export MY_TOKEN='****'");
    expect(maskSecretLine("alias k=kubectl")).toBe("alias k=kubectl");
  });

  test("the Omarchy block is removed and the rest of .bashrc stays", () => {
    expect(withoutOmarchyBlock("before\n# >>> SetupVibe Omarchy 4 >>>\nx\n# <<< SetupVibe Omarchy 4 <<<\nafter\n")).toBe("before\nafter\n");
  });

  test("--remove-legacy accepts the known ids or all", () => {
    expect(parseRemoveLegacy("go,rbenv")).toEqual(["legacy-go", "legacy-rbenv"]);
    expect(parseRemoveLegacy("all").length).toBe(4);
    expect(() => parseRemoveLegacy("linuxbrew")).toThrow("linuxbrew");
    expect(parseRemoveLegacy(undefined)).toEqual([]);
  });

  test("Linuxbrew is never removed by SetupVibe", () => {
    expect(legacyRemoveStep("legacy-linuxbrew", "/h")).toBeUndefined();
    expect(legacyRemoveStep("legacy-go", "/h")!.commands[0]!.argv).toEqual(["rm", "-rf", "/h/.local/go"]);
  });

  test("migrate backs up, moves the personal lines and writes the shortcut", async () => {
    const home = mkdtempSync(join(tmpdir(), "sv-v1-"));
    try {
      mkdirSync(join(home, ".setupvibe", "bin"), { recursive: true });
      writeFileSync(join(home, ".zshrc"), `${zshrcV1}\nalias k=kubectl\n`);
      writeFileSync(join(home, ".zshrc.local"), "export MINE=1\n");
      writeFileSync(join(home, ".tmux.conf"), `${tmuxV1}\nset -g mouse off\n`);
      writeFileSync(join(home, ".setupvibe", "bin", "ssh_copy_id"), "#!/usr/bin/env bash\necho v1\n");
      const detection = detectV1({ home, exists: existsSync, read: (p) => (existsSync(p) ? readFileSync(p, "utf8") : "") });
      const steps = migrateSteps({ home, detection, now: () => "2026-11-12T00:00:00Z" });
      expect(steps.map((s) => s.id)).toEqual(["migrate-zshrc", "migrate-tmux", "migrate-ssh-copy-id"]);
      const results = await runSteps(steps, { ...dryRunner(), dryRun: false });
      expect(results.every((r) => r.status === "ok")).toBe(true);
      expect(readFileSync(join(home, ".zshrc"), "utf8")).toBe("");
      const local = readFileSync(join(home, ".zshrc.local"), "utf8");
      expect(local).toContain("export MINE=1");
      expect(local).toContain("alias k=kubectl");
      expect(local).toContain("Moved from ~/.zshrc by setupvibe migrate on 2026-11-12");
      expect(readFileSync(join(home, ".tmux.conf.local"), "utf8")).toContain("set -g mouse off");
      expect(readFileSync(join(home, ".setupvibe", "backups", ".zshrc.first"), "utf8")).toContain("alias k=kubectl");
      expect(readFileSync(join(home, ".setupvibe", "bin", "ssh_copy_id"), "utf8")).toContain("kept by SetupVibe 2");
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test("the ssh_copy_id shortcut passes the SetupVibe 1 options to ssh copy-id", () => {
    const dir = mkdtempSync(join(tmpdir(), "sv-copyid-"));
    try {
      const fake = join(dir, "setupvibe");
      writeFileSync(fake, '#!/bin/sh\necho "args: $*"\n[ -t 0 ] || { read -r p || true; echo "stdin: $p"; }\n');
      chmodSync(fake, 0o755);
      const shortcut = join(import.meta.dir, "..", "legacy", "ssh_copy_id.sh");
      const env = { ...process.env, PATH: `${dir}:${process.env.PATH}` };
      const run = (args: string[]) => Bun.spawnSync(["sh", shortcut, ...args], { env, stdin: "ignore" });
      const withPass = run(["--host", "10.0.0.1", "--user", "deploy", "--pass", "s3cret", "--port", "2222"]);
      expect(withPass.stdout.toString()).toContain("args: ssh copy-id deploy@10.0.0.1 --port 2222 --password-stdin");
      expect(withPass.stdout.toString()).toContain("stdin: s3cret");
      expect(run(["--host", "h"]).exitCode).toBe(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

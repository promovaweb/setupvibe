/** Read-only environment diagnostics shared by CLI and MCP. */
import { statSync, readFileSync } from "node:fs";
import { manifest } from "../../app/manifest.ts";
import { ExitCode } from "../../app/exit-codes.ts";
import { paths } from "../../config/paths.ts";
import { getMasterKey, masterKeySource } from "../../config/crypto.ts";
import { readVault } from "../../config/credentials.ts";
import type { Command } from "../registry.ts";

export interface DoctorCheck {
  name: string;
  status: "ok" | "warn" | "fail";
  detail: string;
}

/** Collects independent checks without writing files or exposing secrets. */
export function collectDoctorChecks(runtime = { version: Bun.version, stdin: Boolean(process.stdin.isTTY), stdout: Boolean(process.stdout.isTTY) }) {
  const checks: DoctorCheck[] = [];
  const add = (name: string, status: DoctorCheck["status"], detail: string) => checks.push({ name, status, detail });
  add("bun", Bun.semver.satisfies(runtime.version, ">=1.4.4") ? "ok" : "fail", `${runtime.version}; minimum 1.4.4`);
  for (const stream of ["stdin", "stdout"] as const) add(stream, runtime[stream] ? "ok" : "warn", runtime[stream] ? "TTY available" : "Not a TTY");
  const inspect = (name: string, path: string, check: () => void, detail: string) => {
    try {
      statSync(path);
    } catch (e) {
      add(name, (e as NodeJS.ErrnoException).code === "ENOENT" ? "warn" : "fail", (e as NodeJS.ErrnoException).code === "ENOENT" ? "Not created" : "Cannot access file");
      return;
    }
    try { check(); add(name, "ok", detail); }
    catch { add(name, "fail", "Unreadable, invalid or incorrectly configured"); }
  };
  inspect("directory", paths.base(), () => {
    const stat = statSync(paths.base());
    if (!stat.isDirectory() || (stat.mode & 0o777) !== 0o700) throw new Error("Invalid directory mode");
  }, "Directory exists; mode 0700");
  inspect("settings", paths.settings(), () => {
    const data: unknown = JSON.parse(readFileSync(paths.settings(), "utf8"));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Expected object");
  }, "Readable JSON object");
  const source = masterKeySource();
  try {
    if (source !== "none") getMasterKey(false);
    add("master-key", source === "none" ? "warn" : "ok", source);
  } catch { add("master-key", "fail", `${source}; unavailable or invalid`); }
  inspect("credentials", paths.credentials(), () => { readVault(); }, "Vault decrypted successfully");
  add("binary", "ok", `${manifest.bin} ${manifest.version}`);
  add("platform", "ok", `${process.platform}-${process.arch}`);
  return { checks, ok: checks.every((check) => check.status !== "fail") };
}

export const doctorCommand: Command = {
  name: "doctor",
  description: "Check runtime, terminal, settings, key source and vault readability without changing files.",
  exitCodes: [ExitCode.CONFIG],
  run: () => {
    const data = collectDoctorChecks();
    const marks = { ok: "✓", warn: "!", fail: "✗" };
    return { data, text: data.checks.map((c) => `${marks[c.status]} ${c.name}: ${c.detail}`).join("\n"), code: data.ok ? ExitCode.SUCCESS : ExitCode.CONFIG };
  },
};

/**
 * Run log.
 *
 * Every run that changes the machine writes one log file to
 * `~/.setupvibe/logs/<timestamp>-<command>.log`, one line per event. With
 * `json: true`, each event is also printed to stdout as NDJSON, which is the
 * output format of `setupvibe auto --json` (spec section 9).
 *
 * Secrets are never logged: values of known secret variables are masked
 * before writing.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { statePath } from "./store.ts";

export type EventStatus = "start" | "ok" | "skip" | "fail" | "info";

export interface LogEvent {
  time: string;
  item?: string;
  action: string;
  status: EventStatus;
  durationMs?: number;
  message?: string;
}

/** Environment variables whose values must never reach a log. */
export const SECRET_VARIABLES = ["TAILSCALE_AUTHKEY", "GH_TOKEN", "GITHUB_TOKEN", "SETUPVIBE_SWARM_TOKEN", "SETUPVIBE_MASTER_KEY"] as const;

/** Replaces the values of secret variables found in `text` with `***`. */
export function maskSecrets(text: string, env: Record<string, string | undefined> = process.env): string {
  let out = text;
  for (const name of SECRET_VARIABLES) {
    const value = env[name];
    if (value && value.length >= 4) out = out.replaceAll(value, "***");
  }
  return out;
}

export interface RunLog {
  readonly path: string;
  event(e: Omit<LogEvent, "time">): LogEvent;
}

/**
 * Opens a run log.
 *
 * @param command command name used in the file name, such as `auto`
 * @param options.json also print each event as an NDJSON line on stdout
 * @param options.now clock, replaceable in tests
 */
export function openRunLog(command: string, options: { json?: boolean; now?: () => Date } = {}): RunLog {
  const now = options.now ?? (() => new Date());
  const stamp = now().toISOString().replace(/[:.]/g, "-");
  const path = statePath("logs", `${stamp}-${command}.log`);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  return {
    path,
    event(e) {
      const full: LogEvent = { time: now().toISOString(), ...e, ...(e.message ? { message: maskSecrets(e.message) } : {}) };
      const line = JSON.stringify(full);
      appendFileSync(path, `${line}\n`, { mode: 0o600 });
      if (options.json) process.stdout.write(`${line}\n`);
      return full;
    },
  };
}

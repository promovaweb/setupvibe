/**
 * Domain error carrying an exit code.
 *
 * Every expected failure is thrown as `AppError` with a code from
 * `exit-codes.ts`. The entry layer (`main.ts`) turns the error into a text
 * or JSON message and exits with that code. Errors of any other class fall
 * into `GENERIC_ERROR`.
 */
import { ExitCode, exitCodeName } from "./exit-codes.ts";

export class AppError extends Error {
  readonly code: ExitCode;
  /** Extra data that is safe to show to the user or return in --json. */
  readonly details?: Record<string, unknown>;

  constructor(code: ExitCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }

  /** Stable representation used by the `--json` output. */
  toJSON(): { code: number; name: string; message: string; details?: Record<string, unknown> } {
    return {
      code: this.code,
      name: exitCodeName(this.code),
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

/** Shortcuts for the most common errors. */
export const error = {
  usage: (message: string, details?: Record<string, unknown>) => new AppError(ExitCode.USAGE, message, details),
  config: (message: string, details?: Record<string, unknown>) => new AppError(ExitCode.CONFIG, message, details),
  credentials: (message: string, details?: Record<string, unknown>) =>
    new AppError(ExitCode.CREDENTIALS, message, details),
  network: (message: string, details?: Record<string, unknown>) =>
    new AppError(ExitCode.NETWORK_OR_API, message, details),
  notFound: (message: string, details?: Record<string, unknown>) => new AppError(ExitCode.NOT_FOUND, message, details),
  permission: (message: string, details?: Record<string, unknown>) =>
    new AppError(ExitCode.PERMISSION, message, details),
  noTty: (message: string) => new AppError(ExitCode.NO_TTY, message),
  mcp: (message: string, details?: Record<string, unknown>) => new AppError(ExitCode.MCP, message, details),
  interrupted: (message = "Operation interrupted.") => new AppError(ExitCode.INTERRUPTED, message),
};

/**
 * Converts a Node/Bun file-system error into `AppError`. EACCES and EPERM
 * become PERMISSION; ENOENT becomes NOT_FOUND; anything else gets `fallback`.
 */
export function classifyFsError(e: unknown, fallback: ExitCode, context: string): AppError {
  if (e instanceof AppError) return e;
  const fsCode = (e as { code?: string })?.code;
  const message = e instanceof Error ? e.message : String(e);
  if (fsCode === "EACCES" || fsCode === "EPERM") {
    return new AppError(ExitCode.PERMISSION, `${context}: permission denied (${message}).`);
  }
  if (fsCode === "ENOENT") {
    return new AppError(ExitCode.NOT_FOUND, `${context}: path not found (${message}).`);
  }
  return new AppError(fallback, `${context}: ${message}`);
}

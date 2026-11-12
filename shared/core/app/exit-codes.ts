/**
 * Process exit codes.
 *
 * The CLI, the TUI and the MCP server always exit with one of these codes.
 * Zero means success. Each failure family gets a fixed number so scripts and
 * agents can react without parsing the message. The table is also published
 * in `--help`, `--skill`, the OpenCLI description and the MCP resource
 * `exit-codes`, always from this single source.
 */

/** Exit code enumeration. */
export const ExitCode = {
  /** Operation completed. */
  SUCCESS: 0,
  /** Unexpected failure without a specific classification. */
  GENERIC_ERROR: 1,
  /** Invalid arguments, options or subcommand. */
  USAGE: 2,
  /** settings.json missing, invalid or unknown key. */
  CONFIG: 3,
  /** credentials.json unreadable, master key missing or credential not found. */
  CREDENTIALS: 4,
  /** Network failure or unexpected API response. */
  NETWORK_OR_API: 5,
  /** Requested resource does not exist (file, record, screen, tool). */
  NOT_FOUND: 6,
  /** Permission denied while reading or writing the file system. */
  PERMISSION: 7,
  /** The TUI requires an interactive terminal and stdin or stdout is not a TTY. */
  NO_TTY: 8,
  /** The MCP server failed to start or lost the stdio transport. */
  MCP: 9,
  /** User input cancelled or process interrupted (Ctrl+C). */
  INTERRUPTED: 130,
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];

/** Description of each code, in documentation order. */
export const exitCodeDescriptions: ReadonlyArray<{ code: ExitCode; name: string; description: string }> =
  Object.freeze([
    { code: ExitCode.SUCCESS, name: "SUCCESS", description: "Operation completed." },
    { code: ExitCode.GENERIC_ERROR, name: "GENERIC_ERROR", description: "Unexpected failure without a specific classification." },
    { code: ExitCode.USAGE, name: "USAGE", description: "Invalid arguments, options or subcommand." },
    { code: ExitCode.CONFIG, name: "CONFIG", description: "settings.json missing, invalid or unknown key." },
    { code: ExitCode.CREDENTIALS, name: "CREDENTIALS", description: "credentials.json unreadable, master key missing or credential not found." },
    { code: ExitCode.NETWORK_OR_API, name: "NETWORK_OR_API", description: "Network failure or unexpected API response." },
    { code: ExitCode.NOT_FOUND, name: "NOT_FOUND", description: "Requested resource does not exist." },
    { code: ExitCode.PERMISSION, name: "PERMISSION", description: "Permission denied on the file system." },
    { code: ExitCode.NO_TTY, name: "NO_TTY", description: "The TUI requires an interactive terminal (TTY)." },
    { code: ExitCode.MCP, name: "MCP", description: "The MCP server failed to start or lost the stdio transport." },
    { code: ExitCode.INTERRUPTED, name: "INTERRUPTED", description: "Input cancelled or process interrupted." },
  ]);

/** Returns the symbolic name of a code. */
export function exitCodeName(code: number): string {
  return exitCodeDescriptions.find((item) => item.code === code)?.name ?? "UNKNOWN";
}

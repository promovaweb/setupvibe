/**
 * Answers for `setupvibe auto`.
 *
 * Everything the TUI would ask comes ready, in this order of priority: a
 * command-line option, an environment variable, then the answers file given
 * with `--config` (same format as `config export`). Secrets are read only
 * from variables or files and never written to config.json or logs.
 *
 * Spec section 9.
 */
import { readFileSync } from "node:fs";

export interface AutoAnswers {
  user?: string;
  sshKey?: string;
  gitName?: string;
  gitEmail?: string;
  profile?: string;
  only: string[];
  exclude: string[];
  tailscaleAuthKey?: string;
  ghToken?: string;
  manager: boolean;
  join?: string;
  advertiseAddr?: string;
  timezone?: string;
  reboot: boolean;
  keepNopasswd: boolean;
}

/** Shape of the answers file (`--config`). Secrets are not accepted here. */
export interface AnswersFile {
  user?: string;
  sshKey?: string;
  git?: { name?: string; email?: string };
  profile?: string;
  only?: string[];
  exclude?: string[];
  swarm?: { manager?: boolean; advertiseAddr?: string };
  timezone?: string;
  reboot?: boolean;
  keepNopasswd?: boolean;
}

const csv = (v: string | undefined): string[] | undefined =>
  v === undefined ? undefined : v.split(",").map((s) => s.trim()).filter(Boolean);

const flag = (v: string | boolean | undefined): boolean | undefined => (v === undefined ? undefined : v === true || v === "1" || v === "true");

/**
 * Resolves the answers.
 *
 * @param options parsed command options (long names without dashes)
 * @param env environment variables
 * @param file parsed answers file, when `--config` was given
 */
export function resolveAnswers(options: Record<string, string | boolean | undefined>, env: Record<string, string | undefined>, file: AnswersFile = {}): AutoAnswers {
  const opt = (name: string) => (typeof options[name] === "string" ? (options[name] as string) : undefined);
  return {
    user: opt("user") ?? env.SETUPVIBE_USER ?? file.user,
    sshKey: opt("ssh-key") ?? env.SETUPVIBE_SSH_KEY ?? file.sshKey,
    gitName: opt("git-name") ?? env.SETUPVIBE_GIT_NAME ?? file.git?.name,
    gitEmail: opt("git-email") ?? env.SETUPVIBE_GIT_EMAIL ?? file.git?.email,
    profile: opt("profile") ?? env.SETUPVIBE_PROFILE ?? file.profile,
    only: csv(opt("only")) ?? csv(env.SETUPVIBE_ONLY) ?? file.only ?? [],
    exclude: csv(opt("exclude")) ?? csv(env.SETUPVIBE_EXCLUDE) ?? file.exclude ?? [],
    tailscaleAuthKey: opt("tailscale-authkey") ?? env.TAILSCALE_AUTHKEY,
    ghToken: env.GH_TOKEN,
    manager: flag(options.manager) ?? flag(env.SETUPVIBE_SWARM_MANAGER) ?? file.swarm?.manager ?? false,
    join: opt("join") ?? env.SETUPVIBE_SWARM_TOKEN,
    advertiseAddr: opt("advertise-addr") ?? env.SETUPVIBE_SWARM_ADVERTISE_ADDR ?? file.swarm?.advertiseAddr,
    timezone: opt("timezone") ?? env.SETUPVIBE_TIMEZONE ?? file.timezone,
    reboot: flag(options.reboot) ?? flag(env.SETUPVIBE_REBOOT) ?? file.reboot ?? false,
    keepNopasswd: flag(options["keep-nopasswd"]) ?? flag(env.SETUPVIBE_KEEP_NOPASSWD) ?? file.keepNopasswd ?? false,
  };
}

/**
 * Reads the answers file.
 *
 * @throws when the file is not valid JSON or carries a secret field
 */
export function readAnswersFile(path: string): AnswersFile {
  const data = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  for (const secret of ["tailscaleAuthKey", "ghToken", "token", "swarmToken"]) {
    if (secret in data) throw new Error(`${path} must not contain secrets (${secret}); pass them as environment variables.`);
  }
  return data as AnswersFile;
}

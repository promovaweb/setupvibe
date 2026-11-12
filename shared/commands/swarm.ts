/**
 * `swarm` commands of `setupvibe-server` (spec section 18).
 *
 * `swarm token` prints the join token of a manager, so another server can
 * run `setupvibe-server auto --join <token> --advertise-addr <manager>:2377`
 * without opening the Docker CLI. The token is printed on stdout alone, so
 * it can go straight into a variable; it is never written to the logs.
 */
import { manifest } from "../core/app/manifest.ts";
import { ExitCode } from "../core/app/exit-codes.ts";
import type { Command } from "../core/cli/registry.ts";
import { realRunner, type Cmd } from "../exec/runner.ts";

/** Command that prints the join token for a role. */
export function joinTokenCmd(role: "worker" | "manager", rotate = false): Cmd {
  return { argv: ["docker", "swarm", "join-token", ...(rotate ? ["--rotate"] : []), "-q", role], sudo: true };
}

const tokenCommand: Command = {
  name: "token",
  description: "Print the join token of this Swarm manager for workers or managers.",
  arguments: [{ name: "role", description: "worker (default) or manager.", values: ["worker", "manager"] }],
  options: [{ name: "--rotate", description: "Rotate the token first; the old one stops working." }],
  exitCodes: [ExitCode.CONFIG],
  examples: [
    `${manifest.bin} swarm token`,
    `${manifest.bin} swarm token manager`,
    `TOKEN=$(${manifest.bin} swarm token) && ssh worker ${manifest.bin} auto --join "$TOKEN" --advertise-addr 10.0.0.1:2377`,
    `${manifest.bin} swarm token worker --rotate`,
    `${manifest.bin} swarm token --json`,
  ],
  run: async (ctx) => {
    const role = (ctx.args[0] as string | undefined) === "manager" ? "manager" : "worker";
    const r = await realRunner().exec(joinTokenCmd(role, Boolean(ctx.options.rotate)));
    if (r.code !== 0) {
      return { code: ExitCode.CONFIG, data: { role, error: r.stderr.trim() }, text: `✗ This machine is not a Swarm manager: ${r.stderr.trim() || `exit ${r.code}`}` };
    }
    const token = r.stdout.trim();
    return { data: { role, token }, text: token };
  },
};

export const swarmCommand: Command = {
  name: "swarm",
  description: "Docker Swarm helpers for managers.",
  subcommands: [tokenCommand],
};

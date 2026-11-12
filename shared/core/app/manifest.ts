/**
 * Binary manifest.
 *
 * Single source of identity for the executable: command name, title,
 * version, description, author and links. Help text, the About tab, the MCP
 * server and the OpenCLI description all read from here.
 *
 * The name, title and description come from the registered edition
 * (`app/edition.ts`). Version, license and links come from the root
 * package.json, shared by both binaries. Bun embeds the JSON at build time,
 * so the manifest stays valid outside the repository.
 *
 * Both editions share the data directory `~/.setupvibe/` and the environment
 * prefix `SETUPVIBE_`, because only one of them can be installed on a machine.
 */
import pkg from "../../../package.json" with { type: "json" };
import { edition } from "./edition.ts";

/** Static identity of the executable. */
export interface Manifest {
  /** Executable name: `setupvibe` or `setupvibe-server`. */
  readonly bin: string;
  /** Edition id: `desktop` or `server`. */
  readonly edition: "desktop" | "server";
  /** Human-readable name for titles and headers. */
  readonly title: string;
  /** SemVer version from package.json. */
  readonly version: string;
  /** One-line description of what the binary does. */
  readonly description: string;
  /** Person or organization responsible. */
  readonly author: string;
  /** Website. */
  readonly site: string;
  /** Git repository URL. */
  readonly repository: string;
  /** License declared in package.json. */
  readonly license: string;
  /** Name of the data directory under the home folder, without the dot. */
  readonly dataName: string;
  /** Environment variable prefix shared by both editions. */
  readonly envPrefix: string;
}

interface SetupVibeBlock {
  author?: string;
  site?: string;
  repository?: string;
}

const block: SetupVibeBlock = (pkg as { setupvibe?: SetupVibeBlock }).setupvibe ?? {};
const current = edition();

export const manifest: Manifest = Object.freeze({
  bin: current.bin,
  edition: current.id,
  title: current.title,
  version: pkg.version,
  description: current.description,
  author: block.author ?? "",
  site: block.site ?? "",
  repository: block.repository ?? "",
  license: pkg.license ?? "UNLICENSED",
  dataName: "setupvibe",
  envPrefix: "SETUPVIBE",
});

/** Credits shown in the About tab and by the `about` command. */
export const credits: ReadonlyArray<{ name: string; role: string; url: string }> = Object.freeze([
  { name: "Termfy", role: "CLI, TUI and MCP framework", url: "https://github.com/promovaweb/termfy" },
  { name: "Bun", role: "runtime, bundler and binary compiler", url: "https://bun.sh" },
  { name: "mise", role: "runtime and tool manager", url: "https://mise.jdx.dev" },
  { name: "OpenTUI", role: "terminal user interface rendering", url: "https://opentui.com" },
  { name: "MCP TypeScript SDK", role: "Model Context Protocol server over stdio", url: "https://modelcontextprotocol.io" },
  { name: "OpenCLI", role: "standard description of the command-line interface", url: "https://opencli.org" },
  { name: "Zod", role: "schema validation for MCP tools", url: "https://zod.dev" },
]);

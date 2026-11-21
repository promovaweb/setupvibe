import pkg from "../../../package.json" with { type: "json" };
import { edition, type EditionId } from "./edition.ts";

/** Static identity of the executable. */
export interface Manifest {
  /** Canonical executable name. */
  readonly bin: string;
  readonly edition: EditionId;
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

export const manifest: Manifest = Object.freeze({
  bin: "setupvibe",
  get edition() { return edition().id; },
  get title() { return edition().title; },
  version: pkg.version,
  get description() { return edition().description; },
  author: block.author ?? "",
  site: block.site ?? "",
  repository: block.repository ?? "",
  license: pkg.license ?? "UNLICENSED",
  dataName: "setupvibe",
  envPrefix: "SETUPVIBE",
});

/** Invocation used in help and documentation for a command path. */
export function commandPrefix(path: readonly string[]): string {
  return path[0] === "edition" ? manifest.bin : `${manifest.bin} ${manifest.edition}`;
}

export function qualifyExample(example: string, path: readonly string[]): string {
  return example.replace(/(?<![\w/.-])setupvibe(?= |$)/g, commandPrefix(path));
}

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

/**
 * Compiles both SetupVibe 2 binaries with `bun build --compile`.
 *
 * Without arguments, produces `dist/setupvibe` and `dist/setupvibe-server`
 * for the current platform. With `--all`, produces one executable per
 * supported target: the desktop for Linux, macOS and Windows, the server for
 * Linux only. Names follow `dist/<bin>-<target>`, which is what the one-line
 * installer downloads.
 *
 * OpenTUI loads a native package per platform with dynamic imports. The
 * packages that are not installed are passed as `--external`, so each is
 * loaded only on its own platform. Cross builds need every package; install
 * them from the lockfile with
 * `bun install --frozen-lockfile --os="*" --cpu="*" --libc="*"`.
 *
 * Usage: bun run scripts/build.ts [--all] [--edition desktop|server]
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface Target {
  target: string;
  suffix: string;
  native: string;
}

const desktopTargets: Target[] = [
  { target: "bun-linux-x64", suffix: "linux-x64", native: "@opentui/core-linux-x64" },
  { target: "bun-linux-arm64", suffix: "linux-arm64", native: "@opentui/core-linux-arm64" },
  { target: "bun-darwin-x64", suffix: "darwin-x64", native: "@opentui/core-darwin-x64" },
  { target: "bun-darwin-arm64", suffix: "darwin-arm64", native: "@opentui/core-darwin-arm64" },
  { target: "bun-windows-x64", suffix: "windows-x64", native: "@opentui/core-win32-x64" },
];

const editions = {
  desktop: { bin: "setupvibe", entry: "desktop/src/main.ts", targets: desktopTargets },
  server: { bin: "setupvibe-server", entry: "server/src/main.ts", targets: desktopTargets.filter((t) => t.suffix.startsWith("linux")) },
} as const;

type EditionId = keyof typeof editions;

const installed = (name: string) => existsSync(join("node_modules", name, "package.json"));

/** Native OpenTUI packages declared by @opentui/core and absent from node_modules. */
function missingNativePackages(): string[] {
  const pkg = JSON.parse(readFileSync(join("node_modules", "@opentui", "core", "package.json"), "utf8")) as { optionalDependencies?: Record<string, string> };
  return Object.keys(pkg.optionalDependencies ?? {}).filter((name) => !installed(name));
}

async function compile(entry: string, outfile: string, externals: string[], target?: string): Promise<void> {
  const args = ["build", entry, "--compile", "--minify", `--outfile=${outfile}`, ...externals.map((name) => `--external=${name}`)];
  if (target) args.push(`--target=${target}`);
  const proc = Bun.spawn(["bun", ...args], { stdout: "inherit", stderr: "inherit" });
  const code = await proc.exited;
  if (code !== 0) throw new Error(`Failed to compile ${outfile} (exit code ${code}).`);
  console.log(`✓ ${outfile}`);
}

const all = process.argv.includes("--all");
const editionArg = process.argv[process.argv.indexOf("--edition") + 1];
const selected: EditionId[] = process.argv.includes("--edition") ? [editionArg as EditionId] : ["desktop", "server"];
for (const id of selected) {
  if (!(id in editions)) {
    console.error(`✗ Unknown edition: ${id}. Use desktop or server.`);
    process.exit(2);
  }
}

mkdirSync("dist", { recursive: true });
const externals = missingNativePackages();

if (all) {
  const needed = [...new Set(selected.flatMap((id) => editions[id].targets.map((t) => t.native)))];
  const absent = needed.filter((name) => !installed(name));
  if (absent.length) {
    console.error(`✗ Missing native packages for cross builds: ${absent.join(", ")}.`);
    console.error('  Install them from the lockfile: bun install --frozen-lockfile --os="*" --cpu="*" --libc="*"');
    process.exit(1);
  }
}

for (const id of selected) {
  const { bin, entry, targets } = editions[id];
  if (all) {
    for (const { target, suffix } of targets) {
      const ext = suffix.startsWith("windows") ? ".exe" : "";
      await compile(entry, `dist/${bin}-${suffix}${ext}`, externals, target);
    }
  } else {
    await compile(entry, `dist/${bin}`, externals);
  }
}

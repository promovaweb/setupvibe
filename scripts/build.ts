/**
 * Compile SetupVibe for this platform, or every target with --all.
 * Cross builds need the OpenTUI packages from a frozen install with
 * --os="*" --cpu="*" --libc="*".
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface Target {
  target: string;
  suffix: string;
  native: string;
}

const targets: Target[] = [
  { target: "bun-linux-x64", suffix: "linux-x64", native: "@opentui/core-linux-x64" },
  { target: "bun-linux-arm64", suffix: "linux-arm64", native: "@opentui/core-linux-arm64" },
  { target: "bun-darwin-x64", suffix: "darwin-x64", native: "@opentui/core-darwin-x64" },
  { target: "bun-darwin-arm64", suffix: "darwin-arm64", native: "@opentui/core-darwin-arm64" },
  { target: "bun-windows-x64", suffix: "windows-x64", native: "@opentui/core-win32-x64" },
];

const installed = (name: string) => existsSync(join("node_modules", name, "package.json"));

/** Native OpenTUI packages declared by @opentui/core and absent from node_modules. */
function missingNativePackages(): string[] {
  const pkg = JSON.parse(readFileSync(join("node_modules", "@opentui", "core", "package.json"), "utf8")) as { optionalDependencies?: Record<string, string> };
  return Object.keys(pkg.optionalDependencies ?? {}).filter((name) => !installed(name));
}

async function compile(outfile: string, externals: string[], target?: string): Promise<void> {
  const args = ["build", "main.ts", "--compile", "--minify", `--outfile=${outfile}`, ...externals.map((name) => `--external=${name}`)];
  if (target) args.push(`--target=${target}`);
  const proc = Bun.spawn(["bun", ...args], { stdout: "inherit", stderr: "inherit" });
  const code = await proc.exited;
  if (code !== 0) throw new Error(`Failed to compile ${outfile} (exit code ${code}).`);
  console.log(`✓ ${outfile}`);
}

const all = process.argv.includes("--all");
mkdirSync("dist", { recursive: true });
const externals = missingNativePackages();

if (all) {
  const needed = targets.map((target) => target.native);
  const absent = needed.filter((name) => !installed(name));
  if (absent.length) {
    console.error(`✗ Missing native packages for cross builds: ${absent.join(", ")}.`);
    console.error('  Install them from the lockfile: bun install --frozen-lockfile --os="*" --cpu="*" --libc="*"');
    process.exit(1);
  }
}

if (all) {
  for (const { target, suffix } of targets) {
    const outfile = `dist/setupvibe-${suffix}${suffix.startsWith("windows") ? ".exe" : ""}`;
    await compile(outfile, externals, target);
    if (suffix.startsWith("linux")) {
      // Old Server binaries still fetch this name during upgrade.
      copyFileSync(outfile, `dist/setupvibe-server-${suffix}`);
    }
  }
} else {
  await compile("dist/setupvibe", externals);
}

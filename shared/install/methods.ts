/**
 * Install methods.
 *
 * Turns an inventory item into the `Step`s that install it on one system,
 * following the install entry chosen by `resolveInstall` (spec sections 5 and
 * 6). Package managers run without questions; downloads are verified; Git
 * sources are checked out at the pinned commit.
 *
 * Methods that need a dedicated module (`config`, `compose`) return no steps
 * here; their modules build the steps instead.
 */
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { InstallEntry, Inventory, Item, Repository, System } from "../inventory.ts";
import { resolveInstall, withVersion } from "../inventory.ts";
import type { Cmd, Step } from "../exec/runner.ts";
import { findInChecksumList, verify } from "../state/checksum.ts";

const DEBIAN_FAMILY: System[] = ["ubuntu", "debian", "mint", "zorin", "wsl"];
const ARCH_FAMILY: System[] = ["arch", "omarchy"];

/** Expands `~/` inside an argument such as `--install-dir=~/.local/bin`. */
export function expandArg(arg: string, home = homedir()): string {
  return arg.replace(/(^|=)~\//, (_m, p: string) => `${p}${home}/`);
}

/** Expands `~/` to the home directory. */
export function expandHome(path: string, home = homedir()): string {
  return path.startsWith("~/") ? join(home, path.slice(2)) : path;
}

const list = (v: string | string[] | undefined): string[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/** Native package install command for a system. */
export function nativeInstallCmd(system: System, packages: string[]): Cmd[] {
  if (DEBIAN_FAMILY.includes(system)) {
    return [{ argv: ["apt-get", "install", "-y", "-o", "Dpkg::Options::=--force-confdef", "-o", "Dpkg::Options::=--force-confold", ...packages], sudo: true, retries: 3 }];
  }
  if (system === "omarchy") return [{ argv: ["omarchy", "pkg", "add", ...packages] }];
  if (system === "arch") return [{ argv: ["pacman", "-S", "--noconfirm", "--needed", ...packages], sudo: true, retries: 3 }];
  if (system === "macos") return [{ argv: ["brew", "install", ...packages], env: { HOMEBREW_NO_AUTO_UPDATE: "1" }, retries: 3 }];
  throw new Error(`No native package manager for ${system}.`);
}

/** Refreshes the package index once before native installs. */
export function nativeRefreshCmd(system: System): Cmd | undefined {
  if (DEBIAN_FAMILY.includes(system)) return { argv: ["apt-get", "update"], sudo: true, retries: 3 };
  if (system === "arch") return { argv: ["pacman", "-Sy", "--noconfirm"], sudo: true };
  return undefined;
}

/** Distro and codename placeholders used by repository URLs. */
export interface DistroInfo {
  distro: string;
  codename: string;
  ubuntuCodename?: string;
}

function fillRepo(text: string, info: DistroInfo): string {
  return text
    .replaceAll("{distro}", info.distro)
    .replaceAll("{codename}", info.codename)
    .replaceAll("{ubuntu_codename}", info.ubuntuCodename ?? info.codename);
}

/**
 * Steps that add an APT repository pinned to its key fingerprints.
 *
 * The key is downloaded, its fingerprints are compared with the inventory
 * and only then written to `/etc/apt/keyrings/<name>.gpg`.
 */
export function aptRepositorySteps(name: string, repo: Repository, info: DistroInfo): Step {
  const keyring = `/etc/apt/keyrings/setupvibe-${name}.gpg`;
  const tmpKey = `/tmp/setupvibe-${name}.key`;
  const source = `deb [signed-by=${keyring}] ${fillRepo(repo.url, info)} ${fillRepo(repo.suite, info)} ${repo.components.join(" ")}\n`;
  return {
    id: `repository:${name}`,
    description: `Add the ${name} APT repository (key ${repo.fingerprints.join(", ")})`,
    skipIf: { argv: ["test", "-s", keyring] },
    commands: [
      { argv: ["curl", "--proto", "=https", "--tlsv1.2", "-fsSL", "-o", tmpKey, fillRepo(repo.key, info)] },
      { argv: ["install", "-d", "-m", "0755", "/etc/apt/keyrings"], sudo: true },
    ],
    actionDescription: `verify ${tmpKey} against the pinned fingerprints, write ${keyring} and /etc/apt/sources.list.d/setupvibe-${name}.list`,
    action: async (runner) => {
      const show = await runner.exec({ argv: ["gpg", "--show-keys", "--with-colons", tmpKey] });
      const found = show.stdout
        .split("\n")
        .filter((l) => l.startsWith("fpr:"))
        .map((l) => l.split(":")[9]);
      const primary = found[0];
      if (!primary || !repo.fingerprints.includes(primary)) {
        throw new Error(`Key fingerprint ${primary ?? "missing"} for ${name} does not match ${repo.fingerprints.join(", ")}.`);
      }
      for (const cmd of [
        { argv: ["gpg", "--dearmor", "--yes", "-o", keyring, tmpKey], sudo: true },
        { argv: ["chmod", "0644", keyring], sudo: true },
        { argv: ["tee", `/etc/apt/sources.list.d/setupvibe-${name}.list`], sudo: true, input: source },
        { argv: ["apt-get", "update"], sudo: true },
      ] satisfies Cmd[]) {
        const r = await runner.exec(cmd);
        if (r.code !== 0) throw new Error(`${cmd.argv.join(" ")} failed: ${r.stderr.trim()}`);
      }
    },
  };
}

/** fetch with three extra attempts and a growing wait, for network failures and 5xx. */
export async function fetchWithRetries(url: string, timeoutMs: number, attempts = 4): Promise<Response> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await Bun.sleep(1000 * 2 ** i);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (response.ok) return response;
      if (response.status < 500) throw new Error(`Download failed for ${url}: HTTP ${response.status}`);
      last = new Error(`Download failed for ${url}: HTTP ${response.status}`);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Download failed") && !e.message.includes("HTTP 5")) throw e;
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error(`Download failed for ${url}`);
}

/** mise release asset name for the running platform. */
export function miseAsset(version: string, system: System, arch: string): string {
  if (system === "windows") return `mise-v${version}-windows-${arch}.exe`;
  const os = system === "macos" ? "macos" : "linux";
  return `mise-v${version}-${os}-${arch}`;
}

/**
 * Downloads a file, verifies it and writes it with the given mode.
 * Used by archive, installer and mise steps.
 */
async function downloadVerified(
  url: string,
  target: string,
  check: { sha256?: string; listUrl?: string; listName?: string; digestUrl?: string; algorithm?: "sha256" | "sha384" | "sha512" },
  mode = 0o644,
): Promise<Uint8Array> {
  const response = await fetchWithRetries(url, 120_000);
  const data = new Uint8Array(await response.arrayBuffer());
  let expected = check.sha256;
  if (!expected && check.listUrl) {
    const listResponse = await fetch(check.listUrl, { signal: AbortSignal.timeout(30_000) });
    if (!listResponse.ok) throw new Error(`Checksum list unavailable: ${check.listUrl}`);
    expected = findInChecksumList(await listResponse.text(), check.listName ?? "");
    if (!expected) throw new Error(`${check.listName} is not in ${check.listUrl}.`);
  }
  if (check.digestUrl) {
    const digestResponse = await fetch(check.digestUrl, { signal: AbortSignal.timeout(30_000) });
    if (!digestResponse.ok) throw new Error(`Checksum unavailable: ${check.digestUrl}`);
    expected = (await digestResponse.text()).trim().split(/\s+/)[0];
  }
  if (expected) verify(data, expected, check.algorithm ?? "sha256", url);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, data);
  chmodSync(target, mode);
  return data;
}

/** Steps for the `mise` item itself, installed by init. */
export function miseSteps(item: Item, system: System, arch: string, home = homedir()): Step[] {
  const entry = resolveInstall(item, system);
  if (!entry || entry.method === "preinstalled" || entry.method === "unsupported") return [];
  const asset = miseAsset(item.version, system, arch);
  const base = `https://github.com/jdx/mise/releases/download/v${item.version}`;
  const target = miseCmd(home, system);
  return [
    {
      id: "mise",
      description: `Install mise ${item.version} to ${target} (SHA-256 from the release)`,
      ...(system === "windows" ? {} : { skipIf: { argv: ["sh", "-c", `"${target}" --version 2>/dev/null | grep -q "^${item.version} "`] } }),
      commands: [],
      actionDescription: `download ${base}/${asset}, verify it with ${base}/SHASUMS256.txt and write ${target}`,
      action: async () => {
        await downloadVerified(`${base}/${asset}`, target, { listUrl: `${base}/SHASUMS256.txt`, listName: asset }, 0o755);
      },
    },
  ];
}

/** Path of the mise binary SetupVibe installs: ~/.local/bin/mise, with .exe on Windows. */
export function miseCmd(home: string, system: System | "auto" = "auto"): string {
  const windows = system === "windows" || (system === "auto" && process.platform === "win32");
  return join(home, ".local", "bin", windows ? "mise.exe" : "mise");
}

/** Folder of the mise shims: ~/.local/share/mise/shims, or %LOCALAPPDATA%\mise\shims on Windows. */
export function miseShims(home: string, windows = process.platform === "win32"): string {
  return windows ? join(process.env.LOCALAPPDATA ?? join(home, "AppData", "Local"), "mise", "shims") : join(home, ".local", "share", "mise", "shims");
}

/**
 * Steps that install one item on one system.
 *
 * @returns an empty list when the item is preinstalled, unsupported or
 *   handled by a dedicated module.
 */
export function itemSteps(item: Item, system: System, ctx: { arch: string; inventory: Inventory; distro?: DistroInfo; home?: string }): Step[] {
  const entry: InstallEntry | undefined = resolveInstall(item, system);
  const home = ctx.home ?? homedir();
  if (!entry) throw new Error(`${item.id} has no install entry for ${system}.`);
  const id = item.id;
  const v = item.version.replace(/^v/, "");
  switch (entry.method) {
    case "preinstalled":
    case "unsupported":
    case "config":
    case "compose":
      return [];
    case "native": {
      const steps: Step[] = [];
      if (entry.repository) {
        const repo = ctx.inventory.repositories[entry.repository];
        if (!repo) throw new Error(`${id} uses the unknown repository ${entry.repository}.`);
        if (!ctx.distro) throw new Error(`${id} needs distribution information for its repository.`);
        steps.push(aptRepositorySteps(entry.repository, repo, ctx.distro));
      }
      const packages = entry.packages ?? [];
      if (system === "macos" && packages.includes("xcode-command-line-tools")) {
        steps.push({
          id,
          description: "Install the Xcode Command Line Tools without the GUI dialog",
          skipIf: { argv: ["xcode-select", "-p"] },
          commands: [
            { argv: ["touch", "/tmp/.com.apple.dt.CommandLineTools.installondemand.in-progress"] },
            { argv: ["sh", "-c", "softwareupdate -l | sed -n 's/^\\* Label: \\(Command Line Tools.*\\)$/\\1/p' | tail -n1 | xargs -I{} softwareupdate -i '{}' --agree-to-license"], sudo: true },
          ],
        });
        return steps;
      }
      const conflicts = entry.conflicts ?? [];
      steps.push({
        id,
        description: `Install ${packages.join(", ")} with the system package manager`,
        commands: [
          ...(conflicts.length && DEBIAN_FAMILY.includes(system) ? [{ argv: ["apt-get", "remove", "-y", ...conflicts], sudo: true, optional: true } satisfies Cmd] : []),
          ...nativeInstallCmd(system, packages),
          ...(entry.optional?.length ? nativeInstallCmd(system, entry.optional).map((c) => ({ ...c, optional: true })) : []),
        ],
      });
      return steps;
    }
    case "brew": {
      const formulas = list(entry.formula);
      const argv = entry.cask ? ["brew", "install", "--cask", entry.cask] : ["brew", "install", ...formulas];
      return [{ id, description: `Install ${entry.cask ?? formulas.join(", ")} with Homebrew`, commands: [{ argv, env: { HOMEBREW_NO_AUTO_UPDATE: "1", NONINTERACTIVE: "1" }, retries: 3 }] }];
    }
    case "winget":
      return list(entry.id).map((pkg, i, all) => ({
        id: i === 0 ? id : `${id}:${pkg}`,
        description: `Install ${pkg} with WinGet`,
        // A tool installed outside WinGet (Git on CI runners) is not in
        // `winget list`; a single-package item is skipped when its own check
        // already passes.
        skipIf: all.length === 1 ? verifyCmd(item, home, true) : { argv: ["winget", "list", "--exact", "--id", pkg] },
        commands: [{ argv: ["winget", "install", "--exact", "--id", pkg, "--silent", "--accept-package-agreements", "--accept-source-agreements", "--disable-interactivity"] }],
      }));
    case "mise": {
      const tool = withVersion(entry.tool ?? id, item);
      const spec = tool.includes("@v") || /@[\w.]+$/.test(tool.split(":").pop() ?? "") ? tool : `${tool}@${v}`;
      return [{ id, description: `Install ${spec} with mise`, commands: [{ argv: [miseCmd(home, system), "use", "--global", "--yes", spec], retries: 3 }] }];
    }
    case "git": {
      const path = expandHome(entry.path ?? "", home);
      const steps: Step[] = [
        {
          id,
          description: `Check out ${entry.repo} at ${v.slice(0, 12)} into ${entry.path}`,
          commands: [
            { argv: ["sh", "-c", `test -d "${path}/.git" || git clone --quiet "${entry.repo}" "${path}"`], retries: 3 },
            { argv: ["git", "-C", path, "fetch", "--quiet", "origin", v], retries: 3 },
            { argv: ["git", "-C", path, "checkout", "--quiet", "--detach", v] },
          ],
        },
      ];
      for (const [repo, commit] of Object.entries(item.plugins ?? {})) {
        const pluginPath = join(dirname(path), repo.split("/")[1]!);
        steps.push({
          id: `${id}:${repo}`,
          description: `Check out tmux plugin ${repo} at ${commit.slice(0, 12)}`,
          commands: [
            { argv: ["sh", "-c", `test -d "${pluginPath}/.git" || git clone --quiet "https://github.com/${repo}" "${pluginPath}"`], retries: 3 },
            { argv: ["git", "-C", pluginPath, "fetch", "--quiet", "origin", commit], retries: 3 },
            { argv: ["git", "-C", pluginPath, "checkout", "--quiet", "--detach", commit] },
          ],
        });
      }
      return steps;
    }
    case "composer":
      return [{ id, description: `Install ${entry.package}:${v} with Composer`, commands: [{ argv: ["composer", "global", "require", "--no-interaction", `${entry.package}:${v}`] }] }];
    case "gem":
      return [{ id, description: `Install the ${entry.gem} gem ${v}`, commands: [{ argv: [miseCmd(home, system), "exec", "--", "gem", "install", entry.gem ?? id, "-v", v, "--no-document"] }] }];
    case "archive": {
      const target = expandHome(entry.path ?? "~/.local/share/setupvibe", home);
      return (entry.files ?? []).map((file, i) => {
        const url = withVersion(file.url, item);
        const name = url.split("/").pop() ?? `file-${i}`;
        const tmp = join(home, ".setupvibe", "tmp", name);
        return {
          id: i === 0 ? id : `${id}:${name}`,
          description: `Download ${name} (SHA-256 pinned) into ${entry.path}`,
          commands: [],
          actionDescription: `download ${url}, verify ${file.sha256.slice(0, 12)}… and extract into ${target}`,
          action: async (runner) => {
            await downloadVerified(url, tmp, { sha256: file.sha256 });
            const r = await runner.exec({ argv: ["unzip", "-o", "-q", tmp, "-d", target] });
            if (r.code !== 0) throw new Error(`unzip failed for ${name}: ${r.stderr.trim()}`);
          },
        } satisfies Step;
      });
    }
    case "installer": {
      const url = withVersion(entry.url ?? "", item);
      const args = (entry.args ?? []).map((a) => expandArg(withVersion(a, item), home));
      if (system === "windows") {
        // Inline `irm | iex` broke under process quoting, and Windows
        // PowerShell started from pwsh inherits pwsh's PSModulePath and loses
        // Get-FileHash. Download the script and run it with -File instead.
        const script = join(home, ".setupvibe", "tmp", `${id}-installer.ps1`);
        const shell = Bun.which("pwsh") ? "pwsh" : "powershell";
        return [
          {
            id,
            description: `Run the official installer ${url}`,
            commands: [],
            actionDescription: `download ${url} to ${script} and run it with ${shell} -File ${args.join(" ")}`.trimEnd(),
            action: async (runner) => {
              await downloadVerified(url, script, {});
              const r = await runner.exec({ argv: [shell, "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, ...args], unsetEnv: ["PSModulePath"] });
              if (r.code !== 0) throw new Error(`Installer for ${id} exited with ${r.code}: ${(r.stderr || r.stdout).trim().split("\n").slice(-3).join(" ")}`);
            },
          },
        ];
      }
      const tmp = join(home, ".setupvibe", "tmp", `${id}-installer`);
      const interpreter = entry.interpreter ?? "bash";
      const digestUrl = entry.checksum?.startsWith("https://") ? entry.checksum : undefined;
      return [
        {
          id,
          description: `Run the official installer ${url}${entry.checksum && entry.checksum !== "none-official" ? ` (checksum: ${entry.checksum})` : ""}`,
          commands: [],
          actionDescription: `download ${url} to ${tmp}${digestUrl ? `, verify it with ${digestUrl} (${entry.checksumAlgorithm ?? "sha256"})` : ""} and run it with ${interpreter} ${args.join(" ")}`.trimEnd(),
          action: async (runner) => {
            await downloadVerified(url, tmp, { digestUrl, algorithm: entry.checksumAlgorithm }, 0o755);
            const r = await runner.exec({ argv: [interpreter, tmp, ...args] });
            if (r.code !== 0) throw new Error(`Installer for ${id} exited with ${r.code}: ${r.stderr.trim().split("\n").pop()}`);
          },
        },
      ];
    }
  }
}

/** Command that checks an item, from `verify.command`, run through a shell. */
/**
 * PATH saved in the Windows registry (user, then machine). Installers such as
 * Codex's add their folder there, and the running process does not see it
 * until a new session starts.
 */
export function registryPath(): string {
  if (process.platform !== "win32") return "";
  const read = (key: string) => {
    const out = Bun.spawnSync(["reg", "query", key, "/v", "Path"], { stdout: "pipe", stderr: "ignore" }).stdout.toString();
    const match = out.match(/Path\s+REG_(?:EXPAND_)?SZ\s+(.+)/i);
    return (match?.[1] ?? "").trim().replace(/%([^%]+)%/g, (_m, name: string) => process.env[name] ?? `%${name}%`);
  };
  return [read("HKCU\\Environment"), read("HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment")].filter(Boolean).join(";");
}

export function verifyCmd(item: Item, home = homedir(), windows = process.platform === "win32"): Cmd {
  const sep = windows ? ";" : ":";
  const path = [join(home, ".local", "bin"), miseShims(home, windows), process.env.PATH ?? process.env.Path ?? "", ...(windows ? [registryPath()] : [])].filter(Boolean).join(sep);
  return windows ? { argv: ["cmd", "/d", "/s", "/c", item.verify.command], env: { PATH: path, Path: path } } : { argv: ["sh", "-c", item.verify.command], env: { PATH: path } };
}

/** True when an item's verify output satisfies `verify.expect`. */
export function verifyOutputMatches(item: Item, output: string): boolean {
  const expect = item.verify.expect;
  if (!expect) return true;
  if (expect.startsWith("^")) return new RegExp(expect, "m").test(output);
  if (expect.startsWith(">=")) {
    const found = output.match(/\d+(\.\d+)+/)?.[0];
    if (!found) return false;
    const want = expect.slice(2).split(".").map(Number);
    const have = found.split(".").map(Number);
    for (let i = 0; i < Math.max(want.length, have.length); i++) {
      const d = (have[i] ?? 0) - (want[i] ?? 0);
      if (d !== 0) return d > 0;
    }
    return true;
  }
  return output.includes(expect);
}

/** True when `system` uses APT or pacman. */
export function usesApt(system: System): boolean {
  return DEBIAN_FAMILY.includes(system);
}

export function usesPacman(system: System): boolean {
  return ARCH_FAMILY.includes(system);
}

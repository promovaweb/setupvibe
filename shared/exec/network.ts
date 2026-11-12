/**
 * Network settings shared by every command (spec section 17).
 *
 * - Proxy: HTTPS_PROXY, HTTP_PROXY and NO_PROXY are honored and copied to the
 *   lowercase names some tools read. They also reach commands run through
 *   sudo, which otherwise drops them (APT behind a proxy failed that way).
 * - Corporate CA: SETUPVIBE_CA_FILE points the tools at an extra certificate
 *   bundle (Node, Bun, curl, Git, Python, pip, APT through curl).
 * - Cache: SETUPVIBE_CACHE_DIR keeps mise, npm, uv and Homebrew downloads and
 *   SetupVibe's own verified downloads in one folder, shared across runs and
 *   machines; with a warm cache, pinned downloads work offline.
 */
import { readState } from "../state/store.ts";

const PROXY_KEYS = ["HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY", "ALL_PROXY"] as const;

/** Extra environment for the network settings found in `env`. */
export function networkEnv(env: Record<string, string | undefined> = process.env): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of PROXY_KEYS) {
    const value = env[key] ?? env[key.toLowerCase()];
    if (value) {
      out[key] = value;
      out[key.toLowerCase()] = value;
    }
  }
  const ca = env.SETUPVIBE_CA_FILE;
  if (ca) {
    for (const key of ["NODE_EXTRA_CA_CERTS", "SSL_CERT_FILE", "CURL_CA_BUNDLE", "REQUESTS_CA_BUNDLE", "GIT_SSL_CAINFO", "PIP_CERT"]) out[key] = ca;
  }
  const cache = env.SETUPVIBE_CACHE_DIR;
  if (cache) {
    const sep = cache.includes("\\") ? "\\" : "/";
    out.MISE_CACHE_DIR = `${cache}${sep}mise`;
    out.npm_config_cache = `${cache}${sep}npm`;
    out.UV_CACHE_DIR = `${cache}${sep}uv`;
    out.HOMEBREW_CACHE = `${cache}${sep}homebrew`;
  }
  return out;
}

/** Folder for SetupVibe's own verified downloads, when a cache is set. */
export function downloadCacheDir(env: Record<string, string | undefined> = process.env): string | undefined {
  return env.SETUPVIBE_CACHE_DIR ? `${env.SETUPVIBE_CACHE_DIR}/downloads` : undefined;
}

/**
 * Applies `--cache-dir` and `--ca-file` options to the process environment,
 * so every later command and download sees them.
 */
export function applyNetworkOptions(options: Record<string, string | boolean | undefined>, saved: NetworkSettings = savedNetworkSettings()): void {
  if (options.verbose === true) process.env.SETUPVIBE_VERBOSE = "1";
  // Option, then environment, then config.json `network`.
  const cache = typeof options["cache-dir"] === "string" ? options["cache-dir"] : process.env.SETUPVIBE_CACHE_DIR ?? saved.cacheDir;
  if (cache) process.env.SETUPVIBE_CACHE_DIR = cache;
  const ca = typeof options["ca-file"] === "string" ? options["ca-file"] : process.env.SETUPVIBE_CA_FILE ?? saved.caFile;
  if (ca) {
    process.env.SETUPVIBE_CA_FILE = ca;
    process.env.NODE_EXTRA_CA_CERTS = ca;
  }
}

/** `network` block of config.json, for machines that always sit behind the same proxy CA or cache. */
export interface NetworkSettings {
  caFile?: string;
  cacheDir?: string;
}

/** Reads config.json `network`; empty when the file is missing or invalid. */
export function savedNetworkSettings(): NetworkSettings {
  try {
    const n = readState<Record<string, unknown>>("config.json", {}).network as NetworkSettings | undefined;
    return { ...(typeof n?.caFile === "string" ? { caFile: n.caFile } : {}), ...(typeof n?.cacheDir === "string" ? { cacheDir: n.cacheDir } : {}) };
  } catch {
    return {};
  }
}

/** Options shared by the commands that download. */
export const NETWORK_OPTIONS = [
  { name: "--verbose", description: "Show the full output of every command as it runs. Env: SETUPVIBE_VERBOSE=1." },
  { name: "--cache-dir", argument: { name: "dir" }, description: "Reuse downloads from this folder across runs and machines. Env: SETUPVIBE_CACHE_DIR." },
  { name: "--ca-file", argument: { name: "file" }, description: "Extra CA bundle for corporate networks. Env: SETUPVIBE_CA_FILE." },
] as const;

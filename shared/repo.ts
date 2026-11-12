/**
 * Locations of SetupVibe files on GitHub.
 *
 * Every script and file that SetupVibe 2 downloads from its own repository
 * (version manifest, one-line installers, shell blocks, configuration
 * templates) comes from the `v2` branch while the new major is developed.
 * Nothing in the v2 code may point at `main`, which still serves the
 * SetupVibe 1 scripts.
 */

/** GitHub owner and repository. */
export const REPOSITORY = "promovaweb/setupvibe";

/** Branch that serves SetupVibe 2 files. */
export const BRANCH = "v2";

/** Base URL for raw files of the v2 branch. */
export const RAW_BASE = `https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}`;

/** Base URL for GitHub Releases downloads (binaries and checksums). */
export const RELEASES_BASE = `https://github.com/${REPOSITORY}/releases/download`;

/**
 * Raw URL of a file in the v2 branch.
 *
 * @param path path inside the repository, without a leading slash
 * @example rawUrl("version.json")
 *   // "https://raw.githubusercontent.com/promovaweb/setupvibe/v2/version.json"
 */
export function rawUrl(path: string): string {
  return `${RAW_BASE}/${path.replace(/^\/+/, "")}`;
}

/** Version manifest read by the update check (spec section 11). */
export const VERSION_MANIFEST_URL = rawUrl("version.json");

/** One-line installer for macOS and Linux (spec section 9). */
export const INSTALL_SH_URL = rawUrl("install.sh");

/** One-line installer for Windows (spec section 9). */
export const INSTALL_PS1_URL = rawUrl("install.ps1");

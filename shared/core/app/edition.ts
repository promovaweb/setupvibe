/**
 * Edition registry.
 *
 * SetupVibe 2 ships two binaries from one core: `setupvibe` (desktop) and
 * `setupvibe-server`. Each entry point imports its `edition.ts` first, which
 * calls `registerEdition()` before any core module is evaluated. The core
 * then reads the identity, the embedded documentation and the inventory of
 * the running binary from here.
 *
 * This module must not import anything from the core, so that registering
 * the edition never triggers the evaluation of modules that need it.
 */

/** Embedded Markdown documentation of one edition (see `docs/`). */
export interface EditionDocs {
  readonly overview: string;
  readonly cli: string;
  readonly tui: string;
  readonly mcp: string;
  readonly config: string;
  readonly exitCodes: string;
}

/** Languages of the embedded documentation (spec decision: Portuguese and English). */
export type DocsLanguage = "pt-BR" | "en";

export const DOCS_LANGUAGES: readonly DocsLanguage[] = ["pt-BR", "en"];

/**
 * Language of the embedded documentation: SETUPVIBE_LANG when set, otherwise
 * Portuguese for a pt* LANG and English for anything else.
 */
export function docsLanguage(env: Record<string, string | undefined> = process.env): DocsLanguage {
  const explicit = env.SETUPVIBE_LANG;
  if (explicit === "en" || explicit === "pt-BR") return explicit;
  const lang = env.LC_ALL || env.LC_MESSAGES || env.LANG || "";
  return /^pt/i.test(lang) ? "pt-BR" : "en";
}

/** Identity of one SetupVibe binary. */
export interface EditionDefinition {
  /** `desktop` or `server`. */
  readonly id: "desktop" | "server";
  /** Executable name: `setupvibe` or `setupvibe-server`. */
  readonly bin: string;
  /** Human-readable title. */
  readonly title: string;
  /** One-line description. */
  readonly description: string;
  /** Embedded documentation printed by `--skill`, per language. */
  readonly docs: Record<DocsLanguage, EditionDocs>;
  /** The edition inventory (desktop/inventory.json or server/inventory.json). */
  readonly inventory: unknown;
}

const key = Symbol.for("setupvibe.edition");
type Store = { [key]?: EditionDefinition };

/** Registers the running edition. Called once by the entry point. */
export function registerEdition(definition: EditionDefinition): void {
  (globalThis as Store)[key] = definition;
}

/**
 * The running edition.
 *
 * @throws when no edition was registered, which means a core module was
 *   imported before the entry point's `edition.ts`.
 */
export function edition(): EditionDefinition {
  const current = (globalThis as Store)[key];
  if (!current) {
    throw new Error("No SetupVibe edition registered. Import desktop/src/edition.ts or server/src/edition.ts before the core.");
  }
  return current;
}

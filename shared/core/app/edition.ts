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
  /** Embedded documentation printed by `--skill`. */
  readonly docs: EditionDocs;
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

import { AsyncLocalStorage } from "node:async_hooks";

export const EDITIONS = ["desktop", "server", "omarchy"] as const;
export type EditionId = (typeof EDITIONS)[number];

export function isEdition(value: unknown): value is EditionId {
  return EDITIONS.some((id) => id === value);
}

/** Embedded Markdown documentation of one edition (see `docs/`). */
export interface EditionDocs {
  readonly overview: string;
  readonly cli: string;
  readonly tui: string;
  readonly mcp: string;
  readonly config: string;
  readonly exitCodes: string;
  readonly troubleshooting: string;
  readonly migration: string;
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

/** Inventory, documentation and identity of an edition. */
export interface EditionDefinition {
  readonly id: EditionId;
  /** Human-readable title. */
  readonly title: string;
  /** One-line description. */
  readonly description: string;
  /** Embedded documentation printed by `--skill`, per language. */
  readonly docs: Record<DocsLanguage, EditionDocs>;
  /** Inventory embedded from the edition’s inventory.json. */
  readonly inventory: unknown;
}

const definitions = new Map<EditionId, EditionDefinition>();
const requestEdition = new AsyncLocalStorage<EditionId>();
let active: EditionId = "desktop";

/** Registers an embedded edition without changing the active one. */
export function registerEdition(definition: EditionDefinition): void {
  definitions.set(definition.id, definition);
}

export function selectEdition(id: EditionId): void {
  active = id;
}

export function withEdition<T>(id: EditionId, run: () => T): T {
  return requestEdition.run(id, run);
}

export function edition(id = requestEdition.getStore() ?? active): EditionDefinition {
  const definition = definitions.get(id);
  if (!definition) throw new Error(`SetupVibe edition "${id}" was not registered.`);
  return definition;
}

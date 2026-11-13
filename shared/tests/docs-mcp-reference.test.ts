/**
 * MCP manual coverage.
 *
 * Both editions publish the same MCP catalog through `mcp --list --json`. The
 * manual in `desktop/docs/mcp.md`, `desktop/docs/en/mcp.md`,
 * `server/docs/mcp.md` and `server/docs/en/mcp.md` must describe every tool,
 * resource and prompt with purpose, input, output, effects, refusals and five
 * examples, and may not describe an item the binary does not expose.
 *
 * The catalog is read from the edition entry point in a subprocess because
 * only one edition can be registered per process.
 */
import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repo = join(import.meta.dir, "..", "..");
const home = mkdtempSync(join(tmpdir(), "sv-docs-mcp-"));

afterAll(() => {
  rmSync(home, { recursive: true, force: true });
});

interface Catalog {
  tools: Array<{ name: string }>;
  resources: Array<{ uri: string }>;
  prompts: Array<{ name: string }>;
}

interface EditionCase {
  id: string;
  bin: string;
  entry: string;
  docs: { language: "pt-BR" | "en"; file: string; labels: string[] }[];
}

const ptLabels = ["Finalidade", "Entrada", "Saída", "Efeitos e permissões", "Recusas e limites", "Exemplos"];
const enLabels = ["Purpose", "Input", "Output", "Effects and permissions", "Refusals and limits", "Examples"];

const editions: EditionCase[] = [
  {
    id: "desktop",
    bin: "setupvibe",
    entry: "desktop/src/main.ts",
    docs: [
      { language: "pt-BR", file: "desktop/docs/mcp.md", labels: ptLabels },
      { language: "en", file: "desktop/docs/en/mcp.md", labels: enLabels },
    ],
  },
  {
    id: "server",
    bin: "setupvibe-server",
    entry: "server/src/main.ts",
    docs: [
      { language: "pt-BR", file: "server/docs/mcp.md", labels: ptLabels },
      { language: "en", file: "server/docs/en/mcp.md", labels: enLabels },
    ],
  },
];

const catalogs = new Map<string, Catalog>();

/** Runs the edition entry point with `mcp --list --json` and returns the catalog. */
function catalogOf(edition: EditionCase): Catalog {
  const cached = catalogs.get(edition.id);
  if (cached) return cached;
  const result = Bun.spawnSync([process.execPath, join(repo, edition.entry), "mcp", "--list", "--json"], {
    cwd: repo,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, SETUPVIBE_HOME: home, NO_COLOR: "1" },
  });
  if (result.exitCode !== 0) throw new Error(`${edition.entry} mcp --list failed: ${result.stderr.toString()}`);
  const data = JSON.parse(result.stdout.toString()).data as Catalog;
  catalogs.set(edition.id, data);
  return data;
}

/** Sections of the manual, keyed by their heading. */
function sections(markdown: string): Map<string, string> {
  const out = new Map<string, string>();
  const lines = markdown.split("\n");
  let heading: string | undefined;
  let body: string[] = [];
  const flush = () => {
    if (heading) out.set(heading, body.join("\n"));
  };
  for (const line of lines) {
    if (line.startsWith("### ")) {
      flush();
      heading = line.slice(4).trim();
      body = [];
      continue;
    }
    if (heading) body.push(line);
  }
  flush();
  return out;
}

/** Five example bullets after the example label. */
function examples(body: string, label: string): string[] {
  const lines = body.split("\n");
  const start = lines.findIndex((line) => line.trim() === `**${label}.**`);
  if (start < 0) return [];
  const found: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("**") || line.startsWith("### ")) break;
    if (line.startsWith("- ")) found.push(line.trim());
  }
  return found;
}

for (const edition of editions) {
  for (const doc of edition.docs) {
    test(`${edition.id} mcp.md documents every tool, resource and prompt (${doc.language})`, () => {
      const catalog = catalogOf(edition);
      const markdown = readFileSync(join(repo, doc.file), "utf8").replaceAll("{{bin}}", edition.bin);
      const found = sections(markdown);

      const expected = [
        ...catalog.tools.map((t) => `Tool \`${t.name}\``),
        ...catalog.resources.map((r) => `Resource \`${r.uri}\``),
        ...catalog.prompts.map((p) => `Prompt \`${p.name}\``),
      ];

      const missing = expected.filter((heading) => !found.has(heading));
      const extra = [...found.keys()].filter((heading) => /^(Tool|Resource|Prompt) `/.test(heading) && !expected.includes(heading));
      const incomplete: string[] = [];
      const short: string[] = [];
      const repeated: string[] = [];

      for (const heading of expected) {
        const body = found.get(heading);
        if (body === undefined) continue;
        const absent = doc.labels.filter((label) => !body.split("\n").some((line) => line.trim().startsWith(`**${label}.**`)));
        if (absent.length) {
          incomplete.push(`${heading} (${absent.join(", ")})`);
          continue;
        }
        const blocks = examples(body, doc.labels[doc.labels.length - 1]!);
        if (blocks.length < 5) short.push(`${heading} (${blocks.length})`);
        else if (new Set(blocks).size < 5) repeated.push(heading);
      }

      expect({ missing }).toEqual({ missing: [] });
      expect({ extra }).toEqual({ extra: [] });
      expect({ incomplete }).toEqual({ incomplete: [] });
      expect({ short }).toEqual({ short: [] });
      expect({ repeated }).toEqual({ repeated: [] });
    });
  }
}

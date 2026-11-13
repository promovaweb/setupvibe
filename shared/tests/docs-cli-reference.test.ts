/**
 * CLI manual coverage.
 *
 * Both editions publish the same command registry to `--opencli`, and the
 * embedded manual in `desktop/docs/cli.md` and `server/docs/cli.md` must
 * describe every public command. This test walks the public tree of each
 * edition and requires, in the Portuguese and in the English manual, one
 * `###` section per command and per subcommand with at least five distinct
 * example blocks, plus the full `--skill` topic list.
 *
 * The edition is read from the entry point in a subprocess because only one
 * edition can be registered per process, and `root` is built from the
 * registered edition. A command added without documentation fails here.
 */
import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repo = join(import.meta.dir, "..", "..");
const home = mkdtempSync(join(tmpdir(), "sv-docs-cli-"));
const trees = new Map<string, PublicTree>();

afterAll(() => {
  rmSync(home, { recursive: true, force: true });
});

interface OpenCliOption {
  name: string;
  arguments?: Array<{ acceptedValues?: string[] }>;
}

interface OpenCliCommand {
  name: string;
  options?: OpenCliOption[];
  commands?: OpenCliCommand[];
}

interface PublicTree {
  commands: OpenCliCommand[];
  topics: string[];
}

interface EditionCase {
  id: string;
  bin: string;
  entry: string;
  docs: { language: "pt-BR" | "en"; file: string; examples: string; labels: string[] }[];
}

const ptLabels = ["Sintaxe", "Argumentos e options", "Saída", "Efeitos persistentes", "Permissões", "Recusas e exit codes", "Limites"];
const enLabels = ["Syntax", "Arguments and options", "Output", "Persistent effects", "Permissions", "Refusals and exit codes", "Limits"];

const editions: EditionCase[] = [
  {
    id: "desktop",
    bin: "setupvibe",
    entry: "desktop/src/main.ts",
    docs: [
      { language: "pt-BR", file: "desktop/docs/cli.md", examples: "#### Exemplos", labels: ptLabels },
      { language: "en", file: "desktop/docs/en/cli.md", examples: "#### Examples", labels: enLabels },
    ],
  },
  {
    id: "server",
    bin: "setupvibe-server",
    entry: "server/src/main.ts",
    docs: [
      { language: "pt-BR", file: "server/docs/cli.md", examples: "#### Exemplos", labels: ptLabels },
      { language: "en", file: "server/docs/en/cli.md", examples: "#### Examples", labels: enLabels },
    ],
  },
];

/** Runs the edition entry point with `--opencli` and returns the public tree. */
function publicTree(edition: EditionCase): PublicTree {
  const result = Bun.spawnSync([process.execPath, join(repo, edition.entry), "--opencli"], {
    cwd: repo,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, SETUPVIBE_HOME: home, NO_COLOR: "1" },
  });
  if (result.exitCode !== 0) {
    throw new Error(`${edition.entry} --opencli failed: ${result.stderr.toString()}`);
  }
  const document = JSON.parse(result.stdout.toString()) as { command: OpenCliCommand };
  const skill = document.command.options?.find((option) => option.name === "--skill");
  return { commands: collect(document.command, []), topics: skill?.arguments?.[0]?.acceptedValues ?? [] };
}

/** Cached public tree of one edition. */
function treeFor(edition: EditionCase): PublicTree {
  let tree = trees.get(edition.id);
  if (!tree) {
    tree = publicTree(edition);
    trees.set(edition.id, tree);
  }
  return tree;
}

/** Full command paths below the root, such as `config set`. */
function collect(command: OpenCliCommand, path: string[]): OpenCliCommand[] {
  const here = path.length ? [{ ...command, name: path.join(" ") }] : [];
  return [...here, ...(command.commands ?? []).flatMap((child) => collect(child, [...path, child.name]))];
}

/** Content of one `###` section, or undefined when the heading is absent. */
function section(markdown: string, bin: string, path: string): string | undefined {
  const lines = markdown.split("\n");
  const heading = `### \`${bin} ${path}\``;
  const start = lines.findIndex((line) => line.replaceAll("{{bin}}", bin).trim() === heading);
  if (start < 0) return undefined;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^### /.test(line));
  return (end < 0 ? rest : rest.slice(0, end)).join("\n").replaceAll("{{bin}}", bin);
}

/** Example blocks below the example heading. */
function examples(body: string, heading: string): string[] {
  const lines = body.split("\n");
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start < 0) return [];
  const blocks: string[] = [];
  let buffer: string[] | undefined;
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("```")) {
      if (buffer) {
        blocks.push(buffer.join("\n").trim());
        buffer = undefined;
      } else {
        buffer = [];
      }
      continue;
    }
    buffer?.push(line);
  }
  return blocks;
}

for (const edition of editions) {
  for (const doc of edition.docs) {
    test(`${edition.id} cli.md documents every public command (${doc.language})`, () => {
      const { commands } = treeFor(edition);
      const markdown = readFileSync(join(repo, doc.file), "utf8");
      const missing: string[] = [];
      const incomplete: string[] = [];
      const short: string[] = [];
      const repeated: string[] = [];

      for (const command of commands) {
        const body = section(markdown, edition.bin, command.name);
        if (!body) {
          missing.push(command.name);
          continue;
        }
        const absent = doc.labels.filter((label) => !body.split("\n").some((line) => line.trim() === `#### ${label}`));
        if (absent.length) {
          incomplete.push(`${command.name} (${absent.join(", ")})`);
          continue;
        }
        const blocks = examples(body, doc.examples).filter((block) => block.includes(edition.bin));
        if (blocks.length < 5) short.push(`${command.name} (${blocks.length})`);
        else if (new Set(blocks).size < 5) repeated.push(command.name);
      }

      expect(missing).toEqual([]);
      expect(incomplete).toEqual([]);
      expect(short).toEqual([]);
      expect(repeated).toEqual([]);
    });

    test(`${edition.id} cli.md lists every --skill topic (${doc.language})`, () => {
      const { topics } = treeFor(edition);
      const markdown = readFileSync(join(repo, doc.file), "utf8");
      const list = topics.map((topic) => `\`${topic}\``).join(", ");
      expect(topics.length).toBeGreaterThan(0);
      expect(markdown).toContain(`Topics: ${list}`);
      const docs = section(markdown, edition.bin, "docs");
      expect(docs).toBeDefined();
      if (!docs) return;
      expect(docs).toContain(list);
    });
  }
}

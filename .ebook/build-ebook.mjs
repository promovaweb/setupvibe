/**
 * Gera e confere o guia do usuário do SetupVibe em PDF e EPUB.
 *
 * Fonte: `docs/user/`, na ordem de `docs/user/reading-order.txt`. Os quatro
 * apêndices são gerados da documentação embutida em `desktop/docs/`, com
 * `{{bin}}` trocado por `setupvibe`.
 * Saída: `ebook/SetupVibe-Guia-v<versão>.{pdf,epub}` e o manifesto
 * `ebook/build.json`.
 * A versão vem de `package.json` e `ebook/VERSION` repete o mesmo valor; o
 * build falha quando os dois divergem. Roda com `bun run .ebook/build-ebook.mjs`.
 * `--check` só confere versão, hashes, XML, links internos, seções e fontes.
 * Requer Pandoc, WeasyPrint, ImageMagick, xmllint, poppler-utils e unzip.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { posix } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, "..");
const DOCS_ROOT = join(ROOT, "docs", "user");
const EBOOK_ROOT = join(ROOT, "ebook");
const BUILD_ROOT = join(SCRIPT_DIR, "build");
const ORDER_FILE = join(DOCS_ROOT, "reading-order.txt");
const VERSION_FILE = join(EBOOK_ROOT, "VERSION");
const PACKAGE_FILE = join(ROOT, "package.json");
const MANIFEST = join(EBOOK_ROOT, "build.json");
const PDF_STYLE = join(SCRIPT_DIR, "pdf.css");
const EPUB_STYLE = join(SCRIPT_DIR, "epub.css");
const TEMPLATE = join(SCRIPT_DIR, "template.html");
const METADATA = join(SCRIPT_DIR, "metadata.yaml");
const LOGO = join(SCRIPT_DIR, "assets", "logo.png");
const COVER_HTML = join(SCRIPT_DIR, "cover.html");
const COVER_CSS = join(SCRIPT_DIR, "cover.css");
const SCRIPT = fileURLToPath(import.meta.url);
const DESIGN_SYSTEM = "1.0.0";
const FONT_FILES = [
  join(ROOT, "brand", "fonts", "inter-latin.woff2"),
  join(ROOT, "brand", "fonts", "manrope-latin.woff2"),
];

/** Documentação embutida que vira apêndice, na ordem do livro. */
const APPENDIX_SOURCES = [
  { file: "cli.md", title: "Apêndice A. CLI" },
  { file: "configuration.md", title: "Apêndice B. Configuração e estado" },
  { file: "exit-codes.md", title: "Apêndice C. Códigos de saída" },
  { file: "mcp.md", title: "Apêndice D. MCP" },
];

function fail(message) { throw new Error(message); }
function rel(path) { return relative(ROOT, path).split("\\").join("/"); }
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: options.cwd ?? ROOT, encoding: "utf8", input: options.input, maxBuffer: 64 * 1024 * 1024 });
  if (result.error) fail(`${command} não pôde ser executado: ${result.error.message}`);
  if (result.status !== 0) fail(`${command} falhou: ${(result.stderr || result.stdout).trim()}`);
  return result.stdout || "";
}
async function sha256(path) { return createHash("sha256").update(await readFile(path)).digest("hex"); }
async function filesIn(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesIn(path));
    else if (entry.isFile()) result.push(path);
  }
  return result.sort();
}
function semver(value) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?$/.test(value)) fail(`versão inválida: ${value}`);
  return value;
}
async function version() {
  const pkg = JSON.parse(await readFile(PACKAGE_FILE, "utf8"));
  const packageVersion = semver(String(pkg.version));
  const fileVersion = semver((await readFile(VERSION_FILE, "utf8")).trim());
  if (packageVersion !== fileVersion) fail(`ebook/VERSION (${fileVersion}) difere de package.json (${packageVersion}).`);
  return packageVersion;
}
async function pages() {
  const ordered = (await readFile(ORDER_FILE, "utf8")).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!ordered.length) fail("docs/user/reading-order.txt está vazio.");
  const seen = new Set();
  const paths = [];
  for (const value of ordered) {
    if (!/^docs\/user\/.*\.md$/.test(value) || seen.has(value)) fail(`entrada inválida na ordem de leitura: ${value}`);
    await readFile(join(ROOT, value));
    seen.add(value);
    paths.push(join(ROOT, value));
  }
  for (const path of (await filesIn(DOCS_ROOT)).filter((item) => item.endsWith(".md"))) {
    if (!seen.has(rel(path))) fail(`página fora da ordem de leitura: ${rel(path)}`);
  }
  return paths;
}
async function sourceHash(paths) {
  const records = [];
  for (const path of paths) records.push(`${rel(path)}\0${await sha256(path)}\n`);
  return createHash("sha256").update(records.join(""), "utf8").digest("hex");
}
function outputs(value) {
  const stem = `SetupVibe-Guia-v${value}`;
  return { stem, pdf: join(EBOOK_ROOT, `${stem}.pdf`), epub: join(EBOOK_ROOT, `${stem}.epub`) };
}
function appendixPage(name, body) { return `# ${name}\n\n${body.trim()}\n`; }

/**
 * Texto de uma página pronto para o Pandoc: troca `{{bin}}`, remove links
 * relativos (o livro é um documento só) e mantém o resto intacto.
 */
function prepare(text) {
  return text
    .replace(/\{\{bin\}\}/g, "setupvibe")
    .replace(/\{\{BIN\}\}/g, "SETUPVIBE")
    .replace(/(?<!!)\[([^\]]+)\]\((?!https?:|mailto:|tel:|#)[^)]+\)/g, "$1")
    .replace(/em exit-codes\.md/g, "no Apêndice C")
    .replace(/em cli\.md/g, "no Apêndice A")
    .replace(/em configuration\.md/g, "no Apêndice B")
    .replace(/em mcp\.md/g, "no Apêndice D")
    .replace(/em troubleshooting\.md/g, "na documentação de problemas, no repositório")
    .replace(/em migration\.md/g, "na documentação de migração, no repositório");
}

async function preparedPages(paths) {
  const directory = join(BUILD_ROOT, "pages");
  await mkdir(directory, { recursive: true });
  const inputs = [];
  const assets = join(DOCS_ROOT, "assets");
  const htmlAssets = join(BUILD_ROOT, "assets");
  await mkdir(htmlAssets, { recursive: true });
  for (const path of existsSync(assets) ? await filesIn(assets) : []) {
    await copyFile(path, join(htmlAssets, path.split(/[\\/]/).pop()));
  }
  for (const path of paths) {
    const name = path.split(/[\\/]/).pop();
    await writeFile(join(directory, name), prepare(await readFile(path, "utf8")));
    inputs.push(name);
  }
  const intro = [
    "# Referência",
    "",
    "Os quatro apêndices a seguir vêm da documentação embutida no binário, mantida",
    "no repositório em `desktop/docs/`. Eles completam os capítulos com a lista",
    "exata de options, arquivos de estado, exit codes e tools do servidor MCP.",
    "",
    "| Apêndice | Assunto |",
    "| --- | --- |",
    "| A | commands, options globais e a referência gerada do registry |",
    "| B | `settings.json`, arquivos de estado, cofre e variáveis de ambiente |",
    "| C | a tabela de exit codes e o tratamento por classe |",
    "| D | tools, resources, prompts e configuração nos clientes |",
    "",
  ].join("\n");
  let index = 0;
  for (const appendix of APPENDIX_SOURCES) {
    const source = join(ROOT, "desktop", "docs", appendix.file);
    const text = prepare(await readFile(source, "utf8"));
    const body = text.replace(/^#\s+.*\n/, "");
    const name = `${String(90 + index).padStart(2, "0")}-${appendix.file}`;
    await writeFile(join(directory, name), index === 0 ? `${intro}\n# ${appendix.title}\n\n${body.trim()}\n` : appendixPage(appendix.title, body));
    inputs.push(name);
    index += 1;
  }
  return { directory, inputs };
}

function zipEntries(epub) {
  return run("unzip", ["-Z1", epub]).split(/\r?\n/).filter(Boolean);
}
function isExternal(target) { return /^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith("//"); }
function epubLinkFailures(epub) {
  const names = new Set(zipEntries(epub));
  const documents = new Map();
  for (const name of [...names].filter((entry) => /\.x?html$/.test(entry))) {
    const text = run("unzip", ["-p", epub, name]);
    documents.set(name, { text, ids: new Set([...text.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1])) });
  }
  const failures = [];
  for (const [name, document] of documents) {
    for (const match of document.text.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
      const target = decodeURIComponent(match[1]);
      if (isExternal(target) || target.startsWith("data:")) continue;
      const [pathPart, fragment = ""] = target.split("#");
      const resolved = pathPart ? posix.normalize(posix.join(posix.dirname(name), pathPart)) : name;
      if (!names.has(resolved)) { failures.push(`${name} -> ${target}`); continue; }
      if (fragment && documents.has(resolved) && !documents.get(resolved).ids.has(fragment)) failures.push(`${name} -> #${fragment}`);
    }
  }
  return failures;
}
function pdfLinkFailures(pdf) {
  const xml = run("pdftohtml", ["-xml", "-hidden", "-i", pdf, "-stdout"]);
  const pages = new Set([...xml.matchAll(/<page\b[^>]*\bnumber=["']([^"']+)["']/gi)].map((match) => match[1]));
  const failures = [];
  for (const match of xml.matchAll(/\bhref=["']([^"']+)["']/gi)) {
    const target = match[1];
    if (isExternal(target)) continue;
    const fragment = target.includes("#") ? target.slice(target.indexOf("#") + 1) : "";
    if (fragment && !pages.has(fragment)) failures.push(target);
  }
  return failures;
}
function datePtBr() {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
}
async function check(value, sources) {
  const paths = outputs(value);
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  if (manifest.version !== value || manifest.source_sha256 !== await sourceHash(sources)) fail("ebook/build.json está desatualizado; execute bun run ebook.");
  if (manifest.design_system !== DESIGN_SYSTEM) fail(`ebook/build.json não declara o design system ${DESIGN_SYSTEM}.`);
  for (const [kind, path] of [["pdf", paths.pdf], ["epub", paths.epub]]) {
    await readFile(path);
    if (manifest.artifacts[kind].sha256 !== await sha256(path)) fail(`hash de ${kind} diverge do manifesto.`);
  }
  run("unzip", ["-tqq", paths.epub]);
  for (const entry of zipEntries(paths.epub).filter((name) => /\.(xhtml|opf|ncx|xml)$/.test(name))) {
    const xml = run("unzip", ["-p", paths.epub, entry]);
    run("xmllint", [entry.endsWith(".xhtml") ? "--html" : "--noout", ...(entry.endsWith(".xhtml") ? ["--noout"] : []), "-"], { input: xml });
  }
  const linkFailures = [...pdfLinkFailures(paths.pdf), ...epubLinkFailures(paths.epub)];
  if (linkFailures.length) fail(`links internos inválidos:\n${linkFailures.join("\n")}`);
  const text = run("pdftotext", [paths.pdf, "-"]);
  for (const title of ["SetupVibe", "Visão geral", "Instalação e primeiro uso", "Instalação automática", "Itens e versões fixadas", "A TUI", "Shell e terminal", "Manutenção", "Servidor e segurança", "Agentes de IA e MCP", "Windows e WSL", "Vindo do SetupVibe 1", "Problemas comuns e glossário", "Apêndice A. CLI", "Apêndice D. MCP"]) {
    if (!text.includes(title)) fail(`PDF não contém a seção: ${title}`);
  }
  const fonts = run("pdffonts", [paths.pdf]);
  for (const font of ["Inter", "Manrope"]) if (!fonts.includes(font)) fail(`PDF não incorporou a fonte ${font}.`);
  console.log(`OK: ebook v${value} sincronizado com docs/user/ e desktop/docs/.`);
}
async function build(value, sources, pagePaths) {
  await mkdir(BUILD_ROOT, { recursive: true });
  await mkdir(EBOOK_ROOT, { recursive: true });
  const prepared = await preparedPages(pagePaths);
  const paths = outputs(value);
  const html = join(BUILD_ROOT, `${paths.stem}.html`);
  const cover = join(BUILD_ROOT, `${paths.stem}-cover.png`);
  const coverHtml = join(BUILD_ROOT, "cover.html");
  const coverPdf = join(BUILD_ROOT, "cover.pdf");
  const coverCss = join(SCRIPT_DIR, "cover.css");
  const coverTemplate = join(SCRIPT_DIR, "cover.html");
  await writeFile(coverHtml, (await readFile(coverTemplate, "utf8")).replace(/__VERSION__/g, value));
  run("weasyprint", [coverHtml, coverPdf, "--base-url", SCRIPT_DIR, "--stylesheet", PDF_STYLE, "--stylesheet", coverCss]);
  run("pdftoppm", ["-png", "-r", "254", "-singlefile", coverPdf, cover.replace(/\.png$/, "")]);
  const common = ["--from=markdown", "--standalone", "--file-scope", "--toc", "--toc-depth=2", "--no-highlight", `--metadata-file=${METADATA}`, "--metadata", `version=${value}`];
  run("pandoc", [...prepared.inputs, "--to=html5", ...common, `--template=${TEMPLATE}`, "--metadata", `date=${datePtBr()}`, "--output", html], { cwd: prepared.directory });
  run("weasyprint", [html, paths.pdf, "--base-url", SCRIPT_DIR, "--stylesheet", PDF_STYLE]);
  run("pandoc", [...prepared.inputs, "--to=epub3", ...common, `--css=${EPUB_STYLE}`, `--epub-cover-image=${cover}`, ...FONT_FILES.flatMap((font) => [`--epub-embed-font=${font}`]), "--output", paths.epub], { cwd: prepared.directory });
  const manifest = {
    schema_version: 1,
    version: value,
    edition: `v${value}`,
    design_system: DESIGN_SYSTEM,
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    source_sha256: await sourceHash(sources),
    sources: sources.map(rel).sort(),
    artifacts: {
      pdf: { file: paths.pdf.split(/[\\/]/).pop(), sha256: await sha256(paths.pdf) },
      epub: { file: paths.epub.split(/[\\/]/).pop(), sha256: await sha256(paths.epub) },
    },
  };
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  await check(value, sources);
}
async function main() {
  const onlyCheck = process.argv[2] === "--check";
  if (process.argv.length > (onlyCheck ? 3 : 2)) fail("uso: bun run .ebook/build-ebook.mjs [--check]");
  const value = await version();
  const pagePaths = await pages();
  const appendixFiles = APPENDIX_SOURCES.map((appendix) => join(ROOT, "desktop", "docs", appendix.file));
  const sources = [...await filesIn(DOCS_ROOT), ...appendixFiles, VERSION_FILE, PACKAGE_FILE, PDF_STYLE, EPUB_STYLE, TEMPLATE, METADATA, LOGO, COVER_HTML, COVER_CSS, SCRIPT].sort();
  if (onlyCheck) await check(value, sources);
  else await build(value, sources, pagePaths);
}

main().catch((error) => { console.error(`Erro: ${error.message}`); process.exitCode = 1; });

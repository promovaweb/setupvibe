# MARKDOWN.md — SetupVibe Markdown Standards

> Fonte única de verdade para formatação e linting de arquivos `.md` no projeto SetupVibe.

All `.md` files in this repository **must** conform to the rules defined here. The `/markdown-format` skill enforces these rules on every file created or modified.

---

## Tooling

This project uses [markdownlint](https://github.com/DavidAnson/markdownlint) as the linting engine. Install it via:

```bash
# CLI (Node.js)
npm install -g markdownlint-cli

# Run against all Markdown files
markdownlint "**/*.md" --ignore node_modules
```

The canonical configuration lives in `.markdownlint.json` at the project root. Every rule below maps directly to a markdownlint rule ID.

---

## Configuration — `.markdownlint.json`

```json
{
  "default": true,
  "MD001": true,
  "MD003": { "style": "atx" },
  "MD004": { "style": "dash" },
  "MD009": true,
  "MD010": true,
  "MD012": { "maximum": 1 },
  "MD013": false,
  "MD022": true,
  "MD023": true,
  "MD024": false,
  "MD025": true,
  "MD031": true,
  "MD032": true,
  "MD033": true,
  "MD034": true,
  "MD040": true,
  "MD041": false,
  "MD047": true,
  "MD049": { "style": "asterisk" },
  "MD050": { "style": "asterisk" }
}
```

---

## Rules

### MD001 — Heading Levels Increment by One

Heading levels must only increment by one at a time. Never skip from H1 to H3.

**Wrong:**

```markdown
# Title

### Section
```

**Correct:**

```markdown
# Title

## Section

### Subsection
```

---

### MD003 — ATX Heading Style

Use the ATX style (`#` prefix) for all headings. Do not use setext-style underlines.

**Wrong:**

```markdown
Title
=====

Section
-------
```

**Correct:**

```markdown
# Title

## Section
```

---

### MD004 — Unordered List Style: Dash

Use hyphens `-` as list markers for all unordered lists. Do not use `*` or `+`.

**Wrong:**

```markdown
* Item one
+ Item two
```

**Correct:**

```markdown
- Item one
- Item two
```

---

### MD009 — No Trailing Spaces

Lines must not end with trailing whitespace. Remove all trailing spaces before committing.

---

### MD010 — No Hard Tabs

Use spaces, never tab characters, for indentation in Markdown files.

---

### MD012 — No Multiple Consecutive Blank Lines

At most one consecutive blank line is allowed anywhere in the file.

**Wrong:**

```markdown
Paragraph one.


Paragraph two.
```

**Correct:**

```markdown
Paragraph one.

Paragraph two.
```

---

### MD013 — Line Length (Disabled)

Line length is **not enforced** in this project. Write lines at whatever length aids readability.

---

### MD022 — Blank Lines Around Headings

Every heading must have exactly one blank line before it and one blank line after it.

**Wrong:**

```markdown
## Section One
Content here.
## Section Two
```

**Correct:**

```markdown
## Section One

Content here.

## Section Two
```

---

### MD023 — Headings Must Start at the Left Margin

Headings must not be indented. They must begin at column 1.

**Wrong:**

```markdown
  ## Indented Heading
```

**Correct:**

```markdown
## Heading at Left Margin
```

---

### MD025 — Single Top-Level Heading (H1)

Each file must have exactly one H1 heading. Do not repeat H1.

---

### MD031 — Blank Lines Around Fenced Code Blocks

Fenced code blocks must be surrounded by one blank line before and after.

**Wrong:**

````markdown
Some text.
```bash
echo hello
```

More text.
````

**Correct:**

````markdown
Some text.

```bash
echo hello
```

More text.
````

---

### MD032 — Blank Lines Around Lists

Lists must be surrounded by one blank line before and after.

**Wrong:**

```markdown
Intro text.
- Item one
- Item two
Following text.
```

**Correct:**

```markdown
Intro text.

- Item one
- Item two

Following text.
```

---

### MD033 — No Inline HTML

Do not use HTML tags inside Markdown. Use native Markdown equivalents instead.

| Instead of | Use |
| --- | --- |
| `<br>` | Two trailing spaces or blank line |
| `<b>text</b>` | `**text**` |
| `<i>text</i>` | `*text*` |
| `<code>text</code>` | `` `text` `` |
| `<hr>` | `---` |

---

### MD034 — No Bare URLs

Wrap all URLs in link syntax. Bare URLs are forbidden.

**Wrong:**

```markdown
See https://example.com for details.
```

**Correct:**

```markdown
See [example.com](https://example.com) for details.
```

---

### MD040 — Fenced Code Blocks Must Specify a Language

Every fenced code block must include a language identifier for syntax highlighting.

**Wrong:**

````markdown
```
apt-get install curl
```
````

**Correct:**

````markdown
```bash
apt-get install curl
```
````

**Common language identifiers used in this project:**

| Language | Identifier |
| --- | --- |
| Shell / Bash | `bash` |
| Zsh | `zsh` |
| JavaScript | `js` |
| JSON | `json` |
| Markdown | `markdown` |
| Plain text / output | `text` |

---

### MD047 — Files Must End with a Single Newline

Every Markdown file must end with exactly one newline character. Do not leave the file with no trailing newline or with multiple trailing blank lines.

---

### MD049 / MD050 — Emphasis and Strong Style: Asterisk

Use `*text*` for emphasis and `**text**` for strong. Do not use underscores.

**Wrong:**

```markdown
_italic_ and __bold__
```

**Correct:**

```markdown
*italic* and **bold**
```

---

## Tables

Tables must follow these formatting requirements:

1. Always include a header row and a separator row.
2. The separator row must use `---` (at least three dashes) in each column.
3. Align columns with pipes `|` for readability in raw format.
4. No trailing spaces inside cells.

**Correct example:**

```markdown
| Tool | Purpose | Platform |
| --- | --- | --- |
| Docker | Container runtime | Linux, macOS |
| Homebrew | Package manager | macOS, Linux |
```

---

## Relative Links

When linking between documentation files, use relative paths. Verify that the target file exists relative to the source file's location.

**Example** — from `docs/desktop/pt-br/README.md` linking to a config file:

```markdown
[tmux config](../../../conf/tmux-desktop.conf)
```

---

## File Header Convention

Documentation files in `docs/` should begin with an H1 and a blockquote describing the content and version:

```markdown
# Guide Title

> Short description — v0.41.8
```

---

## Enforcement

The `/markdown-format` skill is the automated enforcer of all rules defined here. It must be invoked at the end of every task that creates or modifies `.md` files.

Any CI pipeline or pre-commit hook running `markdownlint` against this project uses `.markdownlint.json` as the configuration source, which corresponds directly to the rules in this document.

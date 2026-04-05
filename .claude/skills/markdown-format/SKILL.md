---
name: markdown-format
description: Enforce and apply SetupVibe Markdown formatting standards when creating or editing any .md file in the repository.
metadata:
  short-description: Format project Markdown files
---

# Markdown Format

Apply the SetupVibe Markdown rules to every `.md` file you create or edit.

## Source of Truth

All formatting rules, markdownlint rule IDs, configuration values, and examples are defined in [`MARKDOWN.md`](../../../MARKDOWN.md) at the project root. **Read that file before applying rules.** Do not derive rules from CLAUDE.md or any other file — `MARKDOWN.md` is authoritative.

The markdownlint configuration is in [`.markdownlint.json`](../../../.markdownlint.json).

## How to Apply

For each `.md` file modified or created:

1. Read [`MARKDOWN.md`](../../../MARKDOWN.md) to confirm the current rule set.
2. Verify the file against every rule (heading hierarchy, table format, code block languages, link syntax, list markers, blank lines, no inline HTML, trailing newline).
3. Fix all violations. Never remove content — format only.
4. Confirm the file ends with a single newline (MD047).

## Linting with markdownlint CLI

Run this to check all files at once:

```bash
markdownlint "**/*.md" --ignore node_modules
```

Or a single file:

```bash
markdownlint docs/desktop/en/README.md
```

## Common Targets

- `README.md`
- `CLAUDE.md`
- `GEMINI.md`
- `MARKDOWN.md`
- `CHANGELOG.md`
- `docs/desktop/en/README.md`
- `docs/desktop/en/tmux.md`
- `docs/desktop/en/pm2.md`
- `docs/server/en/README.md`

## Invocation

Use `/markdown-format` whenever a task creates or edits Markdown in this repository.

---

## Regra Obrigatória — Markdown

**Ao criar ou modificar qualquer arquivo `.md`, você DEVE invocar a skill `/markdown-format` antes de concluir a tarefa. As regras estão em [`MARKDOWN.md`](../../../MARKDOWN.md). Esta regra é inegociável e se aplica a qualquer skill, independente do seu escopo.**

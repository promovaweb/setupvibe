---
name: markdown-format
description: Enforce and apply SetupVibe Markdown formatting standards when creating or editing any .md file in the repository.
metadata:
  short-description: Format project Markdown files
---

# Markdown Format

Apply the SetupVibe Markdown rules to every `.md` file you create or edit. This skill acts as the project's **Linter and Formatter**.

## Source of Truth

All formatting rules, markdownlint rule IDs, configuration values, and examples are defined in [`MARKDOWN.md`](../../../MARKDOWN.md) at the project root. **Read that file before applying rules.** Do not derive rules from GEMINI.md or any other file — `MARKDOWN.md` is authoritative.

The markdownlint configuration is in [`.markdownlint.json`](../../../.markdownlint.json).

## How to Apply (Formatter)

For each `.md` file modified or created:

1. Read [`MARKDOWN.md`](../../../MARKDOWN.md) to confirm the current rule set.
2. **Surgical Alignment:** Fix pipe alignment in tables for readability in raw format.
3. **Spacing Fix:** Ensure exactly one blank line between blocks. Remove trailing spaces.
4. **Language Detection:** If a code block lacks a language, detect it from context (`bash`, `zsh`, `js`, `json`, etc.).
5. **Standardization:** Convert non-standard list markers (`*` or `+`) to `-`.
6. Confirm the file ends with a single newline (MD047).

## Linting with markdownlint CLI

Run this to check all files at once:

```bash
markdownlint "**/*.md" --ignore node_modules
```

Or a single file:

```bash
markdownlint docs/desktop/en/README.md
```

## Invocation

This skill is the automated enforcer of the rules in `MARKDOWN.md`. It must be called at the end of every task that modifies Markdown files to ensure compliance.

---

## Regra Obrigatória — Markdown

**Ao criar ou modificar qualquer arquivo `.md`, você DEVE invocar a skill `/markdown-format` antes de concluir a tarefa. As regras estão em [`MARKDOWN.md`](../../../MARKDOWN.md). Esta regra é inegociável e se aplica a qualquer skill, independente do seu escopo.**

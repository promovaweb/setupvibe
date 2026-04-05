---
name: markdown-format
description: Enforce and apply SetupVibe Markdown formatting standards when creating or editing any .md file in the repository.
metadata:
  short-description: Format project Markdown files
---

# Markdown Format

Apply the SetupVibe Markdown rules to every `.md` file you create or edit.

## Mandatory Rules

Every Markdown file in this project must follow these rules:

1. **Headings** — use hierarchical `#` (H1 → H2 → H3), never skip levels.
2. **Tables** — columns aligned with pipes `|`, always include a separator row `|---|---|`.
3. **Code blocks** — always specify the language (` ```bash `, ` ```js `, etc.).
4. **Links** — use `[text](url)` format, never bare URLs.
5. **Lists** — hyphens `-` for unordered items; numbers for ordered lists.
6. **Blank lines** — one blank line before and after headings, code blocks, and tables.
7. **No inline HTML** — do not use `<br>`, `<b>`, `<i>` or other tags inside Markdown.
8. **Footer link** — every `.md` file must end with this footer:

```markdown
---
> Apply Markdown standards using the `/markdown-format` skill.
```

## How to Apply

For each `.md` file modified or created:

1. Verify all rules above are respected.
2. Fix spacing, table alignment, and code blocks missing a language specifier.
3. Add the footer link if absent.
4. Never remove content; format only.

## Common Targets

- `README.md`
- `CLAUDE.md`
- `GEMINI.md`
- `AGENTS.md`
- `docs/desktop/en/README.md`
- `docs/desktop/en/tmux.md`
- `docs/desktop/en/pm2.md`
- `docs/server/en/README.md`

## Invocation

Use `markdown-format` when a task creates or edits Markdown in this repository.

---
> Apply Markdown standards using the `/markdown-format` skill.

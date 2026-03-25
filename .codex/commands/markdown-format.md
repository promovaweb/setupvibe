# Command: markdown-format

Apply Markdown formatting rules to all `.md` files in the SetupVibe project.

## Mandatory Rules

Every Markdown file in this project must follow these rules:

1. **Headings** — use hierarchical `#` (H1 → H2 → H3), never skip levels.
2. **Tables** — columns aligned with pipes `|`, always include a separator row `|---|---|`.
3. **Code blocks** — always specify the language (` ```bash `, ` ```js `, etc.).
4. **Links** — use `[text](url)` format, never bare URLs.
5. **Lists** — hyphens `-` for unordered items; numbers for ordered lists.
6. **Blank lines** — one blank line before and after headings, code blocks, and tables.
7. **No inline HTML** — do not use `<br>`, `<b>`, `<i>` or other tags inside Markdown.
8. **Footer link** — every `.md` file must end with a formatting reference footer:

```markdown
---
> Follow the formatting guide: [Markdown Format Guide](.claude/commands/markdown-format.md)
```

## How to Apply

For each `.md` file modified or created:

1. Verify all rules above are respected.
2. Fix spacing, table alignment, and code blocks missing a language specifier.
3. Add the footer link if absent.
4. Never remove content — format only.

## Project Markdown Files

- `README.md`
- `CLAUDE.md`
- `GEMINI.md`
- `AGENTS.md`
- `docs/README.md`
- `docs/desktop/en/README.md`
- `docs/desktop/en/tmux.md`
- `docs/desktop/en/pm2.md`
- `docs/server/en/README.md`

## Invocation

Use `/markdown-format` in Codex CLI to verify and apply these rules across all Markdown files in the project.

---
> Follow the formatting guide: [Markdown Format Guide](.claude/commands/markdown-format.md)

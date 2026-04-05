---
name: markdown-format
description: Enforce and apply SetupVibe Markdown formatting standards when creating or editing any .md file in the repository.
metadata:
  short-description: Format project Markdown files
---

# Markdown Format

Apply the SetupVibe Markdown rules to every `.md` file you create or edit. This skill acts as the project's **Linter and Formatter**.

## Mandatory Rules (Linter)

Every Markdown file in this project **MUST** strictly adhere to these rules. Any deviation is considered a build failure:

1. **Headings** — use hierarchical `#` (H1 → H2 → H3). **Never skip levels** (e.g., H1 to H3).
2. **Tables** — columns MUST be aligned with pipes `|`. Always include a separator row `|---|---|`.
3. **Code blocks** — always specify the language for syntax highlighting (e.g., ` ```bash `, ` ```js `).
4. **Links** — use `[text](url)` format. **Bare URLs are forbidden**.
5. **Lists** — use hyphens `-` for unordered items and numbers `1.` for ordered lists.
6. **Blank lines** — exactly **one blank line** before and after headings, code blocks, tables, and lists.
7. **No inline HTML** — do not use `<br>`, `<b>`, `<i>`, or any other HTML tags. Use Markdown equivalents.
8. **Footer link** — every `.md` file MUST end exactly with this footer:

```markdown
---
> Apply Markdown standards using the `/markdown-format` skill.
```

## How to Apply (Formatter)

When formatting a file:

1. **Surgical Alignment:** Fix pipe alignment in tables to ensure they are readable in raw format.
2. **Spacing Fix:** Ensure exactly one empty line between blocks. Remove trailing spaces.
3. **Language Detection:** If a code block lacks a language, detect it based on context (bash, zsh, js, json, etc.).
4. **Footer Insertion:** Append the mandatory footer if it's missing or incorrect.
5. **Standardization:** Convert any non-standard list markers (like `*` or `+`) to `-`.

## Invocation

This skill is the **source of truth** for formatting. It must be called at the end of every task that modifies Markdown files to ensure compliance.

---
> Apply Markdown standards using the `/markdown-format` skill.

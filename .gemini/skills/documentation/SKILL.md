---
name: documentation
description: Automates the creation, translation, and versioning of project documentation (SetupVibe). Use when adding new guides, updating versions across all .md files, or ensuring multi-language (EN, PT-BR, ES, FR) consistency in the docs/ directory.
---

# Documentation Workflow

This skill automates the standard documentation process for SetupVibe.

## 1. Documentation Creation

When creating a new tool guide (e.g., `SPECKIT.md`):

- **Location:** Always start in `docs/desktop/en/` or `docs/server/en/`.
- **Header:** Every file MUST start with an H1 and a version tag.
  ```markdown
  # Tool Name Guide

  > Tooling guide — vX.Y.Z
  ```
- **Footer:** Every file MUST end with the standard footer.
  ```markdown
  ---
  > Follow the formatting guide: [Markdown Format Guide](.claude/commands/markdown-format.md)
  ```

## 2. Multi-language Translation

After creating the English version, automatically generate translations for:
- **Portuguese (PT-BR):** `docs/**/pt-br/`
- **Spanish (ES):** `docs/**/es/`
- **French (FR):** `docs/**/fr/`

Maintain the same structure and header style, translating the content but keeping technical commands and aliases intact.

## 3. Link Integration

When a new guide is added, update the corresponding `README.md` files in ALL language folders:
- Add a row to the "Tool/Guide" table.
- Ensure the relative link is correct (e.g., `[SPECKIT.md](SPECKIT.md)`).

## 4. Version Management

When a version bump is requested:
1. Update `VERSION="..."` in `desktop.sh` and `server.sh`.
2. Update version tags in `README.md`, `GEMINI.md`, `CLAUDE.md`.
3. Update version tags in ALL `.md` files in `docs/` (including all subdirectories and languages).
4. Create a new entry in `CHANGELOG.md` following the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

## 5. Verification

- Use `grep_search` to find any remaining old version strings.
- Verify that all relative links in `docs/` point to existing files.
- Ensure consistent header formatting (H1 + blockquote version).

---
> Follow the formatting guide: [Markdown Format Guide](.claude/commands/markdown-format.md)

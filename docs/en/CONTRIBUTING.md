# Contributing Guide (EN)

Welcome to the **SetupVibe** contribution guide! We are excited to have you here. This document outlines the standards and workflows required to contribute to this project.

## 🚀 Getting Started

1. **Fork** the repository.
2. **Clone** your fork locally.
3. **Create a branch** for your feature or fix (e.g., `feat/new-tool` or `fix/broken-link`).
4. **Implement** your changes following the standards below.
5. **Submit a Pull Request** with a clear description of your changes.

---

## 🛠 Coding Standards (Bash)

SetupVibe relies on two main scripts: `desktop.sh` and `server.sh`. All shell scripting must adhere to these patterns:

### 1. Smart Privilege Elevation

Never use `sudo` directly inside functions unless necessary for specific reasons. Instead, use our helper functions:

- **`user_do`**: Executes a command as the real user (even if the script was started with `sudo`). Use this for installing tools in `$HOME`, configuring Git, or managing user dotfiles.
- **`sys_do`**: Executes a command with elevated privileges. Use this for system package management (`apt`), modifying `/etc`, or managing system services.

### 2. Modular Architecture

Scripts are organized into modular functions named `step_N`. If you add a new feature:

1. Add the title to the `STEPS` array.
2. Create a corresponding `step_N` function.
3. Ensure the logic handles both **macOS (`$IS_MACOS`)** and **Linux (`$IS_LINUX`)** where applicable.

### 3. Idempotency

Scripts must be safe to run multiple times. Always check if a tool is already installed or a configuration already exists before applying changes.

### 4. Keyring Management (Linux)

Do not use `apt-key` (deprecated). Always store APT GPG keys in `/etc/apt/keyrings/` using the `install_key` or `sys_do` helpers.

---

## 📝 Documentation Standards (Markdown)

All `.md` files must follow these rules strictly:

1. **Hierarchy**: Use hierarchical headings (H1 → H2 → H3). Never skip levels.
2. **Tables**: Align columns with pipes `|` and include a separator row `|---|`.
3. **Code Blocks**: Always specify the language (e.g., ` ```bash `).
4. **Links**: Use `[text](url)` format. No bare URLs.
5. **Lists**: Use hyphens `-` for unordered lists.
6. **Spacing**: One blank line before and after headings, code blocks, and tables.
7. **No HTML**: Avoid `<br>`, `<b>`, `<i>` or other HTML tags.

---

## 🔢 Versioning Process

When updating the version (e.g., from `0.41.7` to `0.42.0`), you **must** update the version string in all of the following locations:

- `desktop.sh` (the `VERSION` variable)
- `server.sh` (the `VERSION` variable)
- `CHANGELOG.md` (add a new entry)
- `README.md` (root project overview)
- `GEMINI.md` (project overview)
- `CLAUDE.md` (project overview)
- All `README.md` files in `docs/` and its subdirectories.

---

## 🤖 Automation & Skills

This project uses **Agent Skills** (located in `.gemini/skills` and `.claude/skills`) to automate tasks.

- If you are an AI agent, you **must** activate relevant skills (e.g., `markdown-format`, `make-changelog`) before performing tasks.
- If you are a human, be aware that these skills enforce the standards mentioned above.

---

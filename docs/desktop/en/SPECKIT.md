# Spec-Kit Guide

> Tooling guide — v0.41.6

SetupVibe installs [Spec-Kit](https://github.com/github/spec-kit) on the Desktop edition (macOS and Linux desktop) via `uv tool install specify-cli`.

- **Command:** `specify`
- **Package:** `specify-cli` (PyPI)
- **Requires:** Python 3.11+, `uv`, Git, and an AI coding agent

---

## What is Spec-Kit?

Spec-Kit is an **open-source toolkit for Spec-Driven Development (SDD)** — a methodology that inverts the traditional approach to software development by making specifications executable before any code is written.

Instead of jumping straight into code ("vibe coding"), SDD guides you through three phases:

| Phase | Command | Purpose |
|---|---|---|
| **Specify** | `/speckit.specify` | Define *what* to build and *why* |
| **Plan** | `/speckit.plan` | Define *how* to build it (architecture, tech stack) |
| **Tasks** | `/speckit.tasks` | Break the plan into actionable implementation chunks |

---

## Getting Started

```bash
# Verify all dependencies are installed
spcheck

# Initialize a new project in a new folder
spinit my-project

# Initialize in the current directory with Claude
spci

# Initialize in the current directory with Gemini
spgi

# Initialize in the current directory with Copilot
spkpi
```

---

## Installation and Update

```bash
# Install Spec-Kit manually (if needed)
uv tool install specify-cli

# Update to the latest version
spup
```

---

## CLI Reference

### `specify init`

Bootstraps a project for Spec-Driven Development.

```bash
specify init <PROJECT_NAME> [options]
```

| Option | Description |
|---|---|
| `--ai <agent>` | AI agent to use: `claude`, `copilot`, `gemini`, `codebuddy`, `pi` |
| `--script <type>` | Script type: `sh` (Bash) or `ps` (PowerShell) |
| `--here` | Initialize in the current directory instead of a new folder |
| `--offline` | Use bundled assets without fetching from the network |
| `--ignore-agent-tools` | Skip AI agent tool validation |

### `specify check`

Verifies that all required dependencies (Python, uv, Git, AI agent) are installed and accessible.

```bash
specify check
```

---

## SetupVibe Aliases

These aliases are available after running SetupVibe Desktop on macOS or Linux.

| Alias | Command | Description |
|---|---|---|
| `sp` | `specify` | Atalho para o comando principal |
| `spinit` | `specify init` | Inicializa SDD em novo diretório |
| `spcheck` | `specify check` | Verifica dependências instaladas |
| `sphere` | `specify init --here` | Inicializa SDD no diretório atual |
| `spci` | `specify init --here --ai claude` | Inicia projeto SDD com Claude Code |
| `spgi` | `specify init --here --ai gemini` | Inicia projeto SDD com Gemini CLI |
| `spkpi` | `specify init --here --ai copilot` | Inicia projeto SDD com GitHub Copilot |
| `spup` | `uv tool upgrade specify-cli` | Atualiza o Spec-Kit |

---

## Typical Workflow

### 1. Bootstrap the project

```bash
mkdir my-app && cd my-app
spci
```

This creates the Spec-Kit structure with Claude Code as the AI agent.

### 2. Write the specification

Open your AI agent and run the `/speckit.specify` command. Answer the prompts to define:

- What problem are you solving?
- Who are the users?
- What are the core scenarios and expected outcomes?

### 3. Create the technical plan

Run `/speckit.plan` in your AI agent to produce:

- Architecture decisions
- Technology stack choices
- Integration points and constraints

### 4. Break into tasks

Run `/speckit.tasks` to generate a numbered, ordered list of implementation tasks from the plan.

### 5. Implement

Use `/speckit.implement` or work task by task with your AI agent, referencing the specification and plan at each step.

---

## Supported AI Agents

| Agent | Flag | Notes |
|---|---|---|
| Claude Code | `--ai claude` | Default recommendation for SetupVibe users |
| GitHub Copilot | `--ai copilot` | Requires Copilot subscription |
| Gemini CLI | `--ai gemini` | Free tier available |
| CodeBuddy | `--ai codebuddy` | Tencent Cloud AI assistant |
| Pi | `--ai pi` | Inflection AI assistant |

---

## Tips

- Run `spcheck` before starting any project to confirm your environment is ready.
- Use `--offline` in air-gapped environments or when network is unreliable.
- The `--here` flag (aliased as `sphere`) is useful when the project folder already exists.
- Commit the generated spec files alongside your code — they serve as living documentation.
- Run `spup` periodically to stay on the latest version of Spec-Kit.

---


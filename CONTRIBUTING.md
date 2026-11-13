# Contributing to SetupVibe

This guide is for anyone who changes the installers, the documentation or the skills of [SetupVibe](https://github.com/promovaweb/setupvibe). To install and use the product, start with the [README](README.md).

The project is made of Bash scripts (`desktop.sh`, `server.sh`, `omarchy.sh`), a PowerShell installer (`desktop.ps1`), configuration files in `conf/` and Markdown documentation. There is no build step and no package manager: the code runs directly.

Full contribution guides in other languages:

| Language | Guide |
| --- | --- |
| English | [English Contribution Guide](docs/en/CONTRIBUTING.md) |
| Portuguese | [Guia de Contribuição em Português](docs/pt-br/CONTRIBUTING.md) |
| Spanish | [Guía de Contribución en Español](docs/es/CONTRIBUTING.md) |
| French | [Guide de Contribution en Français](docs/fr/CONTRIBUTING.md) |

## Before you start

- **Talk on [Discord](https://promovaweb.com/discord)** before a large pull request. Architecture changes, new editions and behavior changes deserve a conversation before the code. The Community talks in Portuguese.
- **Open one [issue](https://github.com/promovaweb/setupvibe/issues) per change.** Describe the problem, the operating system and the SetupVibe version. One issue per subject keeps review and history simple.
- Read [DEBIAN.md](DEBIAN.md) completely before changing `desktop.sh`, `server.sh`, Linux files in `conf/` or Linux documentation. It records the privilege model, the differences between editions and the container test recipe.
- Read [AGENTS.md](AGENTS.md) or [CLAUDE.md](CLAUDE.md) when you work with a coding agent. These files hold the versioning rules and the skill synchronization rules.

## Environment

Requirements for working on the Unix scripts:

- Bash, `git` and `curl`.
- `shellcheck` for static analysis.
- Node.js and npm for `markdownlint`.
- Docker for the container tests described in [DEBIAN.md](DEBIAN.md).

Fork the repository, clone your fork and run from the checkout:

```bash
git clone https://github.com/<your-user>/setupvibe.git
cd setupvibe
bash desktop.sh
```

The Desktop installer is interactive and needs a terminal. The Server installer accepts a non-interactive run:

```bash
sudo bash server.sh --yes
```

`omarchy.sh` only runs on an existing Omarchy 4 system. To check the options of the editions that have a command line:

```bash
bash server.sh --help
bash omarchy.sh --help
```

Test on a disposable machine or in a container. The scripts install system packages and change files in the real user's `$HOME`.

## Code layout

```text
.
├── desktop.sh          # Desktop installer: macOS, Linux and WSL (14 steps)
├── desktop.ps1         # native Windows 11 installer (Beta)
├── server.sh           # Linux server installer (9 steps)
├── omarchy.sh          # SetupVibe layer on top of Omarchy 4
├── bin/                # helpers copied to ~/.setupvibe/bin
├── conf/               # zshrc, tmux, PM2 and Portainer files
├── utils/windows/      # Windows PowerShell helpers
├── docs/               # guides per edition and per language
├── brand/              # logos, tokens, fonts and brand voice
├── .codex/skills/      # Codex skills
├── .claude/skills/     # Claude skills
└── .github/workflows/  # daily SetupVibe 2 health workflow
```

Each installer follows a sequence of `step_N` functions. The `STEPS` array defines the titles in the same order they run through `run_section`.

## Workflow

1. Open or find the issue for the change.
1. Create a branch from `main` with a `feat/`, `fix/`, `docs/` or `chore/` prefix, for example `feat/new-tool` or `fix/broken-link`.
1. Change the script, the `conf/` file or the documentation, following the rules below.
1. Validate with the commands in **Validate**.
1. Open the pull request with the related issue and the validation results.

To add a feature to an installer:

1. Add the title to the `STEPS` array.
1. Create the matching `step_N` function.
1. Handle both macOS (`$IS_MACOS`) and Linux (`$IS_LINUX`) when the logic applies to both.
1. Verify the installed tool at the end of the step.

## Code rules

### Privileges

Use the helpers instead of calling `sudo` inside functions:

- `user_do` runs a command as the real user, even when the script was started with `sudo`. Use it to install tools in `$HOME`, configure Git and write dotfiles.
- `sys_do` runs a command with elevated privileges. Use it for `apt`, files in `/etc` and system services.

### Idempotency

Scripts must be safe to run repeatedly. Check whether the tool already exists and whether the configuration was already applied before installing or overwriting. Personal files, such as `~/.tmux.conf.local` and `~/.config/starship.toml`, must never be replaced.

### APT keys

Do not use `apt-key`, which is deprecated. Keys live in `/etc/apt/keyrings/` and are installed with the `install_key` helper, which checks the primary fingerprint declared at the top of `desktop.sh` and `server.sh`. Remove legacy entries from `/etc/apt/sources.list.d/` before adding the new one.

### Downloads and integrity

Third-party downloads go through the script's own verification: key fingerprint, checksum declared at the top of the file and a trusted source URL. Do not remove a verification to work around a network failure.

### Secrets and output

Never write a token, password or key to a log, a versioned file or an error message. The `ssh_copy_id` helper asks for the password in a hidden prompt. The same rule applies to any new command.

### Windows

`desktop.ps1` does not install Starship or ZSH, does not write initialization to PowerShell profiles, does not persist Execution Policy changes and does not change the Windows Terminal default profile. Preserve the bytes of the user's profiles around third-party installers.

### Markdown

Every `.md` file follows [MARKDOWN.md](MARKDOWN.md), with the configuration in [.markdownlint.json](.markdownlint.json):

- Hierarchical ATX headings (H1, then H2, then H3), never skipping a level.
- Tables with pipes and a separator row.
- Code blocks that always declare the language.
- Links in `[text](url)` format, without bare URLs.
- Hyphens for unordered lists.
- One blank line before and after headings, lists, code blocks and tables.
- No HTML in documentation. The only exception is the centered header of the `README.md`, whose elements are allowed in `.markdownlint.json`.

### Skills

This project uses Agent Skills in `.codex/skills` and `.claude/skills` to automate tasks such as `markdown-format` and `make-changelog`. AI agents must activate the relevant skills before working. Humans should know that these skills enforce the standards in this guide.

Both folders must stay functionally aligned while keeping instructions native to each agent. When you add, remove or change a skill in one folder, update the equivalent in the other. `AGENTS.md` and `CLAUDE.md` must also carry the same shared rules.

## Validate

Check the script syntax:

```bash
bash -n desktop.sh
bash -n server.sh
bash -n omarchy.sh
```

Run static analysis:

```bash
shellcheck desktop.sh server.sh omarchy.sh
```

Lint the Markdown with the project configuration:

```bash
npm install -g markdownlint-cli
markdownlint "**/*.md" --ignore node_modules
```

For Linux changes, follow the [validation strategy in DEBIAN.md](DEBIAN.md): a clean run on a supported Debian release, a second run in the same container to test idempotency, a final summary with every step marked `OK` and a check of the installed commands. The container mounts the repository read-only:

```bash
docker run -d \
    --name setupvibe-debian-desktop \
    --privileged \
    --security-opt label=disable \
    --tmpfs /run \
    --tmpfs /run/lock \
    -v "$PWD:/workspace:ro" \
    setupvibe/debian-systemd:13
```

```bash
docker exec -it --user tester setupvibe-debian-desktop \
    sudo bash /workspace/desktop.sh
```

`bash -n` alone does not validate a change. Run the installer to the end and check the commands it reports as installed.

## Documentation

- [docs/README.md](docs/README.md): editions overview and feature comparison.
- [docs/desktop/en/README.md](docs/desktop/en/README.md): Desktop edition steps.
- [docs/windows/en/README.md](docs/windows/en/README.md): Windows edition.
- [docs/server/en/README.md](docs/server/en/README.md): Server edition.
- [docs/omarchy/README.md](docs/omarchy/README.md): Omarchy 4 layer.
- [DEBIAN.md](DEBIAN.md): Linux context and container tests.
- [MARKDOWN.md](MARKDOWN.md): Markdown standard of the project.
- [brand/README.md](brand/README.md): logos, tokens, fonts, voice and the publication checklist.

The published manual lives at [promovaweb.com/docs/setupvibe](https://promovaweb.com/docs/setupvibe/). English is the reference language. Replicate each change in the other languages available in `docs/`.

After a change that affects installation, usage or features, review the [README](README.md) and the guides of the affected edition. [CHANGELOG.md](CHANGELOG.md) gets the entry for the version.

## Commits and pull requests

Use a short imperative prefix, as in the repository history:

```text
feat: add ctop check to Desktop
fix: correct TPM path on rerun
docs: reorganize README and CONTRIBUTING
chore: update the NodeSource key fingerprint
release: SetupVibe v<version>
```

A pull request must include:

- a description of the problem and the solution;
- the related issue;
- the validations you ran, with the operating system and version used;
- updates to the documentation and the CHANGELOG when behavior changes.

## Releases

The version lives in the `VERSION` variable at the top of `desktop.sh`, `desktop.ps1`, `server.sh` and `omarchy.sh`. When you change it, update every location:

- `desktop.sh`, `desktop.ps1`, `server.sh` and `omarchy.sh` (version variable);
- `CHANGELOG.md` (new entry);
- `README.md`, `AGENTS.md` and `CLAUDE.md` when they cite the version;
- every `README.md` in `docs/` and its subfolders;
- any other documentation that refers to the current version.

The release flow:

1. Update the version in the installers and the documents.
1. Add the entry to `CHANGELOG.md`.
1. Commit the release.
1. Push `main` and the tag together, so the tag exists when the script is served:

```bash
git push --atomic origin main v<version>
```

1. Check the published release on GitHub.

The installers download `conf/` and `bin/` from the tag of the running version. A missing tag breaks the installation for anyone running the new version. The `.github/workflows/v2-health.yml` workflow checks the `v2` branch and does not change the current installers.

## License

SetupVibe is distributed under the GPL-3.0. Read the text in [LICENSE](LICENSE). By submitting a contribution, you agree to license it under the same terms.

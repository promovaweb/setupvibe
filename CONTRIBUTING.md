# Contributing to SetupVibe

Thank you for your interest in contributing to SetupVibe! To ensure a consistent and high-quality experience for all users, we have established specific standards for code, documentation, and versioning.

Please select your preferred language to read the full contribution guide:

| Language | Guide |
| --- | --- |
| 🇺🇸 **English** | [English Contribution Guide](legacy/docs/en/CONTRIBUTING.md) |
| 🇧🇷 **Portuguese** | [Guia de Contribuição em Português](legacy/docs/pt-br/CONTRIBUTING.md) |
| 🇪🇸 **Spanish** | [Guía de Contribución en Español](legacy/docs/es/CONTRIBUTING.md) |
| 🇫🇷 **French** | [Guide de Contribution en Français](legacy/docs/fr/CONTRIBUTING.md) |

---

## Desenvolvimento do CLI

Esta seção reúne o conteúdo de desenvolvimento que antes ficava em
`desktop/docs/cli.md`, `desktop/docs/en/cli.md`, `server/docs/cli.md` e
`server/docs/en/cli.md`. O manual de uso de cada comando está em
[`desktop/docs/cli.md`](desktop/docs/cli.md) e
[`server/docs/cli.md`](server/docs/cli.md), com a versão em inglês ao lado.

### Commands do esqueleto

| Command | Função |
| --- | --- |
| `tui [--tab <tab>]` | Abre a TUI. Exige TTY. |
| `about` | Version, executable, runtime, platform e credits. |
| `config list\|get\|set\|unset\|path\|schema` | Preferências em settings.json. |
| `credentials set\|get\|list\|remove\|status\|clear\|rotate-key` | Cofre cifrado em credentials.json. |
| `mcp [--list]` | Servidor MCP via stdio, ou listagem do que ele registra. |
| `skill [topic]` | Mesmo efeito de `--skill`. |
| `doctor` | Confere runtime, TTY, pasta, settings, chave e cofre. |
| `completion <shell>` | Gera script para `bash`, `zsh` ou `fish`. |

No SetupVibe 2, a documentação embutida passou a ser o comando `docs`, que tem
o mesmo efeito de `--skill`, e o nome `skill` ficou com o CLI da Vercel que
instala skills. `config` ganhou `export` e `import`, `credentials` ganhou
`rotate-key`, `mcp` ganhou `install` e `completion` também aceita
`powershell`. A árvore completa está em `setupvibe --opencli` e
`setupvibe-server --opencli`, e nas seções de
[`desktop/docs/cli.md`](desktop/docs/cli.md).

### Como adicionar um command

1. Crie `shared/core/cli/commands/<name>.ts` para um comando do framework ou
   `shared/commands/<name>.ts` para um comando do SetupVibe. O antigo stub
   `template/command/example.ts` não existe mais; use
   `shared/core/cli/commands/about.ts` como o exemplo menor.
2. Preencha `name`, `description`, `arguments`, `options`, `examples` e
   `exitCodes`. Toda option precisa de `description`; é ela que aparece no
   `--help`, no `--skill` e no OpenCLI.
3. Implemente `run(ctx)` devolvendo `{ data, text }`. `data` é o que sai em
   `--json`; `text` é o que sai para humanos. Lance `AppError` (ou use
   `error.*`) para falhas previstas, com o exit code certo.
4. Registre o command em `shared/core/cli/commands.ts`.
5. Rode `bun test`, `bun run opencli` e confira `docs/opencli.json`.

Segredos nunca entram por argument de linha de comando. Leia pelo stdin ou
por `readSecret()`; grave com `setCredential()`; recupere com
`getCredential()`, que encerra com exit code 4 quando o valor não existe.

O teste `shared/tests/docs-cli-reference.test.ts` percorre a árvore pública de
cada edição e exige uma seção no `cli.md` em português e em inglês, com pelo
menos cinco blocos de exemplo. Um comando novo sem essa documentação reprova o
`bun test`.

### Skeleton commands

| Command | Purpose |
| --- | --- |
| `tui [--tab <tab>]` | Opens the TUI. Requires a TTY. |
| `about` | Version, executable, runtime, platform and credits. |
| `config list\|get\|set\|unset\|path\|schema` | Preferences in settings.json. |
| `credentials set\|get\|list\|remove\|status\|clear\|rotate-key` | Encrypted vault in credentials.json. |
| `mcp [--list]` | MCP server over stdio, or a listing of what it registers. |
| `skill [topic]` | Same effect as `--skill`. |
| `doctor` | Checks runtime, TTY, folder, settings, key and vault. |
| `completion <shell>` | Generates a script for `bash`, `zsh` or `fish`. |

In SetupVibe 2, the embedded documentation moved to the `docs` command, which
has the same effect as `--skill`, and the `skill` name belongs to the Vercel
CLI that installs skills. `config` gained `export` and `import`,
`credentials` gained `rotate-key`, `mcp` gained `install` and `completion`
also accepts `powershell`. The full tree is in `setupvibe --opencli` and
`setupvibe-server --opencli`, and in the sections of [`desktop/docs/en/cli.md`](desktop/docs/en/cli.md).

### How to add a command

1. Create `shared/core/cli/commands/<name>.ts` for a framework command or
   `shared/commands/<name>.ts` for a SetupVibe command. The old
   `template/command/example.ts` stub no longer exists; use
   `shared/core/cli/commands/about.ts` as the smallest example.
2. Fill in `name`, `description`, `arguments`, `options`, `examples` and
   `exitCodes`. Every option needs a `description`; that is what appears in
   `--help`, in `--skill` and in OpenCLI.
3. Implement `run(ctx)` returning `{ data, text }`. `data` is what goes out in
   `--json`; `text` is what goes out for humans. Throw `AppError` (or use
   `error.*`) for expected failures, with the right exit code.
4. Register the command in `shared/core/cli/commands.ts`.
5. Run `bun test`, `bun run opencli` and check `docs/opencli.json`.

Secrets never come in through a command line argument. Read them from stdin or
with `readSecret()`; store them with `setCredential()`; retrieve them with
`getCredential()`, which exits with exit code 4 when the value does not exist.

The `shared/tests/docs-cli-reference.test.ts` test walks the public tree of
each edition and requires one section in `cli.md` in Portuguese and in
English, with at least five example blocks. A new command without that
documentation fails `bun test`.

## Testes e CI

Rode da raiz do repositório com Bun 1.4.4 ou superior. Os testes apontam
`HOME` ou `SETUPVIBE_HOME` para uma pasta temporária, então não leem nem
gravam o `~/.setupvibe/` real.

### Como rodar

| Comando | O que executa |
| --- | --- |
| `bun test` | todos os arquivos de `shared/tests`, `desktop/tests` e `server/tests` |
| `bun test shared/tests` | todos os testes compartilhados, incluindo o núcleo do Termfy |
| `bun test shared/tests/core` | o núcleo do Termfy: parser, config, credenciais, doctor, MCP, completion e componentes da TUI |
| `bun test desktop/tests server/tests` | os dois entry points e a identidade de cada edição |
| `bun test shared/tests/auto.test.ts` | um arquivo, durante o desenvolvimento |
| `bun run typecheck` | TypeScript sem emitir arquivos |
| `bun run build` | `dist/setupvibe` e `dist/setupvibe-server` |
| `bun run validate` | typecheck, todos os testes e o build |
| `bun run coverage` | a suíte com cobertura; reprova abaixo de 90% das linhas e 87% das funções |
| `bun run scripts/tui-smoke.ts --bin dist/setupvibe` | a TUI compilada em um pseudo-terminal real |
| `bun run scripts/container-test.ts --system debian:13` | o `auto` em um container systemd |
| `bun run inventory:health` | chaves, arquivos e installers ainda conferem |
| `bun run inventory:bump` | versões novas; `--write` aplica e `--pr` abre um pull request |
| `bun run state:schemas` | publica `shared/schemas/*.schema.json` |

### Testes unitários

#### Núcleo do Termfy

| Arquivo | O que cobre |
| --- | --- |
| `shared/tests/core/cli.test.ts` | CLI de ponta a ponta em subprocesso, com pasta de estado isolada |
| `shared/tests/core/completion.test.ts` | scripts de Bash, Zsh, Fish e PowerShell, comandos aninhados, globais e valores de enum |
| `shared/tests/core/config.test.ts` | tipos e padrões de settings.json, cofre de credenciais, cifragem e máscara |
| `shared/tests/core/doctor.test.ts` | diagnóstico, remoção de segredos e as mesmas verificações na tool MCP |
| `shared/tests/core/exit-codes.test.ts` | códigos únicos e a tabela completa de descrição |
| `shared/tests/core/mcp.test.ts` | conversa MCP real via stdio com o cliente do SDK |
| `shared/tests/core/parser.test.ts` | subcommands, arguments, options, `--` e entrada inválida |
| `shared/tests/core/reference.test.ts` | referência gerada e o topic `reference` |
| `shared/tests/core/rotate-key.test.ts` | rotação da chave, substituição por variável e arquivos intactos na recusa |
| `shared/tests/core/tui-list.test.ts` | seleção, rolagem e ativação da lista por frames renderizados |
| `shared/tests/core/tui.test.ts` | montagem da TUI e suas abas por frame |

#### SetupVibe

| Arquivo | O que cobre |
| --- | --- |
| `shared/tests/auto.test.ts` | respostas, seleção de itens, plano, lock e fluxo do comando `auto` |
| `shared/tests/commands.test.ts` | `run` de cada comando em um ambiente simulado, em dry-run ou somente leitura |
| `shared/tests/docs-cli-reference.test.ts` | manual do CLI: seção por comando público, cinco exemplos e todos os topics de `--skill` |
| `shared/tests/docs-mcp-reference.test.ts` | manual de MCP: cada tool, resource e prompt com finalidade, entrada, saída, efeitos, recusas e cinco exemplos, sem descrever um item ausente do binário |
| `shared/tests/docs-reference.test.ts` | manuais de referência: keys, tipos, padrões, valores aceitos, exit codes, links relativos e exemplos de `config set`, `get` e `unset` |
| `shared/tests/init-security.test.ts` | requisitos e plano do init, métodos de instalação, `user create` e módulo de segurança |
| `shared/tests/inventory-ops.test.ts` | operações de list, install, remove e update, incluindo seleção e dependentes |
| `shared/tests/inventory.test.ts` | consistência do inventory: referências entre itens, profiles, repositórios, versões fixadas e checksums |
| `shared/tests/legacy.test.ts` | detecção do SetupVibe 1, migração de linhas e remoção de duplicidades |
| `shared/tests/maintenance.test.ts` | doctor, export e import de config, upgrade, report, self uninstall, ssh copy-id e usuário atual |
| `shared/tests/mcp-tools.test.ts` | tools MCP, envelopes e `mcp install` no Claude Code, Codex e OpenCode |
| `shared/tests/remaining.test.ts` | proxy, CA e cache, Docker daemon, overlay cifrado, PM2, mise lock, inventory bump e SBOM |
| `shared/tests/repo.test.ts` | toda URL do SetupVibe usa a branch `v2`, nunca `main` ou tag da v1 |
| `shared/tests/shell.test.ts` | blocos gerenciados, backups, arquivos `.local` e etapas de shell no plano do auto |
| `shared/tests/state.test.ts` | arquivos de estado, migrações de schema, run log, checksums e update check |
| `shared/tests/system.test.ts` | detecção de sistema: os-release, WSL, headless, IP público, variante e versões mínimas |
| `shared/tests/tailscale-machine.test.ts` | módulos Tailscale e Machine, seus parsers e o bento do Início |
| `shared/tests/tui-features.test.ts` | filtro do inventory, marcar todos, ajuda por módulo e troca de tema |
| `shared/tests/tui-icons.test.ts` | ícones Nerd Font e simples, e as teclas que cabem no rodapé |
| `shared/tests/tui-matrix.test.ts` | cada módulo em 80×24, 100×30, 130×40 e 200×60, em português com tema escuro e inglês com tema claro: cabeçalho, barra de teclas, placeholders, contagens do inventory, contraste 2:1, timers que param quando a TUI fecha e cada ícone presente na Nerd Font (pulado sem a fonte) |
| `shared/tests/tui-mouse.test.ts` | cliques do mouse e a troca entre português e inglês |
| `shared/tests/tui.test.ts` | modelo do inventory, checklist, achados do doctor e telas renderizadas |
| `shared/tests/windows-health.test.ts` | saúde do component store do Windows no doctor e no init |

#### Edições

| Arquivo | O que cobre |
| --- | --- |
| `desktop/tests/edition.test.ts` | entry point desktop, nome do binário, documentação e inventory |
| `server/tests/edition.test.ts` | entry point server, nome do binário, documentação e inventory |

### Cobertura

`bun run coverage` roda `bun test --coverage` por meio de
`scripts/coverage-check.ts` e lê a linha `All files` do relatório em texto. O
mínimo é 90% das linhas e 87% das funções. O limite por arquivo do Bun não é
usado porque os comandos que executam etapas reais são cobertos pelos testes
de container e pelos runners de macOS e Windows, não pela suíte unitária.

### Smoke da TUI

`scripts/tui-smoke.ts` roda o binário compilado sob `script(1)`, para o
renderizador real do OpenTUI desenhar em vez do renderizador de teste. Ele abre
os sete módulos, volta ao Início, abre a ajuda duas vezes, sai com `q` e exige
exit code 0, stderr vazio, o cabeçalho na tela e nenhum `TypeError`,
`ReferenceError`, panic ou `[object Object]`. O CI roda o script para os dois
binários depois que `bun run validate` compila.

```bash
bun run scripts/tui-smoke.ts --bin dist/setupvibe
bun run scripts/tui-smoke.ts --bin dist/setupvibe-server
```

### Containers

`scripts/container-test.ts` segue a receita de container systemd do
`DEBIAN.md`: constrói a imagem, copia `dist/<bin>`, roda `auto`, roda de novo
para provar idempotência, exercita install, check, update e remove no desktop e
termina com `check`:

```bash
bun run build
bun run scripts/container-test.ts --system debian:13
bun run scripts/container-test.ts --system archlinux:latest
bun run scripts/container-test.ts --system ubuntu:24.04 --edition server --as-root
```

`--as-root` começa como root com `--user deploy`, o fluxo de uma VPS nova.
`--keep` deixa o container em execução para inspeção. No desktop, o script
também planta um `.zshrc`, um `.tmux.conf`, um `ssh_copy_id` e uma pasta do Go
do SetupVibe 1 antes do primeiro `auto`, para testar a conversão numa máquina
real. O Zorin não tem imagem oficial de container e é coberto pela base Ubuntu
que ele compartilha.

### Workflows

| Workflow | Disparo | O que cobre |
| --- | --- | --- |
| `.github/workflows/v2.yml` | push e pull request em `v2`, tags `v2.*` e manual | `validate` (install congelado, typecheck, testes, build, cobertura e smoke da TUI nos dois binários); `containers` em Debian 12 e 13, Ubuntu 24.04, Arch e Mint 22 desktop, mais Ubuntu 24.04 e Debian 12 server como root; macOS Intel com `system`, `auto --dry-run` e `auto --profile essencial` seguido de `check`; Windows 2025 com o mesmo fluxo, completion de PowerShell para `install` e `docs inventory` e o achado `windows-health`; `release` em tags com todos os ativos, SHA256SUMS, assinatura keyless do cosign, notas do CHANGELOG e SBOM |
| `.github/workflows/v2-full.yml` | domingo às 07:41 UTC e manual | o inventory completo no macOS Intel e no Windows Server 2025, com `auto` duas vezes e `check`, em um job de 180 minutos |
| `.github/workflows/v2-health.yml` | diário às 06:17 UTC e manual | `inventory:health` para chaves de APT, arquivos e installers, depois `inventory:bump` como relatório de versões novas |
| `.github/workflows/v2-macos-arm64.yml` | tags `v2.*` e manual | Apple Silicon: build, `system`, `auto --profile essencial` e `check`; fica separado porque os runners arm64 hospedados têm capacidade limitada |

Todos os workflows fixam Bun 1.4.4 e instalam com `--frozen-lockfile`. O job
de release do `v2.yml` roda só em tags e depende de `validate` e `containers`.

## Tests and CI

Run from the repository root with Bun 1.4.4 or later. The tests point `HOME` or
`SETUPVIBE_HOME` at a temporary folder, so they do not read or write the real
`~/.setupvibe/`.

### Commands

| Command | What it runs |
| --- | --- |
| `bun test` | every file in `shared/tests`, `desktop/tests` and `server/tests` |
| `bun test shared/tests` | every shared test, including the Termfy core |
| `bun test shared/tests/core` | the Termfy core: parser, config, credentials, doctor, MCP, completion and TUI components |
| `bun test desktop/tests server/tests` | the two entry points and each edition identity |
| `bun test shared/tests/auto.test.ts` | one file, during development |
| `bun run typecheck` | TypeScript without emitting files |
| `bun run build` | `dist/setupvibe` and `dist/setupvibe-server` |
| `bun run validate` | typecheck, every test and the build |
| `bun run coverage` | the suite with coverage; fails below 90% of lines and 87% of functions |
| `bun run scripts/tui-smoke.ts --bin dist/setupvibe` | the compiled TUI in a real pseudo-terminal |
| `bun run scripts/container-test.ts --system debian:13` | `auto` in a systemd container |
| `bun run inventory:health` | keys, archives and installers still match |
| `bun run inventory:bump` | newer versions; `--write` applies and `--pr` opens a pull request |
| `bun run state:schemas` | publishes `shared/schemas/*.schema.json` |

### Unit tests

#### Termfy core

| File | What it covers |
| --- | --- |
| `shared/tests/core/cli.test.ts` | end-to-end CLI runs in a subprocess with an isolated state folder |
| `shared/tests/core/completion.test.ts` | Bash, Zsh, Fish and PowerShell scripts, nested commands, globals and enum values |
| `shared/tests/core/config.test.ts` | settings.json types and defaults, credentials vault, encryption and masking |
| `shared/tests/core/doctor.test.ts` | diagnostics, secret redaction and the same checks in the MCP tool |
| `shared/tests/core/exit-codes.test.ts` | unique codes and the full description table |
| `shared/tests/core/mcp.test.ts` | a real MCP conversation over stdio with the SDK client |
| `shared/tests/core/parser.test.ts` | subcommands, arguments, options, `--` and invalid input |
| `shared/tests/core/reference.test.ts` | the generated reference and the `reference` topic |
| `shared/tests/core/rotate-key.test.ts` | key rotation, variable replacement and unchanged files on rejection |
| `shared/tests/core/tui-list.test.ts` | list selection, scrolling and activation by rendered frames |
| `shared/tests/core/tui.test.ts` | the TUI mount and its tabs by frame |

#### SetupVibe

| File | What it covers |
| --- | --- |
| `shared/tests/auto.test.ts` | auto answers, item selection, plan, lock and the command flow |
| `shared/tests/commands.test.ts` | each command's `run` in a simulated context, in dry-run or read-only mode |
| `shared/tests/docs-cli-reference.test.ts` | the CLI manual: a section per public command, five examples and every `--skill` topic |
| `shared/tests/docs-mcp-reference.test.ts` | the MCP manual: every tool, resource and prompt with purpose, input, output, effects, refusals and five examples, with no item the binary does not expose |
| `shared/tests/docs-reference.test.ts` | the reference manuals: keys, types, defaults, accepted values, exit codes, relative links and the examples of `config set`, `get` and `unset` |
| `shared/tests/init-security.test.ts` | init requirements and plan, install methods, `user create` and the security module |
| `shared/tests/inventory-ops.test.ts` | list, install, remove and update operations, including selection and dependents |
| `shared/tests/inventory.test.ts` | inventory consistency: item references, profiles, repositories, pinned versions and checksums |
| `shared/tests/legacy.test.ts` | SetupVibe 1 detection, line migration and duplicate removal |
| `shared/tests/maintenance.test.ts` | doctor, config export and import, upgrade, report, self uninstall, ssh copy-id and the current user |
| `shared/tests/mcp-tools.test.ts` | MCP tools, envelopes and `mcp install` in Claude Code, Codex and OpenCode |
| `shared/tests/remaining.test.ts` | proxy, CA and cache, Docker daemon, encrypted overlay, PM2, mise lock, inventory bump and SBOM |
| `shared/tests/repo.test.ts` | every SetupVibe URL uses the `v2` branch, never `main` or a v1 tag |
| `shared/tests/shell.test.ts` | managed blocks, backups, `.local` files and the shell steps in the auto plan |
| `shared/tests/state.test.ts` | state files, schema migrations, run log, checksums and the update check |
| `shared/tests/system.test.ts` | system detection: os-release, WSL, headless, public IP, variant and minimum versions |
| `shared/tests/tailscale-machine.test.ts` | the Tailscale and Machine modules, their parsers and the Home bento |
| `shared/tests/tui-features.test.ts` | the inventory filter, mark all, per-module help and the theme switch |
| `shared/tests/tui-icons.test.ts` | Nerd Font and plain icons, and the keys that fit the bottom bar |
| `shared/tests/tui-matrix.test.ts` | every module at 80×24, 100×30, 130×40 and 200×60, in Portuguese with the dark theme and English with the light one: header, key bar, placeholders, Inventory counts, 2:1 contrast, timers that stop when the TUI closes and every icon present in the Nerd Font (skipped without the font) |
| `shared/tests/tui-mouse.test.ts` | mouse clicks and the Portuguese and English switch |
| `shared/tests/tui.test.ts` | the inventory model, checklist, doctor findings and the rendered screens |
| `shared/tests/windows-health.test.ts` | Windows component store health in doctor and init |

#### Editions

| File | What it covers |
| --- | --- |
| `desktop/tests/edition.test.ts` | the desktop entry point, binary name, documentation and inventory |
| `server/tests/edition.test.ts` | the server entry point, binary name, documentation and inventory |

### Coverage

`bun run coverage` runs `bun test --coverage` through
`scripts/coverage-check.ts` and reads the `All files` row of the text report.
The minimum is 90% of lines and 87% of functions. Bun's per-file threshold is
not used because the commands that run real steps are covered by the container
tests and the macOS and Windows runners, not by the unit suite.

### TUI smoke test

`scripts/tui-smoke.ts` runs the compiled binary under `script(1)`, so the real
OpenTUI renderer draws instead of the test renderer. It opens the seven
modules, returns to the Home, opens the help twice, quits with `q` and requires
exit code 0, empty stderr, the header on screen and no `TypeError`,
`ReferenceError`, panic or `[object Object]`. CI runs it for both binaries
after `bun run validate` builds them.

```bash
bun run scripts/tui-smoke.ts --bin dist/setupvibe
bun run scripts/tui-smoke.ts --bin dist/setupvibe-server
```

### Containers

`scripts/container-test.ts` follows the systemd container recipe in
`DEBIAN.md`: it builds the image, copies `dist/<bin>`, runs `auto`, runs it
again to prove idempotency, exercises install, check, update and remove on the
desktop, and ends with `check`:

```bash
bun run build
bun run scripts/container-test.ts --system debian:13
bun run scripts/container-test.ts --system archlinux:latest
bun run scripts/container-test.ts --system ubuntu:24.04 --edition server --as-root
```

`--as-root` starts as root with `--user deploy`, the flow of a fresh VPS.
`--keep` leaves the container running for inspection. On the desktop, the
script also plants a SetupVibe 1 `.zshrc`, `.tmux.conf`, `ssh_copy_id` and Go
folder before the first `auto`, so the conversion is tested in a real machine.
Zorin has no official container image and is covered by the Ubuntu base it
shares.

### Workflows

| Workflow | Trigger | What it covers |
| --- | --- | --- |
| `.github/workflows/v2.yml` | push and pull request on `v2`, tags `v2.*`, manual | `validate` (frozen install, typecheck, tests, build, coverage and TUI smoke for both binaries); `containers` on Debian 12 and 13, Ubuntu 24.04, Arch and Mint 22 desktop, plus Ubuntu 24.04 and Debian 12 server as root; macOS Intel with `system`, `auto --dry-run` and `auto --profile essencial` followed by `check`; Windows 2025 with the same flow, PowerShell completion for `install` and `docs inventory`, and the `windows-health` finding; `release` on tags with every asset, SHA256SUMS, keyless cosign signature, CHANGELOG notes and SBOM |
| `.github/workflows/v2-full.yml` | Sunday at 07:41 UTC and manual | the whole inventory on macOS Intel and Windows Server 2025, with `auto` twice and `check`, in a 180-minute job |
| `.github/workflows/v2-health.yml` | daily at 06:17 UTC and manual | `inventory:health` for APT keys, archives and installers, then `inventory:bump` as a report of newer versions |
| `.github/workflows/v2-macos-arm64.yml` | tags `v2.*` and manual | Apple Silicon: build, `system`, `auto --profile essencial` and `check`; kept apart because the hosted arm64 runners are capacity constrained |

All workflows pin Bun 1.4.4 and install with `--frozen-lockfile`. The
`v2.yml` release job runs only on tags and needs both `validate` and
`containers`.

<p align="center">
  <a href="https://promovaweb.com/setupvibe/">
    <picture>
      <source type="image/svg+xml" srcset="brand/logo/icon.svg">
      <img alt="SetupVibe" src="brand/logo/icon.png" width="112" height="112">
    </picture>
  </a>
</p>

<p align="center">
  <a href="https://promovaweb.com/setupvibe/">Project website</a> ·
  <a href="https://promovaweb.com/docs/setupvibe/">Documentation</a> ·
  <a href="https://promovaweb.com/harness/">Harness</a> ·
  <a href="https://promovaweb.com/ferramentas/">Tools</a>
</p>

# SetupVibe 2

O SetupVibe prepara ambientes de desenvolvimento e servidores com um único
executável. Esta branch distribui a v2 em pré-release. Você pode consultar o
plano de instalação pelo CLI, selecionar ferramentas pela TUI ou usar o
servidor MCP. O perfil `essencial` reúne os itens padrão de cada edição.

| Edição | Sistemas |
| --- | --- |
| Desktop | macOS, Windows, WSL, Ubuntu, Debian, Mint e Zorin |
| Server | Debian e Ubuntu |
| Omarchy | Omarchy em Arch Linux x64 |

## Instalação

O instalador lê a versão publicada em `version.json`, baixa o binário do seu
sistema na release e confere o `SHA256SUMS` antes de gravar. Com o `cosign`
instalado, ele também confere a assinatura.

No Linux, no macOS e no WSL:

```bash
curl --proto '=https' --tlsv1.2 -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.sh | sh
```

No Windows 11, em um PowerShell:

```powershell
irm https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.ps1 | iex
```

Num servidor Debian ou Ubuntu, já com a edição Server:

```bash
curl --proto '=https' --tlsv1.2 -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install-server.sh | sh
```

## Primeiro uso

Confira o plano antes de alterar a máquina e depois aplique o perfil
`essencial`:

```bash
setupvibe desktop auto --profile essencial --dry-run
setupvibe desktop auto --profile essencial
setupvibe desktop check
```

Use `server` ou `omarchy` no lugar de `desktop` para outra edição. No Windows e
no macOS, um comando sem edição usa a Desktop. Abra `setupvibe` em um terminal
interativo para usar a TUI. O [guia de instalação](docs/user/01-instalacao-e-primeiro-uso.md)
detalha os requisitos de cada sistema.

## O que o perfil essencial instala

- Runtimes e gerenciadores: mise, Node, Python com uv, PHP com Composer e PNPM.
- Ferramentas de terminal: bat, eza, zoxide, fzf, ripgrep, fd, lazygit, Neovim e jq.
- Shell: Zsh, Oh My Zsh, Starship com presets, plugins por edição, tmux com TPM
  e Nerd Fonts.
- [Ebooks, PDFs e imagens](docs/user/03-itens-e-versoes.md#ebooks-pdfs-e-imagens):
  Pandoc, WeasyPrint, Playwright com Chromium, Calibre, Poppler e ImageMagick 7.
- Agentes de código: Claude Code, Codex e OpenCode.

A lista completa por sistema sai de `setupvibe desktop list`.

## Documentação

- [Guia do usuário](docs/user/README.md) e [edições do guia em PDF e EPUB](ebook/)
- [Shell, presets do Starship e plugins](docs/user/05-shell-e-terminal.md)
- Manuais do CLI para [Desktop](desktop/docs/cli.md), [Server](server/docs/cli.md) e [Omarchy](omarchy/docs/cli.md)
- [Arquitetura da v2](V2.md), construída com [Termfy](https://github.com/promovaweb/termfy)
- [Instaladores e documentação histórica da v1](legacy/README.md)

## Comunidade e contribuição

Consulte o [guia de contribuição](CONTRIBUTING.md), a [licença GPL-3.0](LICENSE)
e o [guia de marca](brand/README.md). A Promovaweb mantém o
[Discord](https://promovaweb.com/discord) e os [planos de formação](https://promovaweb.com/planos).

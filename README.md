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

## Instalação e primeiro uso

Siga o [guia de instalação](docs/user/01-instalacao-e-primeiro-uso.md) para
o seu sistema ou consulte os binários nas [releases](https://github.com/promovaweb/setupvibe/releases).
Com a v2 instalada, visualize o plano do Desktop:

```bash
setupvibe desktop auto --profile essencial --dry-run
```

Use `server` ou `omarchy` no lugar de `desktop` para consultar outra edição.
Abra `setupvibe` em um terminal interativo para usar a TUI.

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

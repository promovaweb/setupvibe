# Gerenciador de Arquivos Yazi

> Comandos nativos e uso essencial do Yazi — v0.41.9

O [Yazi](https://github.com/sxyazi/yazi) é um gerenciador de arquivos
assíncrono para terminal, com pré-visualizações, várias abas, operações em
lote e integração com ferramentas já instaladas pelo SetupVibe.

## Disponibilidade

O SetupVibe instala o Yazi nas duas edições Desktop:

- macOS, Linux e WSL pelo Homebrew na Etapa 8 do `desktop.sh`
- Windows pelo pacote oficial `sxyazi.yazi` do WinGet

A instalação valida os dois executáveis nativos:

- `yazi` abre o gerenciador de arquivos.
- `ya` gerencia pacotes, plugins e temas do Yazi.

O SetupVibe não cria alias `y` nem wrapper de shell. Use diretamente o comando
nativo `yazi`.

## Iniciar o Yazi

Abra o diretório atual ou informe um caminho:

```bash
yazi
yazi ~/projetos
```

Confira os comandos instalados:

```bash
yazi --version
ya --version
```

## Teclas Essenciais

| Tecla                       | Ação                                                             |
| --------------------------- | ---------------------------------------------------------------- |
| `h`, `j`, `k`, `l` ou setas | Navegar                                                          |
| `Enter`                     | Abrir o arquivo ou diretório selecionado                         |
| `Space`                     | Alternar a seleção                                               |
| `y`                         | Copiar os itens selecionados                                     |
| `x`                         | Recortar os itens selecionados                                   |
| `p`                         | Colar os itens copiados ou recortados                            |
| `a`                         | Criar um arquivo; termine o nome com `/` para criar um diretório |
| `r`                         | Renomear os itens selecionados                                   |
| `d`                         | Mover os itens selecionados para a lixeira                       |
| `.`                         | Alternar arquivos ocultos                                        |
| `s`                         | Buscar nomes de arquivos com `fd`                                |
| `S`                         | Buscar conteúdo de arquivos com `ripgrep`                        |
| `z`                         | Navegar com `fzf`                                                |
| `Z`                         | Navegar com `zoxide`                                             |
| `F1` ou `~`                 | Abrir a ajuda integrada                                          |
| `q`                         | Sair                                                             |

## Integrações do SetupVibe

O SetupVibe também instala `file`, `ffmpeg`, ImageMagick, `jq`, `fd`,
`ripgrep`, `fzf`, `zoxide` e Nerd Fonts onde houver suporte. O Yazi usa essas
ferramentas para detectar arquivos, gerar pré-visualizações, pesquisar,
navegar e exibir ícones.

No Windows, o SetupVibe define a variável de ambiente do usuário
`YAZI_FILE_ONE` com o caminho de `usr\bin\file.exe` do Git for Windows,
conforme exigido para detectar tipos MIME de forma confiável. O modo de
desinstalação restaura o valor anterior quando ele ainda é gerenciado pelo
SetupVibe.

As configurações do usuário ficam em:

- `~/.config/yazi/` no macOS, Linux e WSL
- `%APPDATA%\yazi\config\` no Windows

O SetupVibe não altera esses arquivos de configuração pertencentes ao usuário.

## Referências

- [Repositório do Yazi](https://github.com/sxyazi/yazi)
- [Guia oficial de instalação](https://yazi-rs.github.io/docs/installation/)
- [Guia oficial de primeiros passos](https://yazi-rs.github.io/docs/quick-start/)

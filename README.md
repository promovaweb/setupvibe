<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/promovaweb/setupvibe/main/brand/logo/logo-dark.png">
    <img alt="SetupVibe" src="https://raw.githubusercontent.com/promovaweb/setupvibe/main/brand/logo/logo-light.png" width="360">
  </picture>
</p>

<h1 align="center">SetupVibe</h1>

<p align="center">Deixe sua máquina pronta para desenvolver com um comando.</p>

<p align="center">Um projeto da <a href="https://promovaweb.com">Promovaweb</a></p>

<p align="center">
  <a href="https://github.com/promovaweb/setupvibe/releases/latest"><img alt="Versão publicada no GitHub" src="https://img.shields.io/github/v/release/promovaweb/setupvibe"></a>
  <a href="LICENSE"><img alt="Licença" src="https://img.shields.io/github/license/promovaweb/setupvibe"></a>
</p>

<p align="center">
  <a href="https://promovaweb.com/discord"><img alt="Discord: obter ajuda e conversar com a Comunidade" src="https://img.shields.io/badge/Discord-Obter%20ajuda%20e%20conversar%20com%20a%20Comunidade-5865F2?style=for-the-badge&logo=discord&logoColor=white"></a>
</p>

<p align="center">
  <a href="#onde-você-vai-desenvolver">Escolher minha edição</a> ·
  <a href="docs/README.md">Documentação da V1</a> ·
  <a href="https://promovaweb.com/discord">Discord</a> ·
  <a href="https://promovaweb.com/planos?utm_source=github&utm_medium=readme&utm_campaign=setupvibe">Planos da Promovaweb</a> ·
  <a href="CHANGELOG.md">Changelog</a>
</p>

<p align="center"><a href="README.md">Português do Brasil</a> · <a href="README.en.md">English</a></p>

## Onde você vai desenvolver?

O SetupVibe instala o que você precisa para começar um projeto. Na edição Desktop, você pode clonar um repositório com Git, subir os serviços com Docker e abrir o código no terminal. Claude Code e Codex também ficam instalados.

| O que você quer fazer | Edição |
| --- | --- |
| Quero programar no macOS, no Linux, no WSL ou numa VPS de desenvolvimento. | [Desktop](#desktop) |
| Quero usar Git, Python e Node.js diretamente no PowerShell do Windows 11. | [Windows (Beta)](#windows-beta) |
| Quero acrescentar ferramentas ao meu Omarchy e preservar o shell e os atalhos que já uso. | [Omarchy 4](#omarchy-4) |
| Quero preparar um servidor Linux para hospedar aplicações com Docker. | [Server](#server) |

## Instalação

### Desktop

```bash
curl --proto '=https' --tlsv1.2 -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/main/desktop.sh | bash
```

No macOS, execute o comando com sua conta de usuário. O Homebrew recusa a instalação como root. O script apresenta as etapas antes de começar e pede sua senha quando precisa de privilégios.

Se você já clonou o repositório, execute o script na pasta do projeto.

```bash
bash desktop.sh
```

### Windows (Beta)

No PowerShell, execute o comando abaixo e confirme a solicitação de administrador do Windows. O instalador preserva a política de UAC.

```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; irm https://raw.githubusercontent.com/promovaweb/setupvibe/main/desktop.ps1 | iex
```

Para executar uma cópia local, abra o PowerShell na pasta do repositório.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\desktop.ps1
```

Use `-Uninstall` para remover os utilitários e as configurações gerenciados pelo instalador. O guia explica como consultar os logs, verificar a instalação e reiniciar a máquina. [Guia do Windows](docs/windows/pt-br/README.md)

### Server

```bash
curl --proto '=https' --tlsv1.2 -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/main/server.sh | bash
```

Use `--manager` para inicializar o Docker Swarm ou `--advertise-addr ADDRESS` para escolher também o endereço ou a interface anunciada. A opção `--yes` dispensa a confirmação inicial. Consulte as opções com `--help` e a versão com `--version`.

### Omarchy 4

```bash
curl -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/main/omarchy.sh | bash
```

A edição exige o Omarchy 4 já instalado e preserva seus pacotes. Para executar a cópia local sem a confirmação inicial, use `bash omarchy.sh --yes`.

### Requisitos

- **Desktop.** macOS 12+, Ubuntu 24.04+, Debian 12+, Zorin OS 18+ ou Linux Mint 21+, em x86_64 ou ARM64.
- **Windows.** Windows 11 x64 a partir da versão 22H2, build 22621. Windows Server, Windows de 32 bits e Windows em ARM ficam fora do suporte.
- **Server.** Ubuntu 24.04+, Debian 12+ ou Zorin OS 18+, em x86_64 ou ARM64.
- **Omarchy.** Omarchy 4 sobre Arch Linux x86_64.

### Atualização

Execute novamente o instalador da sua edição. Cada etapa confere o que já existe, atualiza os pacotes gerenciados e preserva seus arquivos pessoais.

## Primeiros passos

Confira o resumo final do instalador e procure as etapas marcadas como `OK`. Reabra o terminal para carregar o novo `PATH` e as configurações do shell. Verifique a versão das ferramentas incluídas na sua edição.

```bash
node --version
docker --version
php --version   # Apenas na edição Desktop
```

No Desktop e no Server, execute `herdr` para abrir o multiplexador de agentes.

## Exemplos de uso

### Inicializar o Docker Swarm no servidor

```bash
curl --proto '=https' --tlsv1.2 -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/main/server.sh | bash -s -- --manager
```

Se o servidor tiver mais de uma interface de rede, substitua `--manager` por `--advertise-addr ADDRESS` e informe o endereço que os demais nós devem usar.

### Copiar uma chave SSH para o servidor

O `ssh_copy_id` envia sua chave pública local e evita duplicatas no arquivo `authorized_keys` do servidor.

```bash
ssh_copy_id --host 192.0.2.10 --user root
```

O utilitário fica em `~/.setupvibe/bin/ssh_copy_id`, pede a senha remota sem exibi-la no terminal e aceita as opções `--pass`, `--key` e `--port`.

### Usar shell, Tmux e PM2

A edição Desktop instala Zsh, Oh My Zsh, Starship e Tmux com TPM. O PM2 inicia os aplicativos listados em `~/ecosystem.config.js` e volta a executá-los quando a máquina reinicia.

- Atalhos, plugins e configuração de sessões. [Guia do Tmux](docs/desktop/pt-br/tmux.md)
- Processos, logs e inicialização automática. [Guia do PM2](docs/desktop/pt-br/pm2.md)
- Utilitários instalados em `~/.setupvibe/bin`. [Guia de executáveis](docs/pt-br/EXECUTABLES.md)

## Uso com agentes

Cada ferramenta tem seu próprio processo de autenticação, suas permissões e suas instruções de projeto.

| Ferramenta | Comando | Edições |
| --- | --- | --- |
| [Claude Code](https://github.com/anthropics/claude-code) | `claude` | Desktop, Windows, Server |
| [Codex CLI](https://github.com/openai/codex) | `codex` | Desktop, Windows, Server |
| [OpenCode](https://github.com/sst/opencode) | `opencode` | Desktop, Windows, Server |
| Antigravity CLI | `agy` | Desktop, Windows, Omarchy |
| [Herdr](https://github.com/herdrdev/herdr) | `herdr` | Desktop, Server |
| [Vercel Labs Skills CLI](https://github.com/vercel-labs/skills) | `skills` | Desktop, Windows, Server, Omarchy |
| [Hermes Agent](https://github.com/NousResearch/hermes-agent) | `hermes` | Desktop, Omarchy |

O Herdr organiza os agentes em espaços de trabalho persistentes. Abra a pasta do seu projeto e inicie o Herdr.

```bash
cd ~/projects/my-project
herdr
```

Dentro de um painel, inicie o agente pelo comando habitual.

```bash
claude
```

Consulte os atalhos de espaços de trabalho, abas e painéis no [guia do Herdr](docs/pt-br/HERDR.md). O instalador deixa a configuração do Hermes Agent para você. Ao executar `hermes setup`, você escolhe o provedor, o modelo e as credenciais.

## Documentação

Os guias desta tabela acompanham os instaladores da V1 na branch `main`. Os guias de Desktop, Windows e Server também estão disponíveis em inglês, espanhol e francês pelo índice de edições.

| Assunto | Guia |
| --- | --- |
| Todas as edições e idiomas | [Índice da documentação](docs/README.md) |
| Desktop | [Instalação em macOS, Linux e WSL](docs/desktop/pt-br/README.md) |
| Windows (Beta) | [Instalação no Windows 11](docs/windows/pt-br/README.md) |
| Server | [Instalação em servidores Linux](docs/server/pt-br/README.md) |
| Omarchy 4 | [Instalação no Omarchy](docs/omarchy/README.md) |
| Herdr | [Espaços de trabalho, abas e painéis](docs/pt-br/HERDR.md) |
| Linux e testes em Debian | [Notas técnicas do Debian](DEBIAN.md) |

No site da Promovaweb, você encontra a apresentação das quatro edições da V1 e, em uma área própria, o manual do CLI da V2. [Portal do SetupVibe](https://promovaweb.com/setupvibe/) · [Manual da V2](https://promovaweb.com/docs/setupvibe/)

## Projetos utilizados

| Projeto | Uso no SetupVibe |
| --- | --- |
| [Homebrew](https://github.com/Homebrew/brew) | Gerenciamento de pacotes no macOS e no Linux Desktop |
| [Node.js](https://github.com/nodejs/node) | Execução de ferramentas JavaScript e CLIs de IA |
| [Bun](https://github.com/oven-sh/bun) | Execução de JavaScript no Desktop e no Omarchy |
| [Docker](https://github.com/moby/moby) | Containers, Portainer e Docker Swarm |
| [Ansible](https://github.com/ansible/ansible) | Automação de configurações no Desktop e no Server |
| [GitHub CLI](https://github.com/cli/cli) | Operações com repositórios pelo terminal |
| [Zsh](https://github.com/zsh-users/zsh) e [Oh My Zsh](https://github.com/ohmyzsh/ohmyzsh) | Shell padrão nas edições Unix |
| [Starship](https://github.com/starship/starship) | Prompt do shell |
| [Tmux](https://github.com/tmux/tmux) e [TPM](https://github.com/tmux-plugins/tpm) | Sessões persistentes e gerenciamento de plugins |
| [PM2](https://github.com/Unitech/pm2) | Gerenciamento de processos e inicialização automática de aplicativos |
| [Herdr](https://github.com/herdrdev/herdr) | Multiplexador de agentes |
| [Vercel Labs Skills CLI](https://github.com/vercel-labs/skills) | Instalação de skills para agentes |

## Comunidade e suporte

- Para tirar dúvidas em português e conversar com a comunidade, entre no [Discord da Promovaweb](https://promovaweb.com/discord).
- Para relatar uma falha, informe a versão, o sistema operacional e os passos para reproduzir o problema. [Issues no GitHub](https://github.com/promovaweb/setupvibe/issues)
- Para acompanhar as mudanças, consulte o [changelog](CHANGELOG.md) e as [releases](https://github.com/promovaweb/setupvibe/releases).

## Como contribuir

O guia de contribuição descreve o ambiente de desenvolvimento, a organização dos scripts, as validações e o envio de pull requests. [Guia de contribuição](CONTRIBUTING.md)

## Promovaweb

A Promovaweb mantém o SetupVibe. Na comunidade de coworking digital, profissionais aprendem a criar, automatizar e operar negócios de tecnologia e IA em aulas ao vivo, sessões de coworking e revisões de projetos reais. [Conheça a Promovaweb](https://promovaweb.com)

Para usar o SetupVibe nos seus projetos com acompanhamento da comunidade, consulte os [planos da Promovaweb](https://promovaweb.com/planos?utm_source=github&utm_medium=readme&utm_campaign=setupvibe).

## Licença

O SetupVibe é distribuído sob a GNU AGPL 3.0. A seção 7, item e, reserva os direitos de uso do nome e do logo do SetupVibe e da marca Promovaweb. [Texto da licença](LICENSE)

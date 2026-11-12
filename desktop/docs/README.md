# Documentação do {{title}}

O `{{bin}}` instala e mantém um ambiente de desenvolvimento com versões fixadas em macOS, Linux (Ubuntu, Debian, Mint, Zorin, Arch e Omarchy), Windows e WSL. Também roda em servidores e VPS para desenvolvimento por acesso remoto. A lista oficial do que ele instala é o inventário embutido no binário.

`{{bin}}` é um executável único com três modos de uso:

| Modo | Como entrar | Para quem |
| --- | --- | --- |
| TUI | `{{bin}}` sem argumentos em um terminal interativo | pessoas |
| CLI | `{{bin}} <command> [options]`, com saída em texto ou `--json` | pessoas, scripts e agentes |
| MCP | `{{bin}} mcp`, servidor Model Context Protocol via stdio | agentes de IA |

Os três modos compartilham a mesma identidade, a mesma configuração
(`~/.setupvibe/settings.json`), o mesmo cofre de credenciais
(`~/.setupvibe/credentials.json`, cifrado) e a mesma tabela de exit codes.
O `setupvibe` e o `setupvibe-server` usam a mesma pasta `~/.setupvibe/` e o
prefixo `SETUPVIBE_` nas variáveis, porque só um deles fica instalado por
máquina.

## Instalação automática

`{{bin}} auto` instala tudo sem perguntar nada, para máquinas sem interface,
provisionamento e agentes. As respostas vêm de opções, de variáveis
`SETUPVIBE_*` ou de um arquivo `--config`. Como root, `--user` cria o usuário
de trabalho e o `auto` continua como ele. Sem `--profile`, entra todo o
inventário compatível com o sistema; itens gráficos ficam de fora em máquina
sem interface.

```bash
{{bin}} auto --dry-run          # mostra o plano sem alterar nada
{{bin}} auto --user deploy --ssh-key "ssh-ed25519 AAAA..."
```

O resultado completo fica em `~/.setupvibe/last-run.json`. Os códigos de
saída estão na seção de exit codes.

## Mapa

- [cli.md](cli.md): commands, opções globais, convenções de saída e a referência gerada do registry.
- [tui.md](tui.md): abas, teclas, tema e como criar uma screen.
- [mcp.md](mcp.md): tools, resources, prompts e configuração nos clientes.
- [configuration.md](configuration.md): settings.json, credentials.json, master key e variáveis de ambiente.
- [exit-codes.md](exit-codes.md): tabela de exit codes e como tratá-los.

## Documentação embutida

Toda esta pasta entra no binário. Um agente pode ler tudo sem acesso ao
repositório:

```bash
{{bin}} --skill          # tudo
{{bin}} --skill cli      # só a seção do CLI, com a referência gerada
{{bin}} --skill mcp --json
```

Os tópicos aceitos são `cli`, `tui`, `mcp`, `config`, `exit-codes` e
`reference`. O topic `reference` contém somente a referência gerada do
registry, com commands, options e exit codes.

## Idioma

O código, os nomes de commands, options, keys de configuração, campos do
`--json` e as mensagens do binário são em inglês. Esta documentação e as
skills do framework são em português do Brasil, com os termos técnicos
preservados em inglês.

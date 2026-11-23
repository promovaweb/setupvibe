# Documentação do {{title}}

Execute `setupvibe <edition> <command>` para escolher a edição naquela
execução. Sem o prefixo, o CLI usa a edição salva e a informa em stderr.
Sem edição explícita ou salva, os comandos da edição saem com código 15
(`EDITION_REQUIRED`). No Windows e no macOS, onde só a Desktop roda, o comando sem edição usa a Desktop. Rode `setupvibe edition set <edition>` para gravar a
escolha. Na TUI, use `E` para abrir o menu de edições.

A edição adiciona pacotes por `omarchy pkg add` e usa um bloco em Bash para
aliases e autocomplete do SetupVibe. O Omarchy continua a administrar o
shell, o prompt, o Tmux, o Docker e a configuração do mise. Ferramentas
fornecidas pelo Omarchy aparecem como pré-instaladas em `{{bin}} list`.

O PHP 8.6.0 é instalado pelo mise numa pasta do SetupVibe. Selecione essa
versão ao executar o PHP para preservar as versões que você já usa.

```bash
{{bin}} init
{{bin}} install php
{{bin}} check php
MISE_DATA_DIR="$HOME/.setupvibe/omarchy/mise" mise exec php@8.6.0 -- php --version
```

## Mapa

- [cli.md](cli.md): commands, opções globais, convenções de saída e a referência gerada do registry.
- [tui.md](tui.md): Início, módulos, teclas por módulo, tema e como criar um módulo.
- [mcp.md](mcp.md): tools, resources e prompt, com entrada, saída, efeitos, recusas e exemplos, e a configuração nos clientes.
- [configuration.md](configuration.md): settings.json, arquivos de estado, credentials.json, master key e variáveis de ambiente.
- [exit-codes.md](exit-codes.md): tabela de exit codes, os codes de cada command e como tratá-los.
- [troubleshooting.md](troubleshooting.md): sintoma, causa, comando e exit code das falhas que o binário trata.
- [migration.md](migration.md): guia de quem vem do SetupVibe 1, com o que o `migrate` converte e o que ele pergunta.

## Documentação embutida

O binário embute `README.md`, `cli.md`, `tui.md`, `mcp.md`, `configuration.md`,
`exit-codes.md`, `troubleshooting.md` e `migration.md`, nas duas línguas. Um agente lê essa referência sem acesso ao
repositório:

```bash
{{bin}} --skill          # tudo
{{bin}} --skill cli      # só a seção do CLI, com a referência gerada
{{bin}} --skill mcp --json
```

O `{{bin}} --skill` e o `{{bin}} docs` aceitam `cli`, `tui`, `mcp`, `config`,
`exit-codes`, `troubleshooting`, `migration`, `inventory` e `reference`. O tópico
`inventory` é gerado do inventário embutido, com os perfis e uma tabela por
categoria. O tópico `reference` contém somente a referência gerada do registry,
com commands, options e exit codes.

## Idioma

O código, os nomes de commands, options, keys de configuração, campos do
`--json` e as mensagens do binário são em inglês. Esta documentação existe em
português do Brasil e em inglês, com os termos técnicos preservados em inglês.
`SETUPVIBE_LANG`, ou `--lang` no `{{bin}} docs`, escolhem a versão embutida.

## Vindo do SetupVibe 1

Veja as [notas de migração](migration.md) para integrar o Bash.

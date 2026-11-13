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
saída estão em [exit-codes.md](exit-codes.md).

## Itens do inventário

Depois do `init`, `{{bin}} list` mostra cada item e o status dele neste
sistema, `{{bin}} install <itens>` instala itens e as dependências,
`{{bin}} remove <itens> --yes` remove o que foi instalado no espaço do
usuário e `{{bin}} update` atualiza os itens cuja versão fixada mudou.
`{{bin}} install --external <ferramenta>` instala pelo mise um app fora do
inventário, com versão fixada.

## Ambiente do terminal

`{{bin}} auto` configura o shell, o prompt e o tmux. As alterações em
`~/.zshrc` (ou `~/.bashrc` no Omarchy) e em `~/.tmux.conf` ficam entre os
marcadores `# >>> setupvibe >>>` e `# <<< setupvibe <<<`, com cópia de
segurança antes da primeira mudança. Personalizações vão em `~/.zshrc.local`,
`~/.bashrc.local` e `~/.tmux.conf.local`. `{{bin}} shell apply` refaz a
configuração e `{{bin}} shell remove` tira os blocos.

## Manutenção

- `{{bin}} doctor --fix` confere o sistema, o init, os itens e restos do
  SetupVibe 1, e aplica as correções seguras.
- `{{bin}} upgrade` troca o binário pela versão nova, conferida pelo SHA256SUMS.
- `{{bin}} config export arquivo.json` e `{{bin}} config import arquivo.json`
  repetem a seleção em outra máquina.
- `{{bin}} report` gera o relatório para anexar em issue, sem segredos.
- `{{bin}} ssh copy-id usuario@servidor` autoriza a sua chave SSH num servidor.
- `{{bin}} mcp install` registra o servidor MCP no Claude Code, no Codex e no OpenCode; `{{bin}} mcp --list` mostra as tools.
- `{{bin}} skill -- add dono/repo` usa o skills CLI da Vercel.
- `{{bin}} self uninstall --yes` remove o SetupVibe e mantém backups e dados
  do Portainer.
- `{{bin}} docs` mostra esta documentação, como `--skill`.

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

Numa máquina preparada pelo SetupVibe 1, `{{bin}} system` e `{{bin}} doctor`
mostram o que ele deixou. `{{bin}} migrate --dry-run` mostra o plano e o
[migration.md](migration.md) explica cada passo: o `.zshrc` e o `.tmux.conf`
antigos vão para `~/.setupvibe/backups/`, as linhas que você acrescentou passam
para `~/.zshrc.local` e `~/.tmux.conf.local`, o `ssh_copy_id` continua
funcionando como atalho de `{{bin}} ssh copy-id` e as duplicidades (Go em
`~/.local/go`, rbenv, `~/.npm-global`, NodeSource) só saem quando você confirma
cada uma. O `auto` também converte o `.zshrc` e o `.tmux.conf` antes de
escrever os blocos novos, então nada é carregado em dobro.

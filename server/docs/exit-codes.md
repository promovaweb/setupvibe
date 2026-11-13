# Exit codes

Zero é sucesso. Cada família de falha tem um número fixo. Scripts e agentes
devem tratar o code antes de interpretar a mensagem.

| Code | Name | Comandos que devolvem | O que fazer |
| --- | --- | --- | --- |
| 0 | `SUCCESS` | todos, quando a operação termina | seguir para o próximo passo |
| 1 | `GENERIC_ERROR` | todos, quando uma falha escapa sem classificação; `skill` quando o CLI externo falha; `init` e `auto` quando o relógio está mais de cinco minutos fora; `ssh copy-id` quando o `ssh` remoto falha | leia a mensagem e o `report`; sem causa clara, rode `{{bin}} report` e anexe numa issue |
| 2 | `USAGE` | arguments, options ou subcommand inválidos; o binário sem argumentos fora de um TTY, que imprime a ajuda; `init` e `auto` quando a outra edição já está configurada; `migrate` com id desconhecido em `--remove-legacy`; `upgrade` a partir do código-fonte | confira `--help` do command e o valor passado |
| 3 | `CONFIG` | `settings.json` ausente, inválido ou com key desconhecida; `install` e `update` antes do `init`; `security remove` sem registro; `swarm token` numa máquina que não é manager; `doctor` com achado de nível fail; `config import` quando a instalação não pode continuar | leia o campo indicado, corrija o arquivo de estado ou rode o command que a mensagem pede |
| 4 | `CREDENTIALS` | `credentials` e seus subcommands, quando o cofre está ilegível, a master key falta ou o name não existe | grave a credencial com `{{bin}} credentials set <name>` ou recupere a chave |
| 5 | `NETWORK_OR_API` | `init` e `auto` quando `github.com` não responde; `upgrade` quando `version.json`, o binário, o `SHA256SUMS` ou a assinatura não conferem | veja proxy, CA e DNS em [troubleshooting.md](troubleshooting.md) |
| 6 | `NOT_FOUND` | `config` e seus subcommands quando um caminho do arquivo não existe; `ssh copy-id` sem chave pública; `install --external` com ferramenta desconhecida; `remove --external` de app que não foi instalado assim | crie o arquivo, escolha outra key ou instale a ferramenta primeiro |
| 7 | `PERMISSION` | `config`, `credentials` e `upgrade` quando o arquivo ou o binário não pode ser lido, gravado ou substituído | corrija o dono e o modo do caminho indicado |
| 8 | `NO_TTY` | `tui`, quando stdin ou stdout não são um terminal | rode no terminal, ou use o CLI e `--json` |
| 9 | `MCP` | `mcp`, quando o servidor não inicia ou perde o transporte stdio | confira a configuração do cliente MCP e o stderr do servidor |
| 10 | `PARTIAL` | `init`, `auto`, `install`, `remove`, `update`, `check`, `shell apply`, `shell remove`, `migrate`, `self uninstall`, `user create`, `user nopasswd`, `security apply`, `security remove`, `config import`, `mcp install`, `doctor --repair-windows` quando parte dos passos falhou e o resto ficou aplicado | leia o log da execução; a mensagem final traz o caminho |
| 11 | `UNSUPPORTED_SYSTEM` | `system`, `init`, `auto`, `list`, `install`, `remove`, `update`, `check`, `shell apply`, `migrate`, `user create`, `security apply`; `upgrade` quando não existe binário para a plataforma | confira `{{bin}} system`; a edição ou a arquitetura não tem suporte |
| 12 | `ROOT` | `init` e `auto` quando rodam como root sem `--user` | crie o usuário com `{{bin}} user create <nome>` ou rode `auto --user <nome>` |
| 13 | `SUDO_PASSWORD` | `auto` e `migrate` quando o `sudo` pede senha e não há terminal | rode no terminal, ou crie a regra com `{{bin}} user nopasswd <nome>` |
| 14 | `DISK_SPACE` | `init` e `auto` quando a pasta do usuário tem menos de 10 GB livres no desktop ou 5 GB no servidor | libere espaço e rode de novo |
| 20 | `REBOOT_PENDING` | `auto` quando existe reinício pendente e `--reboot` não foi passado | reinicie e rode `auto` de novo, ou passe `--reboot` |
| 30 | `LOCKED` | `auto` quando outra execução segura `~/.setupvibe/run.lock` | espere a outra execução terminar; confira o PID do lock |
| 130 | `INTERRUPTED` | qualquer command interrompido com Ctrl+C; `remove`, `self uninstall` e `credentials` quando você recusa a confirmação | nada foi concluído; rode de novo quando quiser |

A fonte única é `shared/core/app/exit-codes.ts`. Ela alimenta a seção de exit
codes de cada `--help`, o `--opencli`, a tool MCP `exit_codes` e a resource
`{{bin}}://exit-codes`.

## Por command

Cada command declara seus codes em `--opencli`, além de 0, 1 e 2, que valem
para todos.

| Command | Codes declarados |
| --- | --- |
| `tui` | 8 |
| `system` | 11 |
| `init` | 5, 10, 11, 12, 14 |
| `auto` | 5, 10, 11, 12, 13, 14, 20, 30 |
| `list` | 11 |
| `install` | 3, 6, 10, 11 |
| `remove` | 6, 10, 11, 130 |
| `update` | 3, 10, 11 |
| `check` | 10, 11 |
| `shell apply` | 10, 11 |
| `shell remove` | 10 |
| `migrate` | 10, 11, 13 |
| `upgrade` | 5, 7, 11 |
| `self uninstall` | 10, 130 |
| `ssh copy-id` | 6 |
| `user create` | 10, 11 |
| `user nopasswd` | 10 |
| `security apply` | 10, 11 |
| `security remove` | 3, 10 |
| `swarm token` | 3 |
| `config` e subcommands | 3, 6, 7 |
| `config import` | 3, 10 |
| `credentials` e subcommands | 4, 7, 130 |
| `mcp` | 9 |
| `mcp install` | 10 |
| `doctor` | 3, 10 |

Alguns caminhos devolvem um code que a lista do command não declara:
`upgrade` devolve 2 quando roda a partir do código-fonte, `config import`
devolve 2 com arquivo ilegível e `self uninstall` devolve 2 sem `--yes` fora de
um terminal. Trate o code observado, não só a lista.

As tools MCP que recusam uma execução real sem confirmação devolvem
`exitCode: 2` no resultado da tool, sem iniciar processo. `doctor`, `check`,
`install` e `update` marcam `isError` com os dados no envelope quando o code
não é zero.

## Em shell

Leia o code numa variável própria. Negar o comando com `!` perde o valor real,
porque `$?` passa a ser o resultado da negação.

```bash
{{bin}} credentials get github.token --json > /tmp/saida.json
code=$?
case $code in
  0) echo "token lido" ;;
  4) echo "grave a credencial com: {{bin}} credentials set github.token" ;;
  *) echo "falhou com $code; veja /tmp/saida.json" ;;
esac
```

Um planejamento que aceita falha parcial testa 10 antes de 1:

```bash
{{bin}} auto --json --user deploy
code=$?
if [ "$code" -eq 10 ]; then
  echo "parte dos itens falhou; o log está em ~/.setupvibe/logs"
elif [ "$code" -ne 0 ]; then
  echo "auto parou com $code"
fi
```

## No `--json`

Um erro sai no envelope, com code, nome e detalhes:

```json
{ "ok": false, "command": "setupvibe credentials get", "error": { "code": 4, "name": "CREDENTIALS", "message": "Credential \"github.token\" not found." } }
```

O `data` do envelope nunca carrega valor de credencial. Leia `error.code` antes
de `error.message`, porque a mensagem pode mudar entre versões.

## No código

```ts
import { error } from "../app/errors.ts";

throw error.network("A API respondeu 503.", { status: 503 }); // encerra com 5
```

Para uma família nova, acrescente a constante e a description em
`shared/core/app/exit-codes.ts`, um atalho em `shared/core/app/errors.ts` e o
code em `exitCodes` de cada command que o devolve. Não reutilize números.

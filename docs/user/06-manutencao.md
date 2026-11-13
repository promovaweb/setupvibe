# Manutenção

Uma máquina preparada continua sendo uma máquina: o sistema atualiza, o
binário ganha versão nova, um item quebra e alguém precisa entender o que
aconteceu seis meses depois. Este capítulo reúne os comandos que respondem a
essas situações sem reinstalar tudo.

## Diagnóstico

`setupvibe doctor` é o primeiro comando quando algo parece errado. Ele confere o
runtime, o estado do SetupVibe, os pré-requisitos, os itens selecionados, o
bloco do shell, o `PATH`, restos do SetupVibe 1 e, no Windows, a saúde do
component store.

```bash
setupvibe doctor
setupvibe doctor --fix
```

`--fix` aplica as correções seguras: cria `~/.local/bin`, corrige o modo da
pasta de estado e escreve o bloco do shell. Antes de gravar o bloco, ele converte
os arquivos do SetupVibe 1, igual ao `auto` e ao `shell apply`. O que exige
decisão sua, como remover uma duplicidade ou trocar de edição, fica listado com o
comando que resolve.

Um achado de nível `fail` faz o comando sair com 3, `CONFIG`, mesmo que os
outros estejam aprovados. Leia o texto antes de tratar como falha de configuração
no sentido literal.

No Windows, a verificação de componentes usa `DISM /Online /Cleanup-Image
/CheckHealth`, que é rápida. A reparação lenta é explícita:

```powershell
setupvibe doctor --repair-windows
```

Ela roda `DISM /RestoreHealth` e depois `sfc /scannow`, exige PowerShell elevado
e demora. Se um dos dois falhar, o comando sai com 10.

## Atualizar o binário

O `upgrade` troca o executável pela release mais nova do canal. A verificação é
a mesma do installer: `SHA256SUMS` sempre, assinatura Sigstore do `SHA256SUMS`
quando o `cosign` está no `PATH`. Assinatura que não corresponde interrompe a
troca.

```bash
setupvibe upgrade --check
setupvibe upgrade
```

`--check` só informa se existe versão nova. `--channel beta` acompanha o canal de
teste, e o canal também pode vir de `config.json`. Quando o binário está em
`/usr/local/bin`, a troca precisa de permissão de escrita nesse diretório.

Depois de atualizar o binário, rode o `update` para aplicar as versões que a
lista nova fixa:

```bash
setupvibe upgrade && setupvibe update
```

O `upgrade` não mexe nos itens; o `update` não baixa binário. São duas etapas
separadas de propósito, para você ver o que muda na máquina.

## Relatório para uma issue

`setupvibe report` monta um Markdown com sistema, achados do doctor, itens, apps
externos, último run e as últimas linhas do log. Valores de variáveis sensíveis
saem mascarados.

```bash
setupvibe report
setupvibe report --output report.md
```

O relatório não substitui o log completo quando o problema depende de detalhe.
Para anexar numa issue do GitHub sem abrir o editor:

```bash
setupvibe report --output report.md && gh issue create --body-file report.md
```

## Logs e o último resultado

Cada execução grava `~/.setupvibe/logs/<data>-<command>.log`, com um evento
NDJSON por linha. O `auto` grava também `~/.setupvibe/last-run.json`, com o
resultado passo a passo.

Três formas de ler:

```bash
setupvibe --tab logs
tail -n 40 ~/.setupvibe/logs/*.log
jq '.steps[] | select(.status=="fail")' ~/.setupvibe/last-run.json
```

A TUI mostra a execução e os eventos dentro do módulo Logs, com a mensagem de
erro abaixo de cada falha. No terminal, o `tail` resolve o caso de uma execução
recente, e o `jq` ajuda quando o `last-run.json` é grande.

## Repetir uma seleção em outra máquina

`config export` grava a seleção e a identidade do Git num arquivo sem segredo.
`config import` instala o que está nele, com o mesmo resultado de um `install`,
e aplica a identidade do Git.

```bash
setupvibe config export selecao.json
setupvibe config import selecao.json --dry-run
setupvibe config import selecao.json
```

O arquivo exportado não carrega credencial. Numa máquina nova, instale o
binário e rode o `init` antes de importar, porque `install` e `config import`
exigem a preparação concluída.

## Remover o SetupVibe

`self uninstall` tira os blocos do shell, a regra de sudo, os binários
encontrados e, sem `--keep-data`, a pasta `~/.setupvibe/`. Backups dos seus
arquivos, volumes do Portainer e restos do SetupVibe 1 ficam.

```bash
setupvibe self uninstall --dry-run
setupvibe self uninstall --yes
```

`--keep-data` mantém estado, logs e backups. `--items` remove também os itens
instalados no espaço do usuário, que de outra forma continuam na máquina. Sem
terminal, `--yes` é obrigatório.

## Chave SSH num servidor

`ssh copy-id` acrescenta a sua chave pública ao `authorized_keys` do servidor
remoto uma única vez, com os modos corretos. A chave viaja na entrada padrão,
nunca na linha de comando.

```bash
setupvibe ssh copy-id deploy@203.0.113.10
setupvibe ssh copy-id deploy@host --port 2222
```

Com `--password-stdin`, a senha do servidor é lida da entrada e respondida pelo
`sshpass`. Sem chave pública na máquina, o comando termina com 6, `NOT_FOUND`.

## Skills de agente

O comando `skill` executa o skills CLI da Vercel fixado na lista. Os argumentos
vão depois de `--`, para que as options cheguem ao CLI:

```bash
setupvibe skill -- list
setupvibe skill -- add promovaweb/herdrfy -g -a claude-code
setupvibe skill -- add https://github.com/promovaweb/setupvibe/tree/v2/desktop/skills/setupvibe
```

A última linha instala a skill que ensina um agente a operar o próprio binário.
Ela está em `desktop/skills/setupvibe` e em `server/skills/setupvibe-server`.

## Documentação embutida

O binário carrega a documentação que um agente lê sem o repositório:

```bash
setupvibe --skill
setupvibe docs inventory
setupvibe docs cli --lang en
```

`--skill` aceita `cli`, `tui`, `mcp`, `config`, `exit-codes`, `troubleshooting`,
`migration`, `inventory` e `reference`. O `docs` aceita os mesmos tópicos e
`--lang`. O tópico `reference` traz só a referência gerada do registro, com
commands, options e exit codes.

## Rotina

Uma sequência curta cobre a maior parte da manutenção:

| Frequência | Comando | Para que |
| --- | --- | --- |
| depois de uma atualização do sistema | `setupvibe doctor` | ver o que mudou de estado |
| antes de abrir uma issue | `setupvibe report` | anexar o estado sem segredo |
| quando o binário avisa de versão nova | `setupvibe upgrade && setupvibe update` | trocar binário e versões fixadas |
| antes de formatar a máquina | `setupvibe config export` | levar a seleção para a próxima |

## Próximo passo

O capítulo [Servidor e segurança](07-servidor-e-seguranca.md) trata da máquina
de operação: usuário de trabalho, UFW, fail2ban, SSH e Swarm.

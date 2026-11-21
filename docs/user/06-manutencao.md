# Manutenção

Depois de uma atualização do sistema ou de uma falha num item, você pode
conferir o estado da máquina antes de reinstalar ferramentas. Os comandos
deste capítulo ajudam a localizar a falha e a aplicar a correção indicada.

## Diagnóstico

`setupvibe desktop doctor` confere o runtime e o estado da instalação para identificar
pré-requisitos pendentes e falhas nos itens selecionados. Ele também examina o
bloco do shell, o `PATH` e os restos do SetupVibe 1. No Windows, inclui a
verificação de saúde do component store.

```bash
setupvibe desktop doctor
setupvibe desktop doctor --fix
```

`--fix` aplica as correções seguras: cria `~/.local/bin`, corrige o modo da
pasta de estado e escreve o bloco do shell. Antes de gravar o bloco, ele converte
os arquivos do SetupVibe 1, igual ao `auto` e ao `shell apply`. O que exige
uma escolha sua, como remover uma duplicidade ou trocar de edição, fica listado com o
comando que resolve.

Um achado de nível `fail` faz o comando sair com 3, `CONFIG`, mesmo que os
outros estejam aprovados. Leia o texto antes de tratar como falha de configuração
no sentido literal.

No Windows, a verificação de componentes usa `DISM /Online /Cleanup-Image
/CheckHealth`, que é rápida. A reparação lenta é explícita:

```powershell
setupvibe desktop doctor --repair-windows
```

Ela roda `DISM /RestoreHealth` e depois `sfc /scannow`, exige PowerShell elevado
e demora. Se um dos dois falhar, o comando sai com 10.

## Atualizar o binário

O `upgrade` troca o executável pela release mais nova do canal. A verificação é
a mesma do installer: confere o `SHA256SUMS` e, quando o `cosign` está no
`PATH`, a assinatura Sigstore desse arquivo. Uma assinatura divergente interrompe a
troca.

```bash
setupvibe desktop upgrade --check
setupvibe desktop upgrade
```

Use `--check` para consultar a disponibilidade de uma versão sem instalá-la.
O canal vem de `config.json` ou de `--channel beta` para acompanhar os testes.
Quando o binário está em
`/usr/local/bin`, a troca precisa de permissão de escrita nesse diretório.

Depois de atualizar o binário, rode o `update` para aplicar as versões que a
lista nova fixa:

```bash
setupvibe desktop upgrade && setupvibe desktop update
```

O `upgrade` troca o binário e o `update` aplica as versões dos itens. As etapas
são separadas para você conferir as alterações antes de aplicá-las à máquina.

## Relatório para uma issue

`setupvibe desktop report` monta um Markdown com sistema, achados do doctor, itens, apps
externos, último run e as últimas linhas do log. Valores de variáveis sensíveis
saem mascarados.

```bash
setupvibe desktop report
setupvibe desktop report --output report.md
```

O relatório não substitui o log completo quando o problema depende de detalhe.
Para anexar numa issue do GitHub sem abrir o editor:

```bash
setupvibe desktop report --output report.md && gh issue create --body-file report.md
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
recente. Use o `jq` para filtrar os passos do `last-run.json`.

## Repetir uma seleção em outra máquina

`config export` grava a seleção e a identidade do Git num arquivo sem segredo.
`config import` instala os itens desse arquivo pelo mesmo procedimento de
`install` e aplica a identidade do Git.

```bash
setupvibe desktop config export selecao.json
setupvibe desktop config import selecao.json --dry-run
setupvibe desktop config import selecao.json
```

O arquivo exportado não carrega credencial. Numa máquina nova, instale o
binário e rode o `init` antes de importar, porque `install` e `config import`
exigem a preparação concluída.

## Remover o SetupVibe

`self uninstall` tira os blocos do shell, a regra de sudo, os binários
encontrados e, sem `--keep-data`, a pasta `~/.setupvibe/`. Backups dos seus
arquivos, volumes do Portainer e restos do SetupVibe 1 ficam.

```bash
setupvibe desktop self uninstall --dry-run
setupvibe desktop self uninstall --yes
```

`--keep-data` mantém estado, logs e backups. `--items` remove também os itens
instalados no espaço do usuário, que de outra forma continuam na máquina. Sem
terminal, `--yes` é obrigatório.

## Chave SSH num servidor

`ssh copy-id` acrescenta a sua chave pública ao `authorized_keys` do servidor
remoto uma única vez, com os modos corretos. O comando envia a chave pela
entrada padrão, fora dos argumentos do processo.

```bash
setupvibe desktop ssh copy-id deploy@203.0.113.10
setupvibe desktop ssh copy-id deploy@host --port 2222
```

Com `--password-stdin`, a senha do servidor é lida da entrada e respondida pelo
`sshpass`. Sem chave pública na máquina, o comando termina com 6, `NOT_FOUND`.

## Skills de agente

O comando `skill` executa o skills CLI da Vercel fixado na lista. Os argumentos
vão depois de `--`, para que as options cheguem ao CLI:

```bash
setupvibe desktop skill -- list
setupvibe desktop skill -- add promovaweb/herdrfy -g -a claude-code
setupvibe desktop skill -- add https://github.com/promovaweb/setupvibe/tree/v2/desktop/skills/setupvibe
```

A última linha instala a skill que ensina um agente a operar o próprio binário.
Ela está em `desktop/skills/setupvibe` e em `server/skills/setupvibe-server`.

## Documentação embutida

O binário carrega a documentação que um agente lê sem o repositório:

```bash
setupvibe desktop --skill
setupvibe desktop docs inventory
setupvibe desktop docs cli --lang en
```

`--skill` aceita `cli`, `tui`, `mcp`, `config`, `exit-codes`, `troubleshooting`,
`migration`, `inventory` e `reference`. O `docs` aceita os mesmos tópicos e
`--lang`. O tópico `reference` traz só a referência gerada do registro, com
commands, options e exit codes.

## Rotina

Uma sequência curta cobre a maior parte da manutenção:

| Frequência | Comando | Para que |
| --- | --- | --- |
| depois de uma atualização do sistema | `setupvibe desktop doctor` | ver o que mudou de estado |
| antes de abrir uma issue | `setupvibe desktop report` | anexar o estado sem segredo |
| quando o binário avisa de versão nova | `setupvibe desktop upgrade && setupvibe desktop update` | trocar binário e versões fixadas |
| antes de formatar a máquina | `setupvibe desktop config export` | levar a seleção para a próxima |

## Próximo passo

O capítulo [Servidor e segurança](07-servidor-e-seguranca.md) trata da máquina
de operação: usuário de trabalho, UFW, fail2ban, SSH e Swarm.

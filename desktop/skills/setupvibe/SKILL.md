---
name: setupvibe
description: Opera o binário setupvibe (SetupVibe 2) num computador de desenvolvimento, com instalação, conferência, atualização e remoção das ferramentas fixadas, sempre pela CLI com --json e --dry-run.
---

# Operar o setupvibe

O `setupvibe` instala e mantém um ambiente de desenvolvimento com versões
fixadas no macOS, no Linux, no WSL e no Windows 11. Use esta skill quando a
pessoa pedir para instalar, conferir, atualizar ou remover ferramentas com
ele, ou para diagnosticar a máquina.

## Regras

1. Leia antes de mudar. Rode `setupvibe system --json` e
   `setupvibe list --json` para saber o sistema, a variante e o estado de cada
   item.
2. Mostre o plano. Todo comando que altera a máquina aceita `--dry-run`. Rode
   primeiro com `--dry-run`, mostre os passos à pessoa e só depois execute.
3. Use `--json` para ler resultados. O envelope traz `ok`, `code`, `data` e
   `error`. Os códigos de saída estão em `setupvibe docs exit-codes`.
4. Não rode como root. O binário recusa (código 12), salvo `user create`,
   `auto --user`, `security` e os comandos de leitura.
5. Senha do sudo é da pessoa. Com o código 13, peça que ela rode o comando no
   terminal dela; não guarde senha.
6. Itens com status `other` já existem por outro gerenciador. O SetupVibe
   instala a própria cópia pelo mise e mantém a outra. Avise a pessoa qual vem
   primeiro no PATH.

## Comandos

| Pedido | Comando |
| --- | --- |
| Preparar a máquina | `setupvibe init --dry-run`, depois `setupvibe init` |
| Instalar itens | `setupvibe install <id>... --dry-run`, depois sem a flag |
| Tudo sem perguntas | `setupvibe auto --profile essencial --dry-run` |
| Conferir | `setupvibe check --json` |
| Atualizar | `setupvibe update --dry-run`, depois `setupvibe update` |
| Remover | `setupvibe remove <id>... --dry-run`, depois com `--yes` |
| Diagnóstico | `setupvibe doctor --json`, e `setupvibe doctor --fix` para as correções seguras |
| Relatório para issue | `setupvibe report --output report.md` |
| Novo binário | `setupvibe upgrade --check`, depois `setupvibe upgrade` |
| Agentes via MCP | `setupvibe mcp install` |

## Máquina remota

Num computador acessado por SSH, a variante aparece como `remote-headless` ou
`remote-exposed`. Itens gráficos ficam de fora, o Portainer e as portas do
Docker ficam em 127.0.0.1 e, na variante exposta, o módulo de segurança entra
no `auto`. Para acesso pela tailnet, use `--tailscale-ssh` com
`TAILSCALE_AUTHKEY`.

## Saída

Ao terminar, informe à pessoa os comandos executados, o código de saída, os
itens instalados ou removidos, os itens pulados com o motivo e o caminho do
log (`data.log` no JSON).

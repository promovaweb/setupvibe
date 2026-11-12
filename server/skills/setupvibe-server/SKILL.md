---
name: setupvibe-server
description: Opera o binário setupvibe-server (SetupVibe 2) em servidores Linux, com auto sem perguntas, módulo de segurança, Docker Swarm e manutenção, sempre pela CLI com --json e --dry-run.
---

# Operar o setupvibe-server

O `setupvibe-server` prepara servidores Linux (Debian, Ubuntu e Arch) com
Docker, ferramentas de DevOps, shell e o módulo de segurança. Use esta skill
quando a pessoa pedir para provisionar, endurecer, conferir ou manter um
servidor com ele.

## Regras

1. Leia antes de mudar: `setupvibe-server system --json` e
   `setupvibe-server list --json`.
2. Rode primeiro com `--dry-run`, mostre os passos e só depois execute.
3. Como root, o único caminho de instalação é `auto --user <nome>`: ele cria o
   usuário de trabalho com sudo e continua como esse usuário.
4. Segredos entram por variável de ambiente, nunca na linha de comando:
   `TAILSCALE_AUTHKEY`, `SETUPVIBE_SWARM_TOKEN`, `GH_TOKEN`.
5. O endurecimento do SSH só acontece quando o usuário tem chave em
   `authorized_keys`. Confira isso antes de prometer login só por chave.

## Comandos

| Pedido | Comando |
| --- | --- |
| Servidor novo, como root | `setupvibe-server auto --user deploy --ssh-key "$(cat key.pub)" --dry-run` |
| Gerente do Swarm | `setupvibe-server auto --manager --advertise-addr <ip>:2377` |
| Token para outro nó | `setupvibe-server swarm token` ou `swarm token manager` |
| Entrar no Swarm | `SETUPVIBE_SWARM_TOKEN=<token> setupvibe-server auto --join "$SETUPVIBE_SWARM_TOKEN" --advertise-addr <gerente>:2377` |
| Segurança | `setupvibe-server security apply --dry-run`, e `security remove` para desfazer |
| Conferir | `setupvibe-server check --json` e `setupvibe-server doctor --json` |
| Atualizar | `setupvibe-server update --dry-run`, depois sem a flag |
| Relatório para issue | `setupvibe-server report --output report.md` |

## Reinício

Com o código 20, o servidor precisa reiniciar. Com `--reboot`, o `auto`
agenda a continuação e reinicia sozinho. Sem a flag, rode o `auto` de novo
depois do reinício.

## Saída

Informe os comandos executados, o código de saída, as partes do módulo de
segurança aplicadas e puladas, o estado do Swarm e o caminho do log.

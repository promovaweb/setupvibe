# Servidor e segurança

O Server aceita root em Linux. O instalador `install-server.sh` instala
`setupvibe` e cria o link `setupvibe-server` para automações existentes. Em
uma máquina com sessão gráfica, a edição Server pede confirmação antes de
alterar UFW, fail2ban e o acesso SSH. Em script, revise o plano com
`--dry-run` e passe `--confirm-security` para aplicar.

Um VPS novo começa como root, sem usuário de trabalho, sem firewall e com SSH
aceitando senha. Antes de clonar o primeiro projeto, essa máquina precisa de
quatro coisas na ordem certa: um usuário que não seja root, a chave dele no
lugar, o firewall fechado e o SSH só por chave. O SetupVibe faz as quatro com a
edição server, que é separada da desktop de propósito.

A edição server instala só o que uma máquina de operação usa: Docker, Portainer,
Ansible, GitHub CLI, Tailscale, servidor SSH, as CLIs de agente, shell e tmux. Ela
não traz PHP, Ruby, Go nem os aplicativos gráficos da desktop. O que as duas
compartilham é a pasta `~/.setupvibe/`, o prefixo `SETUPVIBE_` e a tabela de exit
codes.

## Instalar a edição server

O installer é o mesmo, com a edição escolhida na linha de comando:

```bash
curl --proto '=https' --tlsv1.2 -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.sh | sh -s -- --edition server
```

Também existe o endereço que já chega com a edição escolhida:

```bash
curl --proto '=https' --tlsv1.2 -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install-server.sh | sh
```

A verificação é a mesma da desktop: versão lida de `version.json`, binário do
release, `SHA256SUMS` e assinatura Sigstore quando o `cosign` existe. A edição
server roda em Ubuntu e Debian. Em macOS, o installer recusa com
11, `UNSUPPORTED_SYSTEM`.

Para preparar o Server e manter o Desktop como edição padrão, use o
prefixo `setupvibe server` nos comandos. Para mudar o padrão da conta, use
`setupvibe edition set server`.

## Usuário de trabalho

Como root, crie o usuário antes de qualquer outra etapa. O `user create` cria o
usuário, o home, a entrada no grupo de sudo (`sudo` no Ubuntu e no Debian),
instala a chave pública em `authorized_keys` e, com `--nopasswd`, a regra de
sudo sem senha validada por `visudo -cf` antes de entrar no lugar.

```bash
setupvibe server user create deploy --ssh-key ~/.ssh/id_ed25519.pub
```

A saída termina com o próximo passo: entrar como o usuário novo e rodar o `init`.
A permissão de sudo sem senha criada pelo `auto` é temporária. Com
`user create --nopasswd`, ela fica até você removê-la:

```bash
setupvibe server user nopasswd deploy --remove
```

A regra fica em `/etc/sudoers.d/90-setupvibe-deploy`. Outras regras em
`/etc/sudoers.d/` são preservadas.

## Módulo de segurança

`security apply` configura o UFW para negar conexões de entrada, liberando SSH
e as portas do Swarm quando você usa `--swarm` no servidor. O módulo também
configura o jail `sshd` do fail2ban e as atualizações automáticas de segurança
em Debian e Ubuntu. Para fixar o fuso usado pela sincronização de horário,
informe `--timezone`.

O SSH muda para login só por chave com `/etc/ssh/sshd_config.d/10-setupvibe.conf`
apenas quando o usuário atual já tem uma chave autorizada. O arquivo passa por
`sshd -t` antes de o serviço recarregar. O arquivo define
`PasswordAuthentication no` para desativar o acesso por senha.

```bash
setupvibe server security apply --dry-run
setupvibe server security apply --timezone America/Sao_Paulo
```

Antes da primeira mudança, o módulo registra em
`~/.setupvibe/state/security.json` se o UFW e o fail2ban estavam ativos e quais
arquivos dele já existiam. Esse registro é o que permite desfazer sem adivinhar:

```bash
setupvibe server security remove
```

O `remove` apaga os arquivos que o SetupVibe criou, desliga o fail2ban e o UFW
quando eles estavam desligados antes e apaga o registro. Os pacotes continuam
instalados. Os arquivos preexistentes são preservados. Sem registro, o
comando sai com 3, `CONFIG`.

## O fluxo de um VPS novo

A sequência abaixo parte de uma máquina que acabou de subir, com a sua chave já
na mão. O `auto` cria o usuário, continua como ele, instala a seleção da edição
server e inicia o Swarm como manager.

```bash
curl -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install-server.sh \
  | sh -s -- auto --user deploy --ssh-key ~/.ssh/id_ed25519.pub \
    --manager --advertise-addr 10.0.0.1:2377
```

O endereço anunciado precisa ser o que os outros nós alcançam. O `auto` remove a
regra temporária de sudo no fim, salvo `--keep-nopasswd`. O módulo de segurança
entra automaticamente na edição server e na desktop exposta.

Para juntar um worker, peça o token no manager e passe para a máquina nova:

```bash
TOKEN=$(ssh deploy@10.0.0.1 setupvibe server swarm token)
curl -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install-server.sh \
  | sh -s -- auto --user deploy --ssh-key ~/.ssh/id_ed25519.pub \
    --join "$TOKEN" --advertise-addr 10.0.0.2:2377
```

`swarm token manager` devolve o token de manager. A option `--rotate` troca o token de
worker antes de imprimir. Com `--encrypted-network`, a rede overlay do Swarm
cifra o tráfego. Para fornecer o token sem escrevê-lo na linha de comando,
use a variável `SETUPVIBE_SWARM_TOKEN`.

## Portainer e portas publicadas

Nas variantes remotas, o `auto` prende o Portainer a `127.0.0.1` e grava
`"ip": "127.0.0.1"` em `/etc/docker/daemon.json` quando o arquivo não tem
endereço. Docker escreve as próprias regras de iptables e não passa pelo UFW. Uma
porta publicada sem esse cuidado ficaria aberta para a internet. Chegue ao
Portainer por túnel SSH ou pela tailnet.

O `doctor` lista cada container que publica uma porta em todas as interfaces e mostra o
comando para prender a porta ao localhost. Para abrir só uma porta, publique com
`-p 127.0.0.1:PORTA:PORTA` e alcance pelo túnel ou pelo Tailscale.

## Acesso remoto

Três itens resolvem o acesso de trabalho: `openssh-server`, `tailscale` e
`mosh`. O Tailscale entra com a auth key da variável `TAILSCALE_AUTHKEY`.
Depois da entrada na tailnet, `--tailscale-ssh` ativa o SSH do Tailscale.

```bash
setupvibe server auto --profile remoto --tailscale-authkey "$TAILSCALE_AUTHKEY" --tailscale-ssh
```

Com o SSH só por chave, a primeira conexão precisa acontecer depois de a chave
estar no `authorized_keys`. O `ssh copy-id` faz isso antes de o módulo de
segurança entrar:

```bash
setupvibe server ssh copy-id deploy@203.0.113.10
```

## Conferir o servidor

Depois da instalação, a conferência é a mesma da desktop, com o binário da
edição server:

```bash
setupvibe server check
setupvibe server doctor
```

O `doctor` mostra o estado do Swarm, das portas publicadas, do firewall e dos
itens. O `report` gera o Markdown para uma issue quando a falha precisa de
investigação pelo suporte.

## Se algo der errado

| Sintoma | Exit code | O que fazer |
| --- | --- | --- |
| sessão gráfica sem confirmação | 2 `USAGE` em automação | revise o plano e passe `--confirm-security` |
| sudo pede senha sem terminal | 13 `SUDO_PASSWORD` | crie a regra com `user nopasswd` ou rode no terminal |
| `security remove` sem registro | 3 `CONFIG` | o módulo não foi aplicado por este binário; confira o estado à mão |
| parte dos passos falhou | 10 `PARTIAL` | leia o log e rode `doctor` |
| edição desktop já preparada | 2 `USAGE` | rode `self uninstall` antes de instalar a server |

## Próximo passo

O capítulo [Agentes de IA e MCP](08-agentes-e-mcp.md) mostra como um agente
consulta o estado do servidor e executa o SetupVibe por protocolo.

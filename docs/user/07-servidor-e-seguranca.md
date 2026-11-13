# Servidor e segurança

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
server roda só em Linux, em Ubuntu e Debian; em macOS o installer recusa com
11, `UNSUPPORTED_SYSTEM`.

As edições são exclusivas por máquina. Se a máquina já tiver a desktop
preparada, o `init` da server sai com 2 e pede o `self uninstall` antes da
troca.

## Usuário de trabalho

Como root, crie o usuário antes de qualquer outra etapa. O `user create` cria o
usuário, o home, a entrada no grupo de sudo (`wheel` no Arch e no Omarchy),
instala a chave pública em `authorized_keys` e, com `--nopasswd`, a regra de
sudo sem senha validada por `visudo -cf` antes de entrar no lugar.

```bash
setupvibe user create deploy --ssh-key ~/.ssh/id_ed25519.pub
```

A saída termina com o próximo passo: entrar como o usuário novo e rodar o `init`.
A regra sem senha é temporária quando criada pelo `auto`; quando criada por
`user create --nopasswd`, fica até você removê-la:

```bash
setupvibe user nopasswd deploy --remove
```

A regra fica em `/etc/sudoers.d/90-setupvibe-deploy`. Outras regras em
`/etc/sudoers.d/` não são tocadas.

## Módulo de segurança

`security apply` aplica o módulo compartilhado: UFW negando entrada, com SSH
liberado e, no servidor com `--swarm`, as portas do Swarm; o jail `sshd` do
fail2ban; atualizações automáticas de segurança em Debian e Ubuntu; e
sincronização de horário, com `--timezone` quando você quer fixar o fuso.

O SSH muda para login só por chave com `/etc/ssh/sshd_config.d/10-setupvibe.conf`
apenas quando o usuário atual já tem uma chave autorizada. O arquivo passa por
`sshd -t` antes de o serviço recarregar. O SetupVibe nunca liga autenticação por
senha.

```bash
setupvibe security apply --dry-run
setupvibe security apply --timezone America/Sao_Paulo
```

Antes da primeira mudança, o módulo registra em
`~/.setupvibe/state/security.json` se o UFW e o fail2ban estavam ativos e quais
arquivos dele já existiam. Esse registro é o que permite desfazer sem adivinhar:

```bash
setupvibe security remove
```

O `remove` apaga os arquivos que o SetupVibe criou, desliga o fail2ban e o UFW
quando eles estavam desligados antes e apaga o registro. Os pacotes continuam
instalados, e arquivos que existiam antes ficam como estavam. Sem registro, o
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
TOKEN=$(ssh deploy@10.0.0.1 setupvibe-server swarm token)
curl -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install-server.sh \
  | sh -s -- auto --user deploy --ssh-key ~/.ssh/id_ed25519.pub \
    --join "$TOKEN" --advertise-addr 10.0.0.2:2377
```

`swarm token manager` devolve o token de manager, e `--rotate` troca o token de
worker antes de imprimir. Com `--encrypted-network`, a rede overlay do Swarm
passa a cifrar o tráfego. O token entra por variável de ambiente ou pela option,
nunca pelo histórico do shell quando você usa `SETUPVIBE_SWARM_TOKEN`.

## Portainer e portas publicadas

Nas variantes remotas, o `auto` prende o Portainer a `127.0.0.1` e grava
`"ip": "127.0.0.1"` em `/etc/docker/daemon.json` quando o arquivo não tem
endereço. Docker escreve as próprias regras de iptables e não passa pelo UFW; uma
porta publicada sem esse cuidado ficaria aberta para a internet. Chegue ao
Portainer por túnel SSH ou pela tailnet.

O `doctor` lista contêiner que publica porta em todas as interfaces e mostra o
comando para prender a porta ao localhost. Para abrir só uma porta, publique com
`-p 127.0.0.1:PORTA:PORTA` e alcance pelo túnel ou pelo Tailscale.

## Acesso remoto

Três itens resolvem o acesso de trabalho: `openssh-server`, `tailscale` e
`mosh`. O Tailscale entra com a auth key da variável `TAILSCALE_AUTHKEY`, e
`--tailscale-ssh` liga o SSH do Tailscale depois que a máquina entra na tailnet.

```bash
setupvibe auto --profile remoto --tailscale-authkey "$TAILSCALE_AUTHKEY" --tailscale-ssh
```

Com o SSH só por chave, a primeira conexão precisa acontecer depois de a chave
estar no `authorized_keys`. O `ssh copy-id` faz isso antes de o módulo de
segurança entrar:

```bash
setupvibe ssh copy-id deploy@203.0.113.10
```

## Conferir o servidor

Depois da instalação, a conferência é a mesma da desktop, com o binário da
edição server:

```bash
setupvibe-server check
setupvibe-server doctor
```

O `doctor` mostra o estado do Swarm, das portas publicadas, do firewall e dos
itens. O `report` gera o Markdown para uma issue quando a falha precisa de
análise de outra pessoa.

## Se algo der errado

| Sintoma | Exit code | O que fazer |
| --- | --- | --- |
| execução como root sem `--user` | 12 `ROOT` | passe `--user` ou crie o usuário com `user create` |
| sudo pede senha sem terminal | 13 `SUDO_PASSWORD` | crie a regra com `user nopasswd` ou rode no terminal |
| `security remove` sem registro | 3 `CONFIG` | o módulo não foi aplicado por este binário; confira o estado à mão |
| parte dos passos falhou | 10 `PARTIAL` | leia o log e rode `doctor` |
| edição desktop já preparada | 2 `USAGE` | rode `self uninstall` antes de instalar a server |

## Próximo passo

O servidor está preparado e fechado. O capítulo [Agentes de IA e MCP](08-agentes-e-mcp.md)
mostra como um agente lê esse estado e executa o SetupVibe por protocolo, sem
depender de você copiar a saída do terminal.

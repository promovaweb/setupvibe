# Instalação automática

Preparar uma máquina à mão funciona uma vez. Na terceira vez, você já não
lembra qual item foi marcado no notebook, qual opção foi passada no servidor e
por que aquele runtime ficou numa versão diferente. O `auto` existe para esse
caso: ele percorre a instalação inteira sem perguntar nada e transforma o que
foi escolhido num passo que outro computador, um pipeline ou um agente pode
repetir.

A diferença em relação ao capítulo anterior é o ponto de partida. O `init` mais
`install` serve para uma máquina que você opera e quer entender passo a passo.
O `auto` serve para uma máquina que precisa ficar igual a outra, ou que não tem
ninguém para responder.

## O que o `auto` faz

O comando encadeia as etapas na ordem abaixo, e uma falha não interrompe as
seguintes.

| Etapa | O que acontece |
| --- | --- |
| fase root | com `--user`, cria o usuário de trabalho, instala a chave SSH e continua como ele |
| fase do usuário | confere `sudo -n`, disco, memória, locale, rede e relógio |
| seleção | monta os itens do perfil, aplica `--only` e `--exclude` e puxa as dependências |
| plano | inclui o `init`, cada item, o shell, o swap, o Portainer, a segurança, o Git, o Tailscale e o Swarm quando cabe |
| execução | segura `~/.setupvibe/run.lock`, grava o run log e segue com os passos restantes depois de uma falha |
| conferência | roda a verificação de cada item selecionado e grava o resultado em `~/.setupvibe/last-run.json` |
| reinício | com reinício pendente, sai com 20 ou agenda a retomada com `--reboot` |

Como root, `--user` é obrigatório: o `auto` cria o usuário, copia o binário
compilado para `/usr/local/bin` e se executa de novo com `runuser`. A regra de
sudo sem senha que ele cria no começo é removida no fim, salvo
`--keep-nopasswd`.

```bash
setupvibe auto --user deploy --ssh-key ~/.ssh/id_ed25519.pub
```

## Perfis, itens e dependências

Sem `--profile`, entra todo item compatível com o sistema. Itens gráficos ficam
de fora numa máquina sem interface, e itens que já vêm no sistema, como no
macOS e no Omarchy, são pulados.

Na edição desktop, o perfil `essencial` repete a seleção padrão da TUI, e o
`remoto` estende o essencial com `linger`, `mosh`, `tailscale`,
`openssh-server`, `swap`, `ufw`, `fail2ban`, `unattended-upgrades` e
`time-sync`. Na edição server existe o `essencial`, voltado à operação.

```bash
setupvibe auto --profile essencial --dry-run
setupvibe auto --profile remoto --exclude docker
```

`--only` acrescenta itens e `--exclude` tira. Nenhum dos dois substitui
dependências: se o item excluído é exigido por outro da seleção, ele entra
mesmo assim. Para ver os perfis e os itens de cada categoria antes de escolher,
use a documentação gerada da lista:

```bash
setupvibe docs inventory
```

O tópico `inventory` imprime cada perfil e uma tabela por categoria, com
versão, política, sistemas e flags de cada item.

## Respostas sem argumento

Cada resposta vem de uma option, depois de uma variável de ambiente e por
último de um arquivo `--config`. Tokens de Tailscale e de Swarm entram apenas
por variável de ambiente, que o run log mascara.

| Resposta | Option | Variável |
| --- | --- | --- |
| usuário de trabalho | `--user` | `SETUPVIBE_USER` |
| chave pública | `--ssh-key` | `SETUPVIBE_SSH_KEY` |
| identidade do Git | `--git-name`, `--git-email` | `SETUPVIBE_GIT_NAME`, `SETUPVIBE_GIT_EMAIL` |
| perfil | `--profile` | `SETUPVIBE_PROFILE` |
| ajustes na seleção | `--only`, `--exclude` | `SETUPVIBE_ONLY`, `SETUPVIBE_EXCLUDE` |
| fuso | `--timezone` | `SETUPVIBE_TIMEZONE` |
| Tailscale | `--tailscale-authkey` | `TAILSCALE_AUTHKEY` |
| Swarm | `--manager`, `--join`, `--advertise-addr` | `SETUPVIBE_SWARM_*` |
| reinício e retomada | `--reboot` | `SETUPVIBE_REBOOT` |

O restante das opções está no apêndice de CLI, gerado da documentação embutida.
A tabela acima cobre o que muda entre máquinas.

## Veja o plano antes de executar

Duas opções mostram o mesmo plano sem alterar a máquina. `--dry-run` imprime em
texto, e `--plan` grava JSON para comparar duas máquinas.

```bash
setupvibe auto --dry-run
setupvibe auto --plan /tmp/plano.json
```

O plano nomeia cada item, a versão fixada, os passos de sistema e o que foi
pulado. Numa máquina já preparada, a segunda execução mostra quase tudo como
pulado, porque cada passo carrega a condição que o dispensa.

## Acompanhe a execução

Em texto, cada etapa sai com `✓`, `-` ou `✗`, e o fechamento lista o que falhou
e o que foi pulado, inclusive partes de segurança. Com `--json`, cada evento
entra no stdout como uma linha NDJSON antes do envelope final, o que permite
acompanhar um provisionamento longo sem esperar o fim.

O resultado completo fica em `~/.setupvibe/last-run.json`, com item, versão,
status e a mensagem de cada falha. O log da execução fica em
`~/.setupvibe/logs/`, um evento por linha.

| Situação no fim | Exit code | Próxima ação |
| --- | --- | --- |
| tudo instalado e conferido | 0 | abrir um shell novo |
| parte dos itens falhou | 10 `PARTIAL` | ler o `last-run.json` e o log |
| reinício pendente | 20 `REBOOT_PENDING` | reiniciar ou repetir com `--reboot` |
| outra execução em andamento | 30 `LOCKED` | esperar o PID de `run.lock` |
| sudo pede senha sem terminal | 13 `SUDO_PASSWORD` | criar a regra com `user nopasswd` ou rodar no terminal |

Com `--reboot`, o Linux instala uma unit systemd de execução única que roda o
`auto` de novo depois do reinício. No Windows, o comando cria a tarefa
`SetupVibeAutoResume`, que roda com privilégio máximo e se apaga no fim.

## Repita a seleção em outra máquina

`config export` grava a seleção e a identidade do Git num arquivo sem segredo.
`config import` instala o que está nele. O arquivo é o mesmo que o `auto`
aceita em `--config`.

```bash
setupvibe config export selecao.json
setupvibe config import selecao.json
```

O arquivo exportado grava `profile: "none"`, para não inventar um perfil que não
existe. O `auto --config` lê esse valor como ausência de perfil: valem a lista
`only` do arquivo ou o inventory inteiro. Com `--profile`, valem o perfil
indicado e a lista `only`, não a seleção exportada sozinha.

## Provisionamento

Os exemplos abaixo baixam o binário com o installer e entregam o resto ao
`auto`. Nenhum segredo aparece na linha de comando.

**cloud-init**, num VPS que começa como root:

```yaml
#cloud-config
runcmd:
  - >-
    curl -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.sh
    | sh -s -- auto --user deploy
    --ssh-key "ssh-ed25519 AAAA... deploy@laptop"
    --timezone America/Sao_Paulo --profile remoto
```

**Ansible**, com a chave do Tailscale vindo do vault:

```yaml
- name: SetupVibe nas máquinas de desenvolvimento
  hosts: dev
  become: false
  environment:
    TAILSCALE_AUTHKEY: "{{ vault_tailscale_authkey }}"
  tasks:
    - name: Instalar e executar o auto
      ansible.builtin.shell: >-
        curl -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.sh
        | sh -s -- auto --profile remoto
      args:
        creates: "{{ ansible_env.HOME }}/.setupvibe/last-run.json"
```

O `creates` evita repetir a execução a cada rodada. Remova a linha quando quiser
que o `auto` rode de novo, porque ele é idempotente.

**Dockerfile**, com um recorte de itens:

```dockerfile
FROM debian:13
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates sudo locales \
 && sed -i 's/^# *en_US.UTF-8/en_US.UTF-8/' /etc/locale.gen && locale-gen
ENV LANG=en_US.UTF-8
RUN useradd -m -s /bin/bash dev && echo 'dev ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/dev
USER dev
RUN curl -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.sh \
    | sh -s -- auto --profile essencial --exclude docker --skip-network-check
```

Serviços que dependem de systemd, como Docker, servidor SSH e o módulo de
segurança, não se aplicam a uma imagem comum. Para esses, parta de uma imagem
com systemd.

**GitHub Actions**, com `--json` para as etapas seguintes lerem os eventos:

```yaml
jobs:
  setup:
    runs-on: ubuntu-24.04
    steps:
      - name: SetupVibe
        env:
          GITHUB_TOKEN: ${{ github.token }}
        run: |
          curl -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.sh \
            | sh -s -- auto --only node,python,uv,gh --profile essencial --json
```

O `GITHUB_TOKEN` mantém o mise abaixo do limite anônimo da API do GitHub.

## Proxy, CA e cache

`HTTPS_PROXY`, `HTTP_PROXY` e `NO_PROXY` valem também para os comandos que
rodam com sudo. Em rede corporativa, `--ca-file` acrescenta o bundle de CA para
Node, Bun, curl, Git e ferramentas Python. `--cache-dir` guarda os downloads do
mise, npm, uv, Homebrew e do próprio SetupVibe numa pasta que várias máquinas
podem compartilhar; o que já está no cache instala sem rede.

Numa máquina que fica sempre atrás da mesma CA ou do mesmo cache, grave os dois
em `~/.setupvibe/config.json` para não repetir a option:

```json
{ "network": { "caFile": "/etc/ssl/certs/corp.pem", "cacheDir": "/srv/setupvibe-cache" } }
```

A ordem de leitura é option, variável de ambiente e esse bloco.

## Próximo passo

A máquina ficou preparada sem uma única pergunta. O capítulo
[Itens e versões fixadas](03-itens-e-versoes.md) mostra o que fazer depois: ver
o que entrou, remover o que não serve, atualizar quando o binário muda e
conferir item por item.

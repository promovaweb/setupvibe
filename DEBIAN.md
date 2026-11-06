# DEBIAN.md — Contexto Linux e validação dos instaladores

Este arquivo registra o contexto operacional do SetupVibe em Debian, os padrões
de implementação dos scripts Unix e o procedimento de teste em containers.

## Regra de uso

Este é um contexto obrigatório para trabalhos que alterem, investiguem ou
testem `desktop.sh`, `server.sh`, arquivos de `conf/` usados no Linux ou a
documentação Linux.

Antes de atuar nesse escopo:

1. Leia `AGENTS.md` ou `CLAUDE.md`, conforme o agente em uso.
2. Leia este arquivo por completo.
3. Preserve as diferenças entre Desktop e Server descritas aqui.
4. Atualize este arquivo quando um teste real revelar uma nova limitação,
   causa raiz ou exigência de validação do Linux.

`AGENTS.md` e `CLAUDE.md` continuam sendo os contextos primários dos agentes.
Este arquivo é um contexto técnico suplementar da plataforma, não o contexto de
um terceiro agente.

## Escopo Linux do projeto

O SetupVibe oferece duas edições Unix executáveis em Debian:

- `desktop.sh`: instalador interativo de 14 etapas para desktop, WSL e
  ambientes completos de desenvolvimento.
- `server.sh`: instalador de 9 etapas, com opção não interativa `--yes`,
  concentrado em operações, Docker, shell, monitoramento e CLIs de IA.

Debian 12 ou mais recente é suportado. A validação descrita neste arquivo foi
feita em Debian GNU/Linux 13.6 `trixie`, arquitetura `amd64`.

## Modelo de privilégios

Os scripts podem ser iniciados por um usuário comum, por `sudo bash` ou
diretamente como root. A identidade que receberá ferramentas e configurações
deve ser mantida separada da identidade do processo:

- `REAL_USER`: usuário-alvo.
- `REAL_HOME`: diretório pessoal do usuário-alvo.
- `REAL_GROUP`: grupo primário do usuário-alvo.
- `user_do`: executa uma operação como `REAL_USER`.
- `sys_do`: executa somente a operação que exige privilégio administrativo.

Nunca use apenas `id -u` do processo para decidir onde instalar ferramentas do
usuário. Quando `sudo bash desktop.sh` é usado, o processo é root, mas o
destino continua sendo `REAL_USER`.

### `sudo` e `PATH`

O `sudo` normalmente aplica `secure_path` e pode remover diretórios como:

- `~/.local/bin`
- `~/.npm-global/bin`
- `~/.cargo/bin`
- `~/.bun/bin`

Exportar `PATH` no shell pai não garante que `user_do comando` encontrará um
executável instalado nesses diretórios. Para ferramentas gerenciadas pelo
script, use uma destas abordagens:

- caminho absoluto do executável;
- `user_do env PATH="$caminho_gerenciado:$PATH" comando`;
- um `bash -c` curto que defina explicitamente o `PATH`.

Depois da instalação, execute o comando ou `--version` usando o mesmo ambiente
que o usuário receberá.

Antes de repassar o `PATH` para serviços, remova entradas duplicadas preservando
a primeira ocorrência. Não basta impedir novas duplicatas: o ambiente herdado
de `sudo` ou do shell também pode chegar duplicado.

### Pacotes npm globais

Quando `REAL_USER` não é root, pacotes npm globais devem usar
`$REAL_HOME/.npm-global`, inclusive quando o instalador foi iniciado por
`sudo`. O fluxo correto é:

1. criar o diretório como `REAL_USER`;
2. configurar `npm config set prefix "$REAL_HOME/.npm-global"`;
3. executar o npm com `PATH="$REAL_HOME/.npm-global/bin:$PATH"`;
4. validar cada comando instalado com esse mesmo `PATH`.

Sem isso, o npm tenta alterar `/usr/lib/node_modules` como usuário comum e
falha com `EACCES`.

### Pacotes pip globais para o usuário

O Python fornecido pelo APT e pelo Homebrew é marcado como externamente
gerenciado conforme a PEP 668. Para um pacote solicitado como global, mas que
deve pertencer a `REAL_USER`, use o interpretador absoluto correspondente e
instale com `python -m pip --user --break-system-packages`; nunca use `sudo pip`.

Resolva o diretório dos executáveis com `python -m site --user-base` executado
via `user_do`, porque ele é `~/.local/bin` no Linux e
`~/Library/Python/X.Y/bin` no macOS. Adicione esse diretório ao `PATH`, valide o
import do pacote e execute a validação do CLI com a identidade e o `HOME` do
usuário-alvo.

## APT e repositórios

- Chaves APT pertencem a `/etc/apt/keyrings/`.
- Remova somente arquivos de repositório reconhecidamente gerenciados pelo
  SetupVibe.
- Não remova repositórios por busca genérica de conteúdo: eles podem pertencer
  ao usuário ou a outro gerenciador.
- Exclua entradas legadas antes de adicionar a fonte atual para evitar conflito
  de assinatura.
- O `server.sh` deve aguardar locks do APT, pois VMs recém-iniciadas podem estar
  executando `unattended-upgrades`.
- Para Debian instável (`forky`, `sid` ou `experimental`), o repositório Docker
  usa o codinome estável compatível definido pelo script.
- Em Debian, o Server usa `ansible-core`; não presuma que o metapacote
  `ansible` esteja disponível.

## Downloads e arquivos temporários

Downloads gerenciados devem:

1. usar HTTPS;
2. falhar em erros HTTP;
3. repetir de forma limitada erros transitórios de rede;
4. ter timeout de conexão, timeout total e tamanho mínimo;
5. rejeitar respostas HTML;
6. verificar SHA-256 quando o projeto publica ou fixa um checksum;
7. instalar o arquivo final com proprietário, grupo e modo explícitos.

Não baixe como root para um nome previsível em `/tmp` e depois execute
`user_do mv`. O sticky bit de `/tmp` permite que o usuário copie o conteúdo,
mas impede a remoção do arquivo criado por root; `mv` pode criar o destino e
ainda retornar erro ao tentar remover a origem.

Use `mktemp` e finalize com `sys_do install -o "$REAL_USER" -g "$REAL_GROUP"`.
O binário `ctop` deve ser verificado com o checksum correspondente à
arquitetura antes de ser instalado em `~/.local/bin/ctop`.

## Interatividade do Desktop

`desktop.sh` depende de um terminal real para:

- confirmar o roadmap;
- configurar nome e e-mail do Git quando ausentes.

O script deve validar `/dev/tty` antes de alterar o sistema e sair com erro
claro quando não houver terminal. Todo `read </dev/tty` também deve tratar
EOF ou perda do terminal. Sem essa proteção, o prompt de Git pode entrar em
loop infinito em automações sem TTY.

Em Docker, use `docker exec -it` para o Desktop. O Server pode usar execução
sem TTY com `--yes`.

## systemd e Docker dentro do container

Um container comum não representa adequadamente o instalador porque os scripts
habilitam e validam serviços como:

- `cron`;
- `docker`;
- `ssh`;
- `tailscaled`.

O teste de integração usa systemd como PID 1, container privilegiado e `tmpfs`
para `/run` e `/run/lock`.

Docker dentro de Docker não deve usar `overlay2` sobre o filesystem `overlay`
do container externo. Essa combinação falha e não representa um defeito do
SetupVibe. Somente no ambiente de teste aninhado, configure o daemon interno:

```json
{
  "features": {
    "containerd-snapshotter": false
  },
  "storage-driver": "vfs"
}
```

O driver `vfs` consome mais espaço e é mais lento, mas permite validar Docker
Compose e Portainer no container. Essa configuração não deve ser aplicada a
uma instalação Debian real.

## Receita reproduzível do container

Use uma imagem de teste descartável com um usuário comum e `sudo` sem senha:

```dockerfile
FROM debian:13

ENV container=docker

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        ca-certificates dbus systemd systemd-sysv sudo \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --shell /bin/bash tester \
    && printf '%s\n' 'tester ALL=(ALL) NOPASSWD:ALL' \
        > /etc/sudoers.d/tester \
    && chmod 0440 /etc/sudoers.d/tester

STOPSIGNAL SIGRTMIN+3
CMD ["/sbin/init"]
```

Crie o container com o repositório montado somente para leitura:

```bash
docker run -d \
    --name setupvibe-debian-desktop \
    --privileged \
    --security-opt label=disable \
    --tmpfs /run \
    --tmpfs /run/lock \
    -v "$PWD:/workspace:ro" \
    setupvibe/debian-systemd:13
```

Configure `vfs` no daemon Docker interno antes de testar a etapa DevOps. Em
seguida, execute:

```bash
# Desktop: TTY obrigatório
docker exec -it --user tester setupvibe-debian-desktop \
    sudo bash /workspace/desktop.sh

# Server: modo não interativo suportado
docker exec --user tester setupvibe-debian-server \
    sudo bash /workspace/server.sh --yes
```

O mount somente para leitura garante que o instalador não modifica
acidentalmente o checkout. Estado instalado e logs permanecem dentro do
container.

## Estratégia de validação

Uma mudança Linux não está validada apenas por `bash -n`. Use, conforme o
escopo:

1. `bash -n` para sintaxe.
2. `shellcheck` para problemas estáticos.
3. execução limpa no Debian suportado;
4. nova execução no mesmo container para testar idempotência;
5. resumo final com todas as etapas em `OK`;
6. validação dos comandos instalados;
7. validação dos serviços com `systemctl is-active`;
8. validação de Portainer com `docker ps`;
9. teste negativo do Desktop sem TTY.

Avisos de dependências opcionais do npm não são por si só falhas. O critério é
o exit code da instalação e a execução bem-sucedida dos comandos gerenciados.

Versões atuais do npm controlam scripts de instalação de dependências em
instalações globais. Aprove somente os pacotes nativos necessários com
`--allow-scripts`; não use a opção ampla que libera todos os scripts.

## Aprendizados da investigação de julho de 2026

### Desktop sem TTY

Uma execução sem `docker exec -it` revelou que `read </dev/tty` falhava e o
prompt de Git repetia indefinidamente. O Desktop agora encerra antes de alterar
o sistema quando não encontra terminal interativo.

### Prefixo npm incorreto

O Desktop verificava o UID do processo root em vez de `REAL_USER`. Como
resultado, PNPM, PM2, n8n e todos os CLIs de IA tentavam usar `/usr` e falhavam
com `EACCES`. A decisão agora é baseada no usuário-alvo e cada comando é
validado com o `PATH` gerenciado.

### `ctop` e sticky bit de `/tmp`

O download era criado por root em `/tmp/ctop` e movido por `REAL_USER`. O
destino podia ser criado, mas a remoção da origem falhava com
`Operation not permitted`. O download agora usa arquivo temporário único,
checksum SHA-256 e instalação com propriedade explícita.

### Starship e CLIs instalados no diretório do usuário

Starship foi instalado corretamente em `~/.local/bin`, mas `user_do starship`
não o encontrou por causa do `secure_path` do sudo. O script passou a usar o
caminho absoluto. O mesmo princípio se aplica a Skills CLI e PM2.

### Fórmula Homebrew desativada

A fórmula `tldr` foi desativada pelo Homebrew em 24 de outubro de 2025 por
falta de manutenção. O Desktop instala a implementação mantida `tlrc`, que
continua oferecendo o comando `tldr`. Reruns devem desinstalar a fórmula
legada antes de instalar `tlrc`, pois ambas fornecem o mesmo executável.

### Scripts nativos bloqueados pelo npm

O npm bloqueou o script de instalação de `better-sqlite3`, dependência nativa
do Agentlytics. O pacote JavaScript era adicionado, mas o comando falhava ao
carregar o binding SQLite. A instalação agora aprova somente
`better-sqlite3` e valida a criação de um banco SQLite em memória. O
Agentlytics não oferece uma opção `--version`; usá-la inicia o fluxo
interativo e não é uma validação segura para automação.

O mesmo mecanismo bloqueou o `postinstall` do Claude Code e pode afetar outros
CLIs gerenciados. Cada pacote direto deve receber sua própria aprovação
`--allow-scripts` no comando de instalação. O n8n também exige aprovação
explícita para sua lista revisada de dependências com bindings ou geração de
artefatos.

### Idempotência do Starship e do `PATH`

`starship preset` recusa sobrescrever `~/.config/starship.toml` sem `--force`.
Como esse arquivo é gerenciado pelo Desktop, o rerun deve aplicar o preset com
essa opção.

Cada etapa adicionava novamente os mesmos diretórios ao `PATH`, o que gerava
uma variável enorme na unidade systemd do PM2. Diretórios gerenciados devem ser
inseridos somente quando ainda não estiverem presentes, e o caminho completo
deve ser deduplicado antes de ser fornecido ao PM2.

O gerador de startup do próprio PM2 acrescenta caminhos de sistema ao valor
recebido e pode reintroduzir duplicatas. No Linux, um drop-in systemd gerenciado
pelo SetupVibe deve sobrescrever o ambiente efetivo do serviço com o `PATH`
normalizado e executar `systemctl daemon-reload`.

### Falhas transitórias em downloads

Uma repetição completa chegou à etapa final e falhou ao baixar
`ecosystem.config.js` do GitHub. Downloads remotos são pontos de integração,
portanto uma resposta transitória não deve invalidar uma instalação longa sem
novas tentativas. O helper compartilhado agora exige HTTPS, aplica timeouts de
conexão e total e repete erros de transferência de forma limitada.

### PM2 e systemd

`pm2 startup systemd` executado como usuário comum apenas imprime o comando
administrativo necessário e retorna erro. A criação da unidade deve passar
por `sys_do`, com o caminho absoluto do PM2 disponível no `PATH`; operações
de estado como `pm2 save` continuam executando como `REAL_USER`.

### Tailscale em containers

Scripts de pacote podem respeitar `/usr/sbin/policy-rc.d` e instalar o
Tailscale sem iniciar o serviço. A etapa Linux deve executar e validar
explicitamente `systemctl enable --now tailscaled`.

### Resultado da execução

O `server.sh --yes` concluiu as 9 etapas no Debian 13, com Docker, Portainer,
Tailscale, SSH e cron ativos. A primeira execução limpa do Desktop reproduziu
as falhas acima. A primeira execução de regressão confirmou as correções de
npm, `ctop` e Starship e revelou os casos adicionais de migração `tldr`,
scripts nativos do npm e privilégios do PM2.

A execução integral final e idempotente do `desktop.sh` concluiu as 14 etapas
com `OK`. Docker, cron, SSH, Tailscale e `pm2-tester` ficaram ativos; Portainer
ficou em execução na porta HTTPS 9443; e a restauração do Agentlytics pelo
serviço PM2 foi testada depois de encerrar manualmente o daemon. O ambiente
efetivo do serviço ficou sem caminhos duplicados. Também passaram as
validações de versões dos ecossistemas, CLIs de IA, `tldr` via `tlrc`, checksum
e propriedade do `ctop`, binding SQLite do Agentlytics e saída antecipada do
Desktop sem TTY.

## Validação PostgreSQL da geração Bun

No Debian 13 x64 com Docker 29.7.2, o instalador v2 criou PostgreSQL 18 por
digest, com arquivo de senha 0600 e volume exclusivo. A conexão TCP autenticou
e os dados persistiram após reinício. O teste removeu seus recursos.

O entrypoint da imagem inicia um servidor temporário acessível por socket.
`pg_isready` sem host pode retornar sucesso antes da disponibilidade TCP.
O teste v2 usa `pg_isready -h 127.0.0.1` antes de autenticar com psql.
Essa verificação ainda não está integrada ao controle de serviços da TUI.

O teste negativo recusou senha incorreta após o plano definir autenticação
host SCRAM em POSTGRES_INITDB_ARGS e POSTGRES_HOST_AUTH_METHOD. A configuração
local por socket permanece trust dentro do container. Uma conexão bem-sucedida
sem esse teste negativo não comprova autenticação por senha.

## Validação Portainer Server da geração Bun

No Debian 13 x64, o instalador v2 criou Portainer Server por digest em container
e volume exclusivos. A API HTTPS respondeu e preservou a identidade da
instância após reinício. Os recursos do teste foram removidos.

O socket Docker montado era um proxy restrito a GET/HEAD de ping, versão e
info. Métodos de escrita e upgrades foram recusados; uma chamada de criação
de container recebeu HTTP 403. O teste não comprova administração completa
do daemon, configuração de administrador, Agent ou Swarm.

## Validação Swarm da geração Bun

O teste `tests/swarm-integration.test.ts` inicializou um manager real em daemon
Docker-in-Docker descartável, com imagem oficial por digest. O ambiente interno
usou vfs, rede externa desabilitada, socket Unix próprio e nenhum mount do host.
Não houve publicação de portas. O container privilegiado foi usado apenas no
teste, conforme o procedimento de Docker aninhado.

Cluster e nó mantiveram suas identidades após reiniciar o daemon interno. A
reexecução retornou `current`; outro banco não pôde adotar o cluster. O estado
Swarm do daemon do host permaneceu igual. Container e volumes do teste foram
removidos. Essa execução valida manager único em loopback, sem comprovar
comunicação entre nós, quórum ou tráfego overlay.

## Validação do coletor Bun com user manager real

O teste `tests/collector-systemd-integration.test.ts` usa a imagem construída
por `tests/fixtures/systemd/Dockerfile`, com Debian 13 por digest. O container
tem systemd como PID 1 e inicia `user@1000.service`. Os comandos do produto
rodam como usuário 1000 com HOME, XDG_RUNTIME_DIR e endereço do bus de sessão
explícitos, todos internos ao container.

Os binários compilados da CLI e do coletor foram copiados para o ambiente.
A execução verificou unidade habilitada e ativa, produção de métricas,
reinício automático após SIGKILL do processo principal e parada sem exclusão
dos dados. Após a falha, exigiu novo PID e avanço do cursor de amostras. O ambiente não monta arquivos nem sockets do host,
não publica portas e não tem rede externa. Container e volumes próprios são
removidos no encerramento; a imagem local de teste permanece no cache.

O mesmo teste cobre agora o coletor dedicado e `setupvibe --collector`, com
30 verificações no total. No modo embutido, o ambiente recebe somente o
executável compilado principal, sem Bun instalado nem binário dedicado do
coletor. A unidade usa `--collector` antes do intervalo; comandos de gravação
e controle recebem `--embedded`. Os dois modos passaram na coleta,
reinicialização após falha e parada com preservação das métricas.

A homologação passa agora por `preview-install-collector` e `install-collector`,
começando sem o diretório da unidade. A prévia não cria esse diretório; a
instalação o cria, registra a unidade e ativa o user service. Uma segunda
instalação reutiliza a unidade registrada. Os modos dedicado e embutido
passaram com 32 verificações, sem recursos de teste restantes no host.

## Docker APT na geração Bun

Docker também possui fornecedor APT na geração Bun. O cenário real em Debian
13 x64 passou com 22 verificações, incluindo manifesto e prévia que anuncia
Docker ausente como dependência. O pacote docker-cli é separado no Debian 13
e precisa ser instalado explicitamente ao usar --no-install-recommends.
O verificador exige unidade ativa, daemon local e integridade dos pacotes.
Vfs e bridge desabilitada foram usados somente no contêiner aninhado.
Consulte [Docker Engine v2](docs/v2/DOCKER.md) para comandos e limites.

## Git APT na geração Bun

A v2 oferece git-info, preview-git e install-git para Debian/Ubuntu.
O fornecedor preserva Git externo, instala somente após confirmação e
registra a versão global apenas depois de verificar pacote e executável.
A remoção global ainda não está implementada. Consulte o contrato e os
comandos em [Git por APT](docs/v2/DESENVOLVIMENTO.md#git-por-apt).

O teste real em Debian 13 x64 parte sem Git nem índices APT. Ele passou na
instalação e reexecução do pacote 1:2.47.3-0+deb13u1, preservando .gitconfig
e reconhecendo uma instalação externa sem criar estado. O teste não executa
APT no host nem usa volumes ou portas do host. O verificador roda como
processo principal do contêiner; assim, dispensa docker exec quando o /tmp
do daemon está cheio.

Imagens mínimas excluem documentação, traduções e metadados lintian.
O fornecedor aceita essas ausências específicas na verificação do dpkg,
mas recusa executáveis ausentes ou qualquer arquivo com conteúdo alterado.
O resultado não homologa sudo ou outras distribuições e arquiteturas.

## Distribuição Bun e OpenTUI sem dependências do projeto

O empacotador de release produz Linux glibc x64 baseline e ARM64, além dos
alvos macOS. O teste de distribuição executou o artefato Linux x64 em
Debian 13 com TTY, sem Bun, fontes ou node_modules no contêiner. A TUI abriu
e encerrou com Ctrl+Q. O ambiente não tem rede nem mounts ou portas do host.

Esse teste comprova o carregamento dos assets OpenTUI embutidos nessa
plataforma; não homologa todos os instaladores ou outras versões Debian.
Comandos de build, metadados e teste estão em
[Artefatos de distribuição](docs/v2/DESENVOLVIMENTO.md#artefatos-de-distribuição-por-plataforma).

## Bootstrap por HTTPS na v2

O build gera install.sh com versão e hashes fixados. O teste real em Debian 13
x64 confirmou instalação e reexecução, preparação de curl/ca-certificates por
--install-dependencies, verificação TLS e recusa de checksum ou bytes alterados.
Os comandos externos, diretórios ocupados e ancestrais com links foram
preservados ou recusados. SIGTERM durante download encerrou curl, limpou o
staging e o lock próprios e manteve current apontando para a versão anterior.

O launcher Server conservou o catálogo restrito sem exigir --server em cada
chamada. Os 32 checks internos usam HTTPS local com CA de teste, sem ignorar
a verificação de certificados. Não houve instalação ou APT no host.
Detalhes, parâmetros e limites estão em
[Bootstrap](docs/v2/DESENVOLVIMENTO.md#bootstrap-gerado-com-hashes-fixados).

Esse teste não cobre sudo, falha elétrica/SIGKILL, outras distribuições ou
arquiteturas. A integração com o atualizador compartilha recibos e journal;
recuperação automática de lock após SIGKILL continua pendente.

## PATH em novos shells Bash e Zsh

O bootstrap agora integra PATH por padrão, com --no-path para pular e --shell
para escolher Bash/Zsh. O executável verificado implementa preview-path,
install-path, preview-remove-path e remove-path. Perfis têm backup privado e
blocos registrados. A instalação acrescenta bytes, sem substituir o inode;
a remoção mantém texto externo e preserva modo, dono, grupo, ACLs e atributos
estendidos com cópia nativa, validada no Linux como root e usuário comum.
A execução correspondente no macOS continua pendente.

O primeiro teste em Docker revelou que abrir um perfil da imagem para escrita
pode provocar copy-up no OverlayFS. A verificação passou a conferir os bytes
pelo descritor novo e compará-lo ao caminho atual, mantendo a recusa de
conteúdo alterado. O bootstrap passou em Debian 13 x64 com 45 verificações,
incluindo resolução em Bash de login/interativo, reexecução, --no-path e
remoção sem afetar a instalação Server. Não houve edição de perfis do host.

Testes locais exercitaram Bash e Zsh, ZDOTDIR, nomes com espaços e aspas,
concorrência, perfis modificados após a prévia e retomada de operações
canceladas. Detalhes e limites:
[PATH persistente](docs/v2/DESENVOLVIMENTO.md#path-persistente-e-remoção-dos-blocos-registrados).

## Atualização do próprio executável e metadados de perfis

A CLI oferece preview-update/update e preview-rollback/rollback.
A consulta exige versão fixa no release HTTPS oficial; aplicação exige
--confirm. Marcador, launcher e hashes precisam corresponder ao bootstrap.
O mesmo journal participa de trocas de versão feitas pelo bootstrap e pela
CLI. rollback usa o artefato anterior em cache e não precisa de rede.

O teste compilou duas versões em cópia descartável e passou com 39 verificações
em Debian 13 x64. Cobriu certificado não confiável, prévia sem escrita,
cancelamento da consulta, checksum inválido, preservação da versão anterior,
edição Server, journal pendente e rollback depois de desligar o servidor.
Também conferiu troca pelo bootstrap seguida de rollback pela CLI.
Não houve instalação de ferramentas ou alteração de perfis no host.

O teste separado de ACL/xattr passou com 16 verificações como root e tester,
usuário 1000 do contêiner. A remoção de PATH manteve os metadados e o conteúdo.
Uma falha simulada de cp preservou o arquivo original; restaurar a ferramenta
permitiu retomar a remoção. Linux usa atributos explícitos no cp e recusa
publicar a substituição quando essa cópia falha.

Detalhes e comandos:
[Atualização e rollback](docs/v2/DESENVOLVIMENTO.md#atualização-e-rollback-do-próprio-setupvibe).

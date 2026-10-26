# Docker, Swarm e serviços

> Contrato implementado na branch v2, com testes isolados em Debian 13.

## Runtime e plataforma

No Linux, `docker install` configura o repositório oficial correspondente a
Debian 12/13 ou Ubuntu 24.04 e instala Engine, CLI, `containerd.io`, Buildx e
Compose. Arquivos novos usam nomes `setupvibe-docker`; fontes oficiais
existentes são preservadas. Pacotes conflitantes são identificados e a
operação é recusada, sem desinstalar Docker, containerd ou runc existentes.

APT exige root ou `sudo -n`. Quando systemd está ativo, o adaptador habilita
e inicia Docker. O usuário precisa ter acesso ao socket; a v2 não altera
silenciosamente grupos ou permissões do socket. Em containers sem systemd,
a instalação do pacote e a execução do daemon são condições diferentes.
`docker verify` comprova o executável; `service list` comprova acesso ao daemon.

No macOS, o catálogo seleciona o cask Docker Desktop e o planejador inclui
Homebrew. Licença, autorização inicial e disponibilidade do daemon pertencem
ao Docker Desktop. Esta plataforma ainda não foi homologada neste ambiente.

## Catálogo de serviços

| Serviço | Desktop | Server | Imagem | Portas padrão |
| --- | --- | --- | --- | --- |
| Portainer CE Server | Sim | Sim | `portainer/portainer-ce:lts` | 9443 |
| Portainer Agent tradicional | Sim | Sim | `portainer/agent:lts` | 9001 |
| PostgreSQL | Sim | Não | `postgres:17` | 5432 |
| Redis | Sim | Não | `redis:7` | 6379 |
| Mailpit | Sim | Não | `axllent/mailpit:v1` | 8025 e 1025 |

Templates JSON embarcados vivem em `catalog/templates/`. As tags delimitam
o canal ou a geração; o estado registra também o ID real da imagem.
Não há Prometheus, Grafana ou stacks extras na edição Server.

Serviços são compartilhados por host, com nomes `setupvibe-<componente>`.
A seleção Portainer usa um único papel por instalação. Não converter Server
em Agent durante `update`; a alteração de topologia exige outro procedimento.
`--option deployment=auto` escolhe a topologia Swarm quando o nó participa
de um cluster; a implantação exige manager. `standalone` e `swarm` permitem
seleção explícita. Instalações existentes não são migradas automaticamente.

## Endereços e portas

O bind padrão é `127.0.0.1`. `--option bind=0.0.0.0` publica nas interfaces
do host e precisa aparecer na revisão do plano. Para uso por SSH, um túnel
permite alcançar a porta local. O Agent precisa de conectividade a partir do
Portainer Server; o bind local isoladamente não oferece conexão remota.

A prévia verifica portas reservadas por containers e a disponibilidade de bind
local. O daemon confere novamente ao criar; outra aplicação pode ocupar a porta
entre essas etapas. Portas internas não publicadas aparecem com valor `null`.
Portainer Server publica somente 9443; 8000 e 9000 não são publicados.

```bash
setupvibe portainer install --role server --dry-run --output json
setupvibe portainer install --role agent --option bind=0.0.0.0 --yes
setupvibe component install postgresql --option port=15432 --yes
setupvibe component install redis --dry-run
setupvibe component install mailpit --option port=18025 --option smtp-port=11025 --yes
```

## Persistência e credenciais

Volumes `setupvibe-<componente>-data` têm labels de propriedade. Um volume
existente sem essas labels é preservado e impede a reutilização automática.
Atualizar ou controlar um container não remove seu volume.

PostgreSQL recebe uma senha aleatória em arquivo privado, modo 0600, dentro
de `<data-dir>/secrets/postgresql-password`. O container recebe apenas o mount
e `POSTGRES_PASSWORD_FILE`. A senha não aparece no catálogo, SQLite, plano,
argumentos de subprocessos ou respostas públicas. O arquivo é reutilizado
nas atualizações. Faça backup seguro desse arquivo junto dos dados necessários.

Redis é um serviço local sem senha, com AOF habilitado. Mailpit persiste o
banco em volume. Não publique essas portas em outras interfaces sem configurar
as proteções adequadas ao ambiente. O SetupVibe não gera contas ou autenticação
administrativa do Portainer. A inicialização da conta e o token de setup, quando
exigido pela versão, seguem o fluxo oficial do produto.

## Descoberta e propriedade

`service list` lista containers existentes e, em um manager Swarm, os serviços
do cluster. Campos públicos incluem IDs, imagem, estado, saúde, portas, mounts,
papel e limites configurados. Variáveis de ambiente e labels arbitrárias não
são retornadas. Serviços Swarm gerenciados informam capacidades próprias.
A consulta inclui stacks, redes, volumes e o endpoint Docker usado.

Controle exige labels `dev.setupvibe.managed=true` e componente reconhecido,
edição compatível e contexto local por socket Unix. Recursos externos podem
ser consultados, mas não são adotados por `start`, `stop`, `restart` ou `update`.
Se houver múltiplas instalações de um componente, a seleção é recusada.

O cliente respeita o contexto Docker e negocia API entre 1.41 e 1.53,
considerando a versão mínima informada pelo daemon. Contextos TCP/SSH não são
aceitos para mutações de serviços ou Swarm. Não há fallback para outro daemon.

## Saúde, controle e logs

PostgreSQL usa `pg_isready`; Redis usa `redis-cli ping`; Mailpit usa `readyz`.
A instalação aguarda saúde positiva desses componentes. Portainer sem
healthcheck precisa permanecer em execução; `health: null` não significa
"saudável". O endpoint e a configuração inicial exigem verificação adicional.

```bash
setupvibe service list --output json
setupvibe service inspect setupvibe-postgresql --output json
setupvibe service stop setupvibe-redis --dry-run
setupvibe service restart setupvibe-redis --yes
setupvibe service logs setupvibe-redis --tail 100
setupvibe service logs setupvibe-mailpit --since 2026-10-22T00:00:00Z
setupvibe service logs setupvibe-mailpit --follow --output ndjson --timeout 3600
```

`--tail` aceita 1 a 10000. `--since` exige RFC3339. `--follow` envia eventos
`log` em NDJSON ou texto, sem acumular o histórico em memória. JSON com um único
resultado não aceita follow. Timeout retorna 6; cancelamento retorna 130.
Logs passam pelo filtro de formatos usuais de credenciais; isso não substitui
a responsabilidade da aplicação de evitar segredos em mensagens arbitrárias.

Cada controle autorizado registra ação, destino, resultado e horário. A
reconciliação consulta o adaptador novamente, em vez de tratar ID de container
como caminho de arquivo.

## Atualização e recuperação

1. Confirmar proprietário, edição e acesso ao daemon.
2. Consultar manifesto remoto por JSON para descobrir atualização disponível.
3. Baixar a imagem selecionada sem mudar a configuração persistida.
4. Preservar Env, mounts, portas, aliases de rede e estado parado/em execução.
5. Parar e renomear o container antigo temporariamente.
6. Criar o substituto e, se estava ativo, iniciar e conferir saúde.
7. Remover somente o container antigo, sem `--volumes`.

Se criação, início ou saúde falhar, o executor remove o substituto e tenta
restaurar nome e execução do anterior. A resposta informa se a restauração
falhou. Interrupção abrupta do processo ou queda do host pode deixar um
container de backup; a operação fica `unknown` e a seleção ambígua exige
revisão. Isso não é uma transação atômica entre Docker e SQLite.

`update` preserva as configurações atuais e recusa novas opções de porta ou
papel. Não migra automaticamente PostgreSQL para uma nova versão principal.
A descoberta compara digest remoto com referências locais sem executar pull;
a resposta mantém a imagem em execução para diferenciar cache local e serviço.

## Swarm

```bash
setupvibe swarm status --output json
setupvibe swarm init --advertise-addr 192.0.2.10 --dry-run
setupvibe swarm init --advertise-addr 192.0.2.10 --yes
setupvibe swarm join --manager 192.0.2.10:2377 --dry-run
cat /caminho/privado/token | setupvibe swarm join --manager 192.0.2.10:2377 --token-stdin --yes
```

O endereço de anúncio precisa ser IP explícito. O gerenciador usa IP:porta.
Join aceita token somente por stdin; a API local recebe o JSON por pipe, sem
incluir token em argv ou histórico. Um nó já associado é preservado. A v2 não
executa `leave --force`, não recria o cluster e não imprime join tokens.

## Topologia Portainer no Swarm

O modelo usa stack `setupvibe-portainer`, rede overlay, Agent global nos nós
Linux e Server com uma réplica. O Server fica fixado pelo ID do manager de
origem para manter acesso ao volume local. Isso não transforma o volume em
armazenamento distribuído. Mudança de manager exige migração explícita dos dados.

No papel Server, a porta publicada atende o Server e a comunicação com os Agents
ocorre na rede overlay. No papel Agent, publica-se 9001 por nó para conexão de
um Server externo. Swarm não oferece bind loopback equivalente ao container
standalone nesse modelo; exige-se `--option bind=0.0.0.0` explicitamente.
O plano verifica colisões com portas, serviços e redes existentes.

`service stop` reduz réplicas a zero e registra o número anterior no estado.
`service start` restaura esse número. `service restart` solicita atualização
das tasks pelo serviço. Um serviço global oferece restart, mas recusa start/stop
por réplicas, informando essa limitação em capabilities. Containers pertencentes
a uma task Swarm não podem receber controle isolado pela v2.

Atualização usa a especificação existente e a política de rollback do Swarm.
Implantação e atualização resolvem o manifesto remoto e fixam o digest SHA-256
na especificação; falha nessa consulta impede uma alteração sem versão fixada.
O executor espera tasks da revisão desejada e informa pausa ou reversão, sem
declarar sucesso somente porque o pedido foi aceito. O Agent global verifica
o conjunto de nós Linux ativos e prontos. Queda de comunicação pode deixar
uma operação com resultado desconhecido; consulte o estado real do cluster.

A [topologia oficial do Portainer](https://docs.portainer.io/start/install-ce/server/swarm/linux)
orienta a separação Server/Agent. O modelo da v2 publica somente a porta
necessária e fixa a localização do volume; não habilita Edge ou HTTP legado.

## Condições de sucesso e verificação

O teste real `tests/integration/docker.mjs` usa um container Debian 13
privilegiado descartável para executar um segundo daemon. Monta somente o
binário sob teste, em modo somente leitura, e não monta o socket do host.
Containers, volumes e Swarm de teste ficam dentro desse daemon e são removidos
junto do ambiente descartável. Não execute esse teste em um runner sem
permissão para Docker-in-Docker.

Primeira execução: Engine 29.9.2 instalado pelo repositório oficial; PostgreSQL,
Redis e Mailpit saudáveis; Portainer em execução. O dado Redis sobreviveu à
atualização. Start/stop/restart, logs, recusa de controle externo, escopo Server
e inicialização Swarm passaram. Os testes controlados verificam ainda rollback,
remoção de credenciais, timeout de follow e token ausente em argv/histórico.

A descoberta de recursos externos não autoriza controlar stacks externas.
Portainer rootless é recusado por precisar de mounts próprios. macOS,
ARM64 e ingresso entre hosts distintos continuam no conjunto de homologação.

## Referências oficiais

- [Docker no Debian](https://docs.docker.com/engine/install/debian/).
- [Docker no Ubuntu](https://docs.docker.com/engine/install/ubuntu/).
- [Docker Engine API](https://docs.docker.com/reference/api/engine/version/v1.53/).
- [Portainer CE Server](https://docs.portainer.io/start/install-ce/server/docker/linux).
- [Portainer Agent](https://docs.portainer.io/admin/environments/add/docker/agent).

O ensaio Swarm de um nó também implantou Server e Agent global, descobriu a
stack e a rede overlay, reduziu e restaurou a réplica do Server, consultou logs
do serviço e executou atualização. O teste usa um manager isolado; não comprova
failover ou conectividade de vários hosts. Colisões de porta e senha ausente das
respostas também foram confirmadas na integração real.

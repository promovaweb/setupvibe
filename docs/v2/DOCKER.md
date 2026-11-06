# Docker Engine no SetupVibe 2

Estado em 4 de novembro de 2026: fornecedor APT Linux implementado e testado
como root em Debian 13 x64. Usa `docker.io` da distribuição. Não adiciona
repositório Docker CE nem migra engines existentes. Debian 12, Ubuntu 24.04,
sudo, ARM64 e macOS ainda precisam de homologação ou implementação.

## Instalação e propriedade

O executor atualiza índices e fixa o candidato antes de instalar. No Debian 13,
o cliente separado `docker-cli` também recebe versão explícita. O APT exige
assinaturas, preserva conffiles e recusa remoção de outros pacotes. Depois,
habilita e inicia docker.service. Sucesso exige versão do pacote, integridade
pelo dpkg, unidade ativa e habilitada e resposta do daemon local.

O registro SQLite usa ID docker e localização /apt/docker.io. Sem registro,
pacote, cliente, binário, socket, dados ou configuração anteriores são externos.
O SetupVibe os preserva sem adotar propriedade. DOCKER_HOST ou DOCKER_CONTEXT
explícitos impedem instalação. A verificação usa o socket local explicitamente.

Um systemd de sistema disponível é obrigatório antes de executar APT.
O banco permanece no usuário original. Root ou sudo não interativo é usado
somente nas operações administrativas. Não altera grupos, permissões do
socket, contextos ou configuração do daemon. Usuários sem acesso ao socket
precisam resolver esse acesso antes de criar serviços. O percurso com sudo
continua sem homologação. A remoção global ainda não está integrada.

## docker-info

Consulta pacotes e sinais locais sem criar banco, instalar ou iniciar serviços.
Não aceita argumentos posicionais. Aceita --json e --server; a edição não
altera o pacote consultado. Retorna installed, candidate, client,
clientCandidate, binary e occupied. Ausências são null. Índices APT ausentes
podem deixar candidatos null. Falha da consulta não é tratada como ausência.
Exige ferramentas dpkg/APT no Linux local.

```bash
bun src/cli.ts docker-info
bun src/cli.ts docker-info --json
bun src/cli.ts docker-info --server
bun src/cli.ts docker-info --server --json
SETUPVIBE_STATE_DIR="$HOME/.local/state/setupvibe-inspection" bun src/cli.ts docker-info --json
```

O quinto exemplo demonstra que escolher outro diretório de estado não o cria.

## preview-docker

Uso: preview-docker [package-version] [--server] [--json]. A versão opcional
tem padrão candidate. Versão explícita aceita epoch e revisão Debian. latest
é recusado. Não cria banco, lock ou histórico, nem executa as etapas propostas.

Retorna action, version, clientVersion, status, steps, executed: false e sudo.
As ações são install, awaiting-index, external ou current. Pode consultar
sudo e, para registro já instalado, verificar pacote, unidade e daemon.

```bash
bun src/cli.ts preview-docker
bun src/cli.ts preview-docker candidate --json
bun src/cli.ts preview-docker --server --json
bun src/cli.ts preview-docker 26.1.5+dfsg1-9+deb13u1 --json
SETUPVIBE_STATE_DIR="$HOME/.local/state/setupvibe-review" bun src/cli.ts preview-docker candidate --json
```

A versão fixa é um exemplo Debian 13; disponibilidade depende dos índices.
Engine externo com versão divergente é preservado e recusado.

## install-docker

Uso: install-docker [package-version] --confirm [--server] [--json|--events].
Versão e validação são iguais à prévia. Sem --confirm, falha antes de consultar
ou criar estado. --events emite linhas JSON de progresso e resultado final.
SIGINT/SIGTERM cancelam pelo executor, que aguarda os processos terminarem.

Repete a prévia sob lock compartilhado de pacotes e registra somente após
verificação. Retorna status, operationId, executable, versão e managed quando
aplicável. External não cria banco. Falha não reverte pacotes já gravados pelo
APT; estado parcial exige inspeção. Atualização pode reiniciar o daemon e
afetar containers existentes. Revise as etapas antes de confirmar.

```bash
bun src/cli.ts install-docker --confirm
bun src/cli.ts install-docker candidate --confirm --json
bun src/cli.ts install-docker --server --confirm --json
bun src/cli.ts install-docker 26.1.5+dfsg1-9+deb13u1 --confirm --events
SETUPVIBE_STATE_DIR="$HOME/.local/state/setupvibe-owned" bun src/cli.ts install-docker --confirm --json
```

Trocar o diretório de estado depois de instalar não adota o pacote no banco novo.

## Resources e manifesto

Em Resources, selecione Docker, pressione V, informe candidate ou uma versão
e revise. C abre a confirmação INSTALL. Execute action usa o mesmo executor.
O manifesto schemaVersion 1 aceita kind application, id docker e version.
O catálogo ordena Docker antes dos serviços quando ambos estão selecionados.
Ordem inversa no conjunto é recusada antes de chamar instaladores.

```json
{
  "schemaVersion": 1,
  "resources": [
    {"kind": "application", "id": "docker", "version": "candidate"}
  ]
}
```

preview-install arquivo.json --install-dependencies anuncia Docker ausente
como dependência. Configuração, credenciais e portas são conferidas antes de
instalar. install arquivo.json --confirm --install-dependencies prepara o
engine e repete a consulta ao daemon antes de criar cada serviço. Falha ou
cancelamento da dependência impede criar serviços. Docker externo indisponível
exige restaurar acesso, sem substituir seu engine automaticamente.

Na TUI iniciada com --install-dependencies, a revisão informa que Docker será
preparado. Também funciona selecionando e configurando Docker junto ao serviço.
O container é criado parado, para ser iniciado em Services.

## Verificação

O cenário real usa systemd como PID 1, sem socket, mounts ou portas do host.
Vfs e bridge desabilitada são exclusivos do teste. Os 22 checks cobrem prévia
sem estado, confirmação, manifesto, engine/cliente, daemon, reexecução, bytes
alterados e preservação de Docker externo.

```bash
bun run build
SETUPVIBE_DOCKER_ENGINE_INTEGRATION=1 SETUPVIBE_DOCKER_ENGINE_IMAGE=setupvibe-test-systemd:debian13 bun test tests/docker-engine-integration.test.ts
```

SETUPVIBE_DOCKER_ENGINE_BINARY permite fornecer outro executável compilado.
O teste remove seu contêiner e volumes próprios. Não comprova sudo, bridge,
múltiplos nós Swarm, atualização entre versões ou macOS.

Referências: [pacote Debian](https://packages.debian.org/trixie/docker.io),
[pacote Ubuntu](https://packages.ubuntu.com/noble/docker.io) e
[distribuição do Docker Engine](https://docs.docker.com/engine/install/).

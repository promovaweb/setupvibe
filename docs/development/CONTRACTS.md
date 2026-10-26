# Contratos técnicos da versão 2

> Escolhas de implementação de 22/10/2026. Não constituem homologação.

## Plataforma

Rust 2024, MSRV 1.94, interfaces CLI/TUI e coletor em processo independente
via `setupvibe collector run`. O lockfile fixa dependências resolvidas.

Alvos iniciais: Debian 12/13 e Ubuntu 24.04 em x86_64/aarch64; macOS 14+
em x86_64/aarch64. Outros sistemas serão recusados para mutações até existir
adaptador e teste. Docker Desktop é o runtime escolhido para macOS.
O host disponível é Debian 13 x86_64. Bootstrap e binários foram testados em containers Debian 12/13 e Ubuntu 24.04 amd64. macOS e ARM ainda exigem execução nos respectivos sistemas.

## Edições e preservação

Server aceita somente Docker Engine/Swarm, Portainer Server/Agent, Git, gh,
Tailscale e coletor nativo. Não inclui assistentes, Ansible, Herdr, PostgreSQL,
Redis, Mailpit ou stacks adicionais de monitoramento.

Desktop inclui ferramentas de desenvolvimento, assistentes e serviços locais.
Cada instalação tem um gerenciador proprietário observado. A v2 não remove
componentes legados do computador nem os adota automaticamente. A retirada
do legado autorizada pelo usuário se refere aos arquivos desta branch.

## Serviços e dados

Serviços Desktop são compartilhados por host, com nomes, labels e volumes
próprios do SetupVibe. Portainer usa CE com papéis Server/Agent separados.
Senhas não entram no catálogo, nos planos ou no histórico.

Estado fica em `setupvibe.db`; métricas, em `metrics.db`. Retenção fixa:
sete dias. O intervalo inicial escolhido é cinco segundos, configurável,
com custo a medir. Dados ausentes não viram zero.
Consultas não aplicam limites de recursos.

## Interfaces

CLI e TUI compartilham resolução e execução. JSON tem um resultado final;
NDJSON tem eventos por linha. Diagnóstico humano usa stderr.
Prévia não instala nem cria estado persistente.

Sem terminal, mutações exigem autorização explícita. Saídas: 0 sucesso;
1 falha de execução; 2 entrada inválida; 3 não suportado; 4 pré-condição;
5 resultado parcial; 6 timeout/ocupado; 130 cancelamento.

Tailscale oferece apenas install, verify e update.

## Evolução

Mudanças nestes contratos exigem motivo, impacto e teste na tarefa.
As páginas ClickUp distinguem capacidades implementadas, escolhas de implementação e validações de plataforma ainda pendentes. A versão publicada e os domínios de instalação não mudam
por consequência de um build local.

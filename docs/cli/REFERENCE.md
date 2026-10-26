# Referência completa do CLI

Gerada de contratos autorados e da ajuda do executável. Versão 2.0.0-alpha.1.

Não edite este arquivo diretamente. Edite `scripts/manual-source.mjs`, execute `npm run docs:generate` e confira `npm run docs:check`.

Todos os exemplos usam o executável no PATH. Substitua caminhos e IDs ilustrativos. Exemplos com `--yes` executam alterações reais. Os exemplos de Swarm usam endereços de documentação, que precisam ser substituídos. O token vem de arquivo privado em stdin.

Permissões pertencem ao gerenciador: APT, Docker Engine e coletor system exigem autorização administrativa. Homebrew, mise e coletor user usam a conta atual. Consultas Docker dependem do acesso ao socket. O programa não amplia permissões automaticamente.

Leia [guia de uso](../user/README.md), [protocolo e automação](../development/CLI.md), [edições](../development/COMPATIBILITY.md) e [preservação das instalações](../development/ADAPTERS.md).

## Índice de comandos

- [setupvibe (raiz)](#setupvibe)
- [tui](#setupvibe-tui)
- [collector](#setupvibe-collector)
- [collector install](#setupvibe-collector-install)
- [collector update](#setupvibe-collector-update)
- [collector configure](#setupvibe-collector-configure)
- [collector status](#setupvibe-collector-status)
- [collector start](#setupvibe-collector-start)
- [collector stop](#setupvibe-collector-stop)
- [collector restart](#setupvibe-collector-restart)
- [collector render](#setupvibe-collector-render)
- [collector run](#setupvibe-collector-run)
- [metrics](#setupvibe-metrics)
- [metrics current](#setupvibe-metrics-current)
- [metrics history](#setupvibe-metrics-history)
- [docker](#setupvibe-docker)
- [docker install](#setupvibe-docker-install)
- [docker verify](#setupvibe-docker-verify)
- [docker update](#setupvibe-docker-update)
- [service](#setupvibe-service)
- [service list](#setupvibe-service-list)
- [service inspect](#setupvibe-service-inspect)
- [service logs](#setupvibe-service-logs)
- [service start](#setupvibe-service-start)
- [service stop](#setupvibe-service-stop)
- [service restart](#setupvibe-service-restart)
- [swarm](#setupvibe-swarm)
- [swarm status](#setupvibe-swarm-status)
- [swarm init](#setupvibe-swarm-init)
- [swarm join](#setupvibe-swarm-join)
- [git](#setupvibe-git)
- [git install](#setupvibe-git-install)
- [git verify](#setupvibe-git-verify)
- [git update](#setupvibe-git-update)
- [gh](#setupvibe-gh)
- [gh install](#setupvibe-gh-install)
- [gh verify](#setupvibe-gh-verify)
- [gh update](#setupvibe-gh-update)
- [portainer](#setupvibe-portainer)
- [portainer install](#setupvibe-portainer-install)
- [portainer verify](#setupvibe-portainer-verify)
- [portainer update](#setupvibe-portainer-update)
- [herdr](#setupvibe-herdr)
- [herdr install](#setupvibe-herdr-install)
- [herdr verify](#setupvibe-herdr-verify)
- [herdr update](#setupvibe-herdr-update)
- [codex](#setupvibe-codex)
- [codex install](#setupvibe-codex-install)
- [codex verify](#setupvibe-codex-verify)
- [codex update](#setupvibe-codex-update)
- [claude](#setupvibe-claude)
- [claude install](#setupvibe-claude-install)
- [claude verify](#setupvibe-claude-verify)
- [claude update](#setupvibe-claude-update)
- [antigravity](#setupvibe-antigravity)
- [antigravity install](#setupvibe-antigravity-install)
- [antigravity verify](#setupvibe-antigravity-verify)
- [antigravity update](#setupvibe-antigravity-update)
- [opencode](#setupvibe-opencode)
- [opencode install](#setupvibe-opencode-install)
- [opencode verify](#setupvibe-opencode-verify)
- [opencode update](#setupvibe-opencode-update)
- [kimi](#setupvibe-kimi)
- [kimi install](#setupvibe-kimi-install)
- [kimi verify](#setupvibe-kimi-verify)
- [kimi update](#setupvibe-kimi-update)
- [ansible](#setupvibe-ansible)
- [ansible install](#setupvibe-ansible-install)
- [ansible verify](#setupvibe-ansible-verify)
- [ansible update](#setupvibe-ansible-update)
- [tailscale](#setupvibe-tailscale)
- [tailscale install](#setupvibe-tailscale-install)
- [tailscale verify](#setupvibe-tailscale-verify)
- [tailscale update](#setupvibe-tailscale-update)
- [updates](#setupvibe-updates)
- [updates list](#setupvibe-updates-list)
- [updates apply](#setupvibe-updates-apply)
- [doctor](#setupvibe-doctor)
- [state](#setupvibe-state)
- [state init](#setupvibe-state-init)
- [state status](#setupvibe-state-status)
- [state reconcile](#setupvibe-state-reconcile)
- [state backup](#setupvibe-state-backup)
- [operation](#setupvibe-operation)
- [operation list](#setupvibe-operation-list)
- [operation show](#setupvibe-operation-show)
- [version](#setupvibe-version)
- [catalog](#setupvibe-catalog)
- [catalog list](#setupvibe-catalog-list)
- [catalog show](#setupvibe-catalog-show)
- [catalog validate](#setupvibe-catalog-validate)
- [component](#setupvibe-component)
- [component inspect](#setupvibe-component-inspect)
- [component verify](#setupvibe-component-verify)
- [component list](#setupvibe-component-list)
- [component install](#setupvibe-component-install)
- [component update](#setupvibe-component-update)

## setupvibe

Abre a TUI quando stdin e stdout são terminais. Sem TTY, exige subcomando e retorna 4. Não instala componentes ao abrir.

```text
setupvibe [OPTIONS] [COMMAND]
```

**Entradas.** Comando opcional em terminal interativo. --non-interactive exige uma operação explícita.

**Saída e efeitos.** O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.

**Conferência.** Consulte a confirmação e as condições de cada subcomando antes de executar.

Subcomandos: [tui](#setupvibe-tui), [collector](#setupvibe-collector), [metrics](#setupvibe-metrics), [docker](#setupvibe-docker), [service](#setupvibe-service), [swarm](#setupvibe-swarm), [git](#setupvibe-git), [gh](#setupvibe-gh), [portainer](#setupvibe-portainer), [herdr](#setupvibe-herdr), [codex](#setupvibe-codex), [claude](#setupvibe-claude), [antigravity](#setupvibe-antigravity), [opencode](#setupvibe-opencode), [kimi](#setupvibe-kimi), [ansible](#setupvibe-ansible), [tailscale](#setupvibe-tailscale), [updates](#setupvibe-updates), [doctor](#setupvibe-doctor), [state](#setupvibe-state), [operation](#setupvibe-operation), [version](#setupvibe-version), [catalog](#setupvibe-catalog), [component](#setupvibe-component).

**Exemplo 1: Abrir Desktop.**

```bash
setupvibe --edition desktop tui
```

**Exemplo 2: Abrir Server.**

```bash
setupvibe --edition server tui
```

**Exemplo 3: Abrir métricas.**

```bash
setupvibe tui --tab 3
```

**Exemplo 4: Renderizar terminal compacto.**

```bash
setupvibe --output json tui --snapshot --width 80 --height 24
```

**Exemplo 5: Renderizar aplicativos Server.**

```bash
setupvibe --edition server --output json tui --snapshot --width 129 --height 44 --tab 1
```

## setupvibe tui

Abre a interface para selecionar componentes, revisar alterações e acompanhar operações com teclado e mouse.

```text
setupvibe tui [OPTIONS]
```

**Entradas.** Sem subcomando o terminal interativo também abre a TUI. --tab inteiro 0..5, padrão 0. --snapshot usa render de teste, com width 50..240 e height 18..100.

**Saída e efeitos.** A interface exige TTY, exceto snapshot. Abrir não instala programas. --yes global não pula a confirmação visual. Sair não encerra o coletor independente.

**Conferência.** Confira resultado e histórico após a operação. Veja o guia de navegação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--snapshot` | Booleano, padrão false. Renderiza frame de diagnóstico sem TTY e sem mutações. |
| `--width` | Inteiro 50..240, padrão 129, largura usada por snapshot. |
| `--height` | Inteiro 18..100, padrão 44, altura usada por snapshot. |
| `--tab` | Inteiro 0..5, padrão 0: Home, Aplicativos, Serviços, Métricas, Histórico, Sobre. |

**Exemplo 1: Abrir Desktop.**

```bash
setupvibe --edition desktop tui
```

**Exemplo 2: Abrir Server.**

```bash
setupvibe --edition server tui
```

**Exemplo 3: Abrir métricas.**

```bash
setupvibe tui --tab 3
```

**Exemplo 4: Renderizar terminal compacto.**

```bash
setupvibe --output json tui --snapshot --width 80 --height 24
```

**Exemplo 5: Renderizar aplicativos Server.**

```bash
setupvibe --edition server --output json tui --snapshot --width 129 --height 44 --tab 1
```

## setupvibe collector

Instalar, supervisionar e executar o coletor.

```text
setupvibe collector [OPTIONS] <COMMAND>
```

**Entradas.** Escolha um subcomando obrigatório. As opções globais podem aparecer antes ou depois do grupo.

**Saída e efeitos.** O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.

**Conferência.** Consulte a confirmação e as condições de cada subcomando antes de executar.

Subcomandos: [install](#setupvibe-collector-install), [update](#setupvibe-collector-update), [configure](#setupvibe-collector-configure), [status](#setupvibe-collector-status), [start](#setupvibe-collector-start), [stop](#setupvibe-collector-stop), [restart](#setupvibe-collector-restart), [render](#setupvibe-collector-render), [run](#setupvibe-collector-run).

**Exemplo 1: Revisar Desktop.**

```bash
setupvibe collector install --dry-run
```

**Exemplo 2: Instalar com intervalo padrão.**

```bash
setupvibe collector install --yes
```

**Exemplo 3: Escolher intervalo de dez segundos.**

```bash
setupvibe collector install --interval 10 --yes
```

**Exemplo 4: Revisar serviço Server.**

```bash
setupvibe --edition server collector install --scope system --dry-run
```

**Exemplo 5: Instalar serviço de usuário explicitamente.**

```bash
setupvibe collector install --scope user --yes
```

## setupvibe collector install

Instala uma cópia privada do executável e inicia o coletor no supervisor nativo.

```text
setupvibe collector install [OPTIONS]
```

**Entradas.** --interval inteiro 1..3600, padrão 5. --scope user/system opcional, padrão user na Desktop e system na Server Linux.

**Saída e efeitos.** Exige --yes e supervisor disponível. System exige root. Recusa unidade externa, recibo alterado ou diretório diferente do instalado.

**Conferência.** Use collector status e metrics current. Linux user precisa de sessão/DBus disponível.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--scope` | Enum opcional. Em coletor: user/system, padrão por edição. Em métricas: host/disk/container/source, ausente inclui todos. |
| `--interval` | Inteiro 1..3600 segundos. Padrão 5 em install/render/run, obrigatório em configure. Não altera retenção. |

**Exemplo 1: Revisar Desktop.**

```bash
setupvibe collector install --dry-run
```

**Exemplo 2: Instalar com intervalo padrão.**

```bash
setupvibe collector install --yes
```

**Exemplo 3: Escolher intervalo de dez segundos.**

```bash
setupvibe collector install --interval 10 --yes
```

**Exemplo 4: Revisar serviço Server.**

```bash
setupvibe --edition server collector install --scope system --dry-run
```

**Exemplo 5: Instalar serviço de usuário explicitamente.**

```bash
setupvibe collector install --scope user --yes
```

## setupvibe collector update

Troca a cópia privada do coletor pelo executável atual e reinicia, preservando configuração.

```text
setupvibe collector update [OPTIONS]
```

**Entradas.** Sem argumento de domínio. Exige recibo válido, mesma edição/diretório e acesso ao supervisor.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar. Stop preserva dados e instalação. No systemd não desabilita o boot, e LaunchAgent pode voltar no próximo login.

**Conferência.** Confira collector status, PID e metrics current. Atualizar o CLI principal sozinho não atualiza esta cópia.

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe collector update --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json collector update --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe collector update --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson collector update --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json collector update --yes
```

## setupvibe collector configure

Altera o intervalo do coletor instalado e reinicia a supervisão mantendo o restante da configuração.

```text
setupvibe collector configure [OPTIONS] --interval <INTERVAL>
```

**Entradas.** --interval inteiro obrigatório entre 1 e 3600 segundos.

**Saída e efeitos.** Exige --yes, unidade gerenciada e mesmo diretório. Não muda retenção de sete dias.

**Conferência.** Confirme intervalo, PID e métricas em collector status.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--interval` | Inteiro 1..3600 segundos. Padrão 5 em install/render/run, obrigatório em configure. Não altera retenção. |

**Exemplo 1: Revisar dez segundos.**

```bash
setupvibe collector configure --interval 10 --dry-run
```

**Exemplo 2: Aplicar dez segundos.**

```bash
setupvibe collector configure --interval 10 --yes
```

**Exemplo 3: Coletar a cada minuto.**

```bash
setupvibe collector configure --interval 60 --yes
```

**Exemplo 4: Retornar a cinco segundos.**

```bash
setupvibe collector configure --interval 5 --yes
```

**Exemplo 5: Registrar configuração em JSON.**

```bash
setupvibe --output json collector configure --interval 30 --yes
```

## setupvibe collector status

Consulta unidade, processo, configuração e atualidade das métricas sem iniciar o coletor.

```text
setupvibe collector status [OPTIONS]
```

**Entradas.** Sem argumento de domínio. O diretório consultado precisa corresponder à instalação para controles posteriores.

**Saída e efeitos.** Retorna presença, estado, PID, escopo e diferenças de diretório. Unidade externa ou recibo alterado pode produzir recusa.

**Conferência.** Leia metrics current para avaliar amostras e saúde das fontes.

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe collector status
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json collector status
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson collector status
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json collector status
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 collector status
```

## setupvibe collector start

Executa start na unidade do coletor instalada pelo SetupVibe.

```text
setupvibe collector start [OPTIONS]
```

**Entradas.** Sem argumento de domínio. Exige recibo válido, mesma edição/diretório e acesso ao supervisor.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar. Stop preserva dados e instalação. No systemd não desabilita o boot, e LaunchAgent pode voltar no próximo login.

**Conferência.** Confira collector status, PID e metrics current. Atualizar o CLI principal sozinho não atualiza esta cópia.

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe collector start --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json collector start --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe collector start --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson collector start --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json collector start --yes
```

## setupvibe collector stop

Executa stop na unidade do coletor instalada pelo SetupVibe.

```text
setupvibe collector stop [OPTIONS]
```

**Entradas.** Sem argumento de domínio. Exige recibo válido, mesma edição/diretório e acesso ao supervisor.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar. Stop preserva dados e instalação. No systemd não desabilita o boot, e LaunchAgent pode voltar no próximo login.

**Conferência.** Confira collector status, PID e metrics current. Atualizar o CLI principal sozinho não atualiza esta cópia.

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe collector stop --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json collector stop --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe collector stop --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson collector stop --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json collector stop --yes
```

## setupvibe collector restart

Executa restart na unidade do coletor instalada pelo SetupVibe.

```text
setupvibe collector restart [OPTIONS]
```

**Entradas.** Sem argumento de domínio. Exige recibo válido, mesma edição/diretório e acesso ao supervisor.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar. Stop preserva dados e instalação. No systemd não desabilita o boot, e LaunchAgent pode voltar no próximo login.

**Conferência.** Confira collector status, PID e metrics current. Atualizar o CLI principal sozinho não atualiza esta cópia.

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe collector restart --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json collector restart --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe collector restart --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson collector restart --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json collector restart --yes
```

## setupvibe collector render

Renderiza a unidade que seria usada para revisar systemd ou launchd sem gravá-la.

```text
setupvibe collector render [OPTIONS]
```

**Entradas.** --platform linux/macos opcional. --scope user/system opcional. --interval inteiro 1..3600, padrão 5.

**Saída e efeitos.** Não instala nem registra unidade. macOS aceita somente Desktop/user. O resultado inclui caminhos e conteúdo escapado.

**Conferência.** Compare o conteúdo antes de collector install.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--platform` | Enum linux/macos opcional. Padrão sistema atual. Somente renderização de unidade, sem instalação cruzada. |
| `--scope` | Enum opcional. Em coletor: user/system, padrão por edição. Em métricas: host/disk/container/source, ausente inclui todos. |
| `--interval` | Inteiro 1..3600 segundos. Padrão 5 em install/render/run, obrigatório em configure. Não altera retenção. |

**Exemplo 1: Renderizar para o host.**

```bash
setupvibe collector render
```

**Exemplo 2: Revisar systemd user.**

```bash
setupvibe collector render --platform linux --scope user
```

**Exemplo 3: Revisar systemd Server.**

```bash
setupvibe --edition server collector render --platform linux --scope system
```

**Exemplo 4: Revisar LaunchAgent.**

```bash
setupvibe --edition desktop collector render --platform macos --scope user
```

**Exemplo 5: Escolher intervalo.**

```bash
setupvibe collector render --interval 30 --output json
```

## setupvibe collector run

Executa a coleta em foreground para supervisão ou diagnóstico com duração controlada.

```text
setupvibe collector run [OPTIONS]
```

**Entradas.** --interval inteiro 1..3600, padrão 5. --once booleano ou --samples inteiro positivo, mutuamente exclusivos. Sem limite, encerra por sinal.

**Saída e efeitos.** Exige --yes. Grava somente metrics.db e sessões de coleta. SIGINT/SIGTERM retorna 130. Docker indisponível não impede amostras do host.

**Conferência.** Consulte metrics current/history em outro processo.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--interval` | Inteiro 1..3600 segundos. Padrão 5 em install/render/run, obrigatório em configure. Não altera retenção. |
| `--once` | Booleano, padrão false. Um ciclo do host e encerramento do ciclo Docker em curso. Incompatível com --samples. |
| `--samples` | Inteiro positivo opcional. Limita ciclos do host. Incompatível com --once. |

**Exemplo 1: Revisar coleta.**

```bash
setupvibe collector run --once --dry-run
```

**Exemplo 2: Executar uma coleta.**

```bash
setupvibe collector run --once --yes
```

**Exemplo 3: Coletar três ciclos.**

```bash
setupvibe collector run --samples 3 --interval 1 --yes
```

**Exemplo 4: Executar foreground contínuo.**

```bash
setupvibe collector run --interval 5 --yes
```

**Exemplo 5: Registrar resultado finito.**

```bash
setupvibe --output json collector run --samples 2 --interval 10 --yes
```

## setupvibe metrics

Consultar recursos e histórico do coletor.

```text
setupvibe metrics [OPTIONS] <COMMAND>
```

**Entradas.** Escolha um subcomando obrigatório. As opções globais podem aparecer antes ou depois do grupo.

**Saída e efeitos.** O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.

**Conferência.** Consulte a confirmação e as condições de cada subcomando antes de executar.

Subcomandos: [current](#setupvibe-metrics-current), [history](#setupvibe-metrics-history).

**Exemplo 1: Consultar host.**

```bash
setupvibe metrics current --scope host
```

**Exemplo 2: Consultar containers.**

```bash
setupvibe metrics current --scope container
```

**Exemplo 3: Consultar mount específico.**

```bash
setupvibe metrics current --scope disk --id /
```

**Exemplo 4: Exigir dado recente.**

```bash
setupvibe --output json metrics current --max-age 10
```

**Exemplo 5: Paginar recursos.**

```bash
setupvibe metrics current --limit 20 --offset 20
```

## setupvibe metrics current

Mostra a última amostra de cada recurso com idade, disponibilidade e saúde da coleta.

```text
setupvibe metrics current [OPTIONS]
```

**Entradas.** --scope, --id, --limit, --offset e --max-age filtram a leitura. O padrão mostra até 100 recursos com idade máxima de 30 segundos.

**Saída e efeitos.** Sem banco, retorna samples vazio, has_more false, next_offset null e collector_stopped false. Ausência não vira zero. Retenção fixa de sete dias e amostras futuras excluídas. Não aplica limites de CPU/RAM.

**Conferência.** Confira fresh, available, collector_stopped e health antes de agir.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--scope` | Enum opcional. Em coletor: user/system, padrão por edição. Em métricas: host/disk/container/source, ausente inclui todos. |
| `--id` | String opcional, identificador exato do recurso de métricas. Ausente não filtra ID. |
| `--limit` | Inteiro 1..1000, padrão 100, quantidade máxima por página. |
| `--offset` | Inteiro não negativo, padrão 0. Pula linhas. No histórico, offset positivo não pode ser combinado com after positivo. Prefira after/snapshot-id. |
| `--max-age` | Inteiro 1..604800, padrão 30 segundos. Define fresh em current. Aceito por history pelo schema compartilhado, sem filtrar seu período. |

**Exemplo 1: Consultar host.**

```bash
setupvibe metrics current --scope host
```

**Exemplo 2: Consultar containers.**

```bash
setupvibe metrics current --scope container
```

**Exemplo 3: Consultar mount específico.**

```bash
setupvibe metrics current --scope disk --id /
```

**Exemplo 4: Exigir dado recente.**

```bash
setupvibe --output json metrics current --max-age 10
```

**Exemplo 5: Paginar recursos.**

```bash
setupvibe metrics current --limit 20 --offset 20
```

## setupvibe metrics history

Consulta amostras dentro da retenção para analisar mudanças sem preencher lacunas.

```text
setupvibe metrics history [OPTIONS]
```

**Entradas.** --from e --to são RFC3339 opcionais, padrão última hora até agora. --after é cursor inteiro, padrão 0. --snapshot-id fixa o limite da paginação.

**Saída e efeitos.** Retorna samples, snapshot_id, next_after e has_more, inclusive sem banco. Cursores inválidos e after/offset positivos retornam 2 antes de ler o estado. A limpeza por retenção pode remover linhas entre páginas. Não agrega nem interpola valores.

**Conferência.** Reutilize snapshot_id e next_after na próxima página.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--scope` | Enum opcional. Em coletor: user/system, padrão por edição. Em métricas: host/disk/container/source, ausente inclui todos. |
| `--id` | String opcional, identificador exato do recurso de métricas. Ausente não filtra ID. |
| `--limit` | Inteiro 1..1000, padrão 100, quantidade máxima por página. |
| `--offset` | Inteiro não negativo, padrão 0. Pula linhas. No histórico, offset positivo não pode ser combinado com after positivo. Prefira after/snapshot-id. |
| `--max-age` | Inteiro 1..604800, padrão 30 segundos. Define fresh em current. Aceito por history pelo schema compartilhado, sem filtrar seu período. |
| `--from` | RFC3339 com fuso, opcional. Padrão última hora. Limitado à retenção de sete dias. |
| `--to` | RFC3339 com fuso, opcional. Padrão agora. Amostras futuras são excluídas. |
| `--after` | Inteiro não negativo, padrão 0. Cursor de ID retornado como next_after, até 9223372036854775807. Não combine valor positivo com offset positivo. |
| `--snapshot-id` | Inteiro opcional retornado na primeira página. Mantém limite de inserções entre páginas, sujeito à retenção. Aceita 0..9223372036854775807. |

**Exemplo 1: Ler última hora do host.**

```bash
setupvibe metrics history --scope host
```

**Exemplo 2: Definir período UTC.**

```bash
setupvibe metrics history --from 2026-10-22T10:00:00Z --to 2026-10-22T11:00:00Z
```

**Exemplo 3: Filtrar container.**

```bash
setupvibe metrics history --scope container --id ID_DO_CONTAINER
```

**Exemplo 4: Limitar página.**

```bash
setupvibe --output json metrics history --limit 50
```

**Exemplo 5: Continuar snapshot conhecido.**

```bash
setupvibe metrics history --after 100 --snapshot-id 500 --limit 50
```

## setupvibe docker

Operar docker pelo núcleo compartilhado de componentes.

```text
setupvibe docker [OPTIONS] <COMMAND>
```

**Entradas.** Escolha um subcomando obrigatório. As opções globais podem aparecer antes ou depois do grupo.

**Saída e efeitos.** O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.

**Conferência.** Consulte a confirmação e as condições de cada subcomando antes de executar.

Subcomandos: [install](#setupvibe-docker-install), [verify](#setupvibe-docker-verify), [update](#setupvibe-docker-update).

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe docker install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json docker install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe docker install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson docker install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json docker install --yes
```

## setupvibe docker install

Prepara runtime Docker pelo mesmo núcleo usado por component install docker.

```text
setupvibe docker install [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Confira docker verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--role` | String opcional server/agent, somente Portainer install. Padrão server. Agent usa porta padrão 9001 se nenhuma porta foi informada. |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe docker install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json docker install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe docker install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson docker install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json docker install --yes
```

## setupvibe docker verify

Confere a instalação de runtime Docker sem iniciar login ou reconfigurar o aplicativo.

```text
setupvibe docker verify [OPTIONS]
```

**Entradas.** Sem argumento de domínio. A edição precisa permitir o componente.

**Saída e efeitos.** A consulta não grava bancos nem instala componentes. Use --output json para consumir o resultado e confira success e o código de saída.

**Conferência.** Confira docker verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe docker verify
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json docker verify
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson docker verify
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json docker verify
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 docker verify
```

## setupvibe docker update

Atualiza runtime Docker pelo mesmo núcleo usado por component update docker.

```text
setupvibe docker update [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Confira docker verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe docker update --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json docker update --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe docker update --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson docker update --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json docker update --yes
```

## setupvibe service

Descobrir e controlar serviços Docker.

```text
setupvibe service [OPTIONS] <COMMAND>
```

**Entradas.** Escolha um subcomando obrigatório. As opções globais podem aparecer antes ou depois do grupo.

**Saída e efeitos.** O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.

**Conferência.** Consulte a confirmação e as condições de cada subcomando antes de executar.

Subcomandos: [list](#setupvibe-service-list), [inspect](#setupvibe-service-inspect), [logs](#setupvibe-service-logs), [start](#setupvibe-service-start), [stop](#setupvibe-service-stop), [restart](#setupvibe-service-restart).

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe service list
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json service list
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson service list
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json service list
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 service list
```

## setupvibe service list

Descobre containers, serviços Swarm, redes, volumes e stacks visíveis ao Docker ativo.

```text
setupvibe service list [OPTIONS]
```

**Entradas.** Nenhum argumento de domínio. Exige Docker e acesso ao daemon.

**Saída e efeitos.** A resposta projeta campos públicos e não adota recursos externos. A consulta não inicia Docker.

**Conferência.** Use os IDs retornados em service inspect.

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe service list
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json service list
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson service list
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json service list
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 service list
```

## setupvibe service inspect

Consulta saúde, portas, volumes, endpoints e recursos de um container ou serviço Swarm.

```text
setupvibe service inspect [OPTIONS] <ID>
```

**Entradas.** ID: nome ou ID obrigatório retornado por service list.

**Saída e efeitos.** Exclui variáveis de ambiente e labels privadas da resposta pública. Limites observados não são aplicados pela consulta.

**Conferência.** Confira propriedade antes de solicitar um controle.

**Exemplo 1: Conferir Redis.**

```bash
setupvibe service inspect setupvibe-redis
```

**Exemplo 2: Conferir PostgreSQL.**

```bash
setupvibe service inspect setupvibe-postgresql
```

**Exemplo 3: Conferir Mailpit.**

```bash
setupvibe service inspect setupvibe-mailpit
```

**Exemplo 4: Conferir Portainer.**

```bash
setupvibe --output json service inspect setupvibe-portainer
```

**Exemplo 5: Conferir serviço Swarm.**

```bash
setupvibe service inspect setupvibe-portainer_server
```

## setupvibe service logs

Consulta logs para investigar falhas sem persistir o conteúdo integral no banco.

```text
setupvibe service logs [OPTIONS] <ID>
```

**Entradas.** ID obrigatório. --tail inteiro 1..10000, padrão 100. --since é RFC3339 opcional. --follow é booleano, padrão false.

**Saída e efeitos.** Saída finita ou eventos NDJSON em follow. Timeout encerra acompanhamento. Padrões conhecidos de credenciais são filtrados, sem garantia para segredos arbitrários.

**Conferência.** Relacione os logs com service inspect e o histórico da operação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--since` | RFC3339 com fuso, opcional. Filtra logs a partir da data informada. |
| `--follow` | Booleano, padrão false. Acompanha logs até timeout, sinal ou encerramento da origem. |
| `--tail` | Inteiro 1..10000, padrão 100 linhas de log. |

**Exemplo 1: Últimas linhas.**

```bash
setupvibe service logs setupvibe-redis
```

**Exemplo 2: Reduzir volume.**

```bash
setupvibe service logs setupvibe-postgresql --tail 20
```

**Exemplo 3: Filtrar início.**

```bash
setupvibe service logs setupvibe-redis --since 2026-10-22T00:00:00Z
```

**Exemplo 4: Acompanhar por um minuto.**

```bash
setupvibe --timeout 60 --output ndjson service logs setupvibe-redis --follow
```

**Exemplo 5: Consultar Swarm.**

```bash
setupvibe service logs setupvibe-portainer_server --tail 50
```

## setupvibe service start

Executa start somente em container ou serviço Swarm gerenciado pelo SetupVibe.

```text
setupvibe service start [OPTIONS] <ID>
```

**Entradas.** ID obrigatório retornado por service list. Na Server, o recurso precisa ser Portainer.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar. Recursos externos são recusados. Stop preserva volumes. Swarm global não oferece start/stop, enquanto restart atualiza suas tarefas.

**Conferência.** Confirme estado e saúde em service inspect. Stop de serviço replicado guarda a escala anterior para start.

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe service start setupvibe-redis --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json service start setupvibe-redis --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe service start setupvibe-redis --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson service start setupvibe-redis --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json service start setupvibe-redis --yes
```

## setupvibe service stop

Executa stop somente em container ou serviço Swarm gerenciado pelo SetupVibe.

```text
setupvibe service stop [OPTIONS] <ID>
```

**Entradas.** ID obrigatório retornado por service list. Na Server, o recurso precisa ser Portainer.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar. Recursos externos são recusados. Stop preserva volumes. Swarm global não oferece start/stop, enquanto restart atualiza suas tarefas.

**Conferência.** Confirme estado e saúde em service inspect. Stop de serviço replicado guarda a escala anterior para start.

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe service stop setupvibe-redis --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json service stop setupvibe-redis --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe service stop setupvibe-redis --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson service stop setupvibe-redis --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json service stop setupvibe-redis --yes
```

## setupvibe service restart

Executa restart somente em container ou serviço Swarm gerenciado pelo SetupVibe.

```text
setupvibe service restart [OPTIONS] <ID>
```

**Entradas.** ID obrigatório retornado por service list. Na Server, o recurso precisa ser Portainer.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar. Recursos externos são recusados. Stop preserva volumes. Swarm global não oferece start/stop, enquanto restart atualiza suas tarefas.

**Conferência.** Confirme estado e saúde em service inspect. Stop de serviço replicado guarda a escala anterior para start.

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe service restart setupvibe-redis --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json service restart setupvibe-redis --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe service restart setupvibe-redis --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson service restart setupvibe-redis --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json service restart setupvibe-redis --yes
```

## setupvibe swarm

Consultar e preparar o nó Swarm.

```text
setupvibe swarm [OPTIONS] <COMMAND>
```

**Entradas.** Escolha um subcomando obrigatório. As opções globais podem aparecer antes ou depois do grupo.

**Saída e efeitos.** O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.

**Conferência.** Consulte a confirmação e as condições de cada subcomando antes de executar.

Subcomandos: [status](#setupvibe-swarm-status), [init](#setupvibe-swarm-init), [join](#setupvibe-swarm-join).

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe swarm status
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json swarm status
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson swarm status
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json swarm status
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 swarm status
```

## setupvibe swarm status

Consulta o estado Swarm do nó, manager e capacidades sem revelar tokens.

```text
setupvibe swarm status [OPTIONS]
```

**Entradas.** Sem argumento de domínio. Exige Docker acessível.

**Saída e efeitos.** Retorna estado do nó. Não inicializa cluster nem altera redes.

**Conferência.** Use o estado antes de init, join ou implantação Portainer Swarm.

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe swarm status
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json swarm status
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson swarm status
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json swarm status
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 swarm status
```

## setupvibe swarm init

Inicializa um Swarm novo com endereço anunciado explícito.

```text
setupvibe swarm init [OPTIONS] --advertise-addr <ADVERTISE_ADDR>
```

**Entradas.** --advertise-addr: string obrigatória com endereço do nó acessível aos participantes.

**Saída e efeitos.** Exige --yes e nó ainda não associado. Não sai de um Swarm existente automaticamente.

**Conferência.** Confirme swarm status e o endereço do nó após a operação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--advertise-addr` | String obrigatória. Endereço do nó anunciado ao Swarm, validado antes da chamada Docker. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe swarm init --advertise-addr 192.0.2.10 --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json swarm init --advertise-addr 192.0.2.10 --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe swarm init --advertise-addr 192.0.2.10 --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson swarm init --advertise-addr 192.0.2.10 --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json swarm init --advertise-addr 192.0.2.10 --yes
```

## setupvibe swarm join

Associa o nó a um manager usando token recebido somente por stdin.

```text
setupvibe swarm join [OPTIONS] --manager <MANAGER>
```

**Entradas.** --manager: HOST:PORT obrigatório. --token-stdin precisa estar presente na execução. Token não entra em argv.

**Saída e efeitos.** Exige --yes, nó disponível e token válido. Prévia não consome stdin. Não imprime token no histórico.

**Conferência.** Leia o token de arquivo privado ou secret manager e confirme swarm status.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--manager` | String obrigatória HOST:PORT do manager, por exemplo 192.0.2.10:2377. |
| `--token-stdin` | Booleano, padrão false. Obrigatório na execução de join. O token é lido de stdin e não é argumento. |

**Exemplo 1: Revisar associação.**

```bash
setupvibe swarm join --manager 192.0.2.10:2377 --token-stdin --dry-run
```

**Exemplo 2: Revisar em JSON.**

```bash
setupvibe --output json swarm join --manager 192.0.2.10:2377 --token-stdin --dry-run
```

**Exemplo 3: Executar com stdin privado.**

```bash
setupvibe swarm join --manager 192.0.2.10:2377 --token-stdin --yes < /caminho/privado/swarm-token
```

**Exemplo 4: Associar pela edição Server.**

```bash
setupvibe --edition server swarm join --manager 192.0.2.11:2377 --token-stdin --yes < /caminho/privado/swarm-token
```

**Exemplo 5: Limitar espera.**

```bash
setupvibe --timeout 30 swarm join --manager 192.0.2.10:2377 --token-stdin --dry-run
```

## setupvibe git

Operar git pelo núcleo compartilhado de componentes.

```text
setupvibe git [OPTIONS] <COMMAND>
```

**Entradas.** Escolha um subcomando obrigatório. As opções globais podem aparecer antes ou depois do grupo.

**Saída e efeitos.** O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.

**Conferência.** Consulte a confirmação e as condições de cada subcomando antes de executar.

Subcomandos: [install](#setupvibe-git-install), [verify](#setupvibe-git-verify), [update](#setupvibe-git-update).

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe git install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json git install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe git install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson git install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json git install --yes
```

## setupvibe git install

Prepara Git pelo mesmo núcleo usado por component install git.

```text
setupvibe git install [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Confira git verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--role` | String opcional server/agent, somente Portainer install. Padrão server. Agent usa porta padrão 9001 se nenhuma porta foi informada. |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe git install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json git install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe git install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson git install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json git install --yes
```

## setupvibe git verify

Confere a instalação de Git sem iniciar login ou reconfigurar o aplicativo.

```text
setupvibe git verify [OPTIONS]
```

**Entradas.** Sem argumento de domínio. A edição precisa permitir o componente.

**Saída e efeitos.** A consulta não grava bancos nem instala componentes. Use --output json para consumir o resultado e confira success e o código de saída.

**Conferência.** Confira git verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe git verify
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json git verify
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson git verify
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json git verify
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 git verify
```

## setupvibe git update

Atualiza Git pelo mesmo núcleo usado por component update git.

```text
setupvibe git update [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Confira git verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe git update --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json git update --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe git update --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson git update --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json git update --yes
```

## setupvibe gh

Operar gh pelo núcleo compartilhado de componentes.

```text
setupvibe gh [OPTIONS] <COMMAND>
```

**Entradas.** Escolha um subcomando obrigatório. As opções globais podem aparecer antes ou depois do grupo.

**Saída e efeitos.** O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.

**Conferência.** Consulte a confirmação e as condições de cada subcomando antes de executar.

Subcomandos: [install](#setupvibe-gh-install), [verify](#setupvibe-gh-verify), [update](#setupvibe-gh-update).

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe gh install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json gh install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe gh install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson gh install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json gh install --yes
```

## setupvibe gh install

Prepara GitHub CLI pelo mesmo núcleo usado por component install gh.

```text
setupvibe gh install [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Confira gh verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--role` | String opcional server/agent, somente Portainer install. Padrão server. Agent usa porta padrão 9001 se nenhuma porta foi informada. |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe gh install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json gh install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe gh install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson gh install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json gh install --yes
```

## setupvibe gh verify

Confere a instalação de GitHub CLI sem iniciar login ou reconfigurar o aplicativo.

```text
setupvibe gh verify [OPTIONS]
```

**Entradas.** Sem argumento de domínio. A edição precisa permitir o componente.

**Saída e efeitos.** A consulta não grava bancos nem instala componentes. Use --output json para consumir o resultado e confira success e o código de saída.

**Conferência.** Confira gh verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe gh verify
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json gh verify
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson gh verify
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json gh verify
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 gh verify
```

## setupvibe gh update

Atualiza GitHub CLI pelo mesmo núcleo usado por component update gh.

```text
setupvibe gh update [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Confira gh verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe gh update --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json gh update --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe gh update --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson gh update --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json gh update --yes
```

## setupvibe portainer

Operar portainer pelo núcleo compartilhado de componentes.

```text
setupvibe portainer [OPTIONS] <COMMAND>
```

**Entradas.** Escolha um subcomando obrigatório. As opções globais podem aparecer antes ou depois do grupo.

**Saída e efeitos.** O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.

**Conferência.** Consulte a confirmação e as condições de cada subcomando antes de executar.

Subcomandos: [install](#setupvibe-portainer-install), [verify](#setupvibe-portainer-verify), [update](#setupvibe-portainer-update).

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe portainer install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json portainer install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe portainer install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson portainer install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json portainer install --yes
```

## setupvibe portainer install

Prepara Portainer CE pelo mesmo núcleo usado por component install portainer.

```text
setupvibe portainer install [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Confira portainer verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--role` | String opcional server/agent, somente Portainer install. Padrão server. Agent usa porta padrão 9001 se nenhuma porta foi informada. |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe portainer install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json portainer install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe portainer install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson portainer install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json portainer install --yes
```

## setupvibe portainer verify

Confere a instalação de Portainer CE sem iniciar login ou reconfigurar o aplicativo.

```text
setupvibe portainer verify [OPTIONS]
```

**Entradas.** Sem argumento de domínio. A edição precisa permitir o componente.

**Saída e efeitos.** A consulta não grava bancos nem instala componentes. Use --output json para consumir o resultado e confira success e o código de saída.

**Conferência.** Confira portainer verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe portainer verify
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json portainer verify
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson portainer verify
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json portainer verify
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 portainer verify
```

## setupvibe portainer update

Atualiza Portainer CE pelo mesmo núcleo usado por component update portainer.

```text
setupvibe portainer update [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Confira portainer verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe portainer update --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json portainer update --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe portainer update --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson portainer update --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json portainer update --yes
```

## setupvibe herdr

Operar herdr pelo núcleo compartilhado de componentes.

```text
setupvibe herdr [OPTIONS] <COMMAND>
```

**Entradas.** Escolha um subcomando obrigatório. As opções globais podem aparecer antes ou depois do grupo.

**Saída e efeitos.** O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.

**Conferência.** Consulte a confirmação e as condições de cada subcomando antes de executar.

Subcomandos: [install](#setupvibe-herdr-install), [verify](#setupvibe-herdr-verify), [update](#setupvibe-herdr-update).

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe herdr install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json herdr install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe herdr install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson herdr install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json herdr install --yes
```

## setupvibe herdr install

Prepara Herdr pelo mesmo núcleo usado por component install herdr.

```text
setupvibe herdr install [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Confira herdr verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--role` | String opcional server/agent, somente Portainer install. Padrão server. Agent usa porta padrão 9001 se nenhuma porta foi informada. |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe herdr install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json herdr install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe herdr install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson herdr install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json herdr install --yes
```

## setupvibe herdr verify

Confere a instalação de Herdr sem iniciar login ou reconfigurar o aplicativo.

```text
setupvibe herdr verify [OPTIONS]
```

**Entradas.** Sem argumento de domínio. A edição precisa permitir o componente.

**Saída e efeitos.** A consulta não grava bancos nem instala componentes. Use --output json para consumir o resultado e confira success e o código de saída.

**Conferência.** Confira herdr verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe herdr verify
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json herdr verify
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson herdr verify
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json herdr verify
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 herdr verify
```

## setupvibe herdr update

Atualiza Herdr pelo mesmo núcleo usado por component update herdr.

```text
setupvibe herdr update [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Confira herdr verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe herdr update --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json herdr update --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe herdr update --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson herdr update --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json herdr update --yes
```

## setupvibe codex

Operar codex pelo núcleo compartilhado de componentes.

```text
setupvibe codex [OPTIONS] <COMMAND>
```

**Entradas.** Escolha um subcomando obrigatório. As opções globais podem aparecer antes ou depois do grupo.

**Saída e efeitos.** O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.

**Conferência.** Consulte a confirmação e as condições de cada subcomando antes de executar.

Subcomandos: [install](#setupvibe-codex-install), [verify](#setupvibe-codex-verify), [update](#setupvibe-codex-update).

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe codex install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json codex install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe codex install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson codex install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json codex install --yes
```

## setupvibe codex install

Prepara Codex pelo mesmo núcleo usado por component install codex.

```text
setupvibe codex install [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Confira codex verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--role` | String opcional server/agent, somente Portainer install. Padrão server. Agent usa porta padrão 9001 se nenhuma porta foi informada. |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe codex install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json codex install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe codex install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson codex install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json codex install --yes
```

## setupvibe codex verify

Confere a instalação de Codex sem iniciar login ou reconfigurar o aplicativo.

```text
setupvibe codex verify [OPTIONS]
```

**Entradas.** Sem argumento de domínio. A edição precisa permitir o componente.

**Saída e efeitos.** A consulta não grava bancos nem instala componentes. Use --output json para consumir o resultado e confira success e o código de saída.

**Conferência.** Confira codex verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe codex verify
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json codex verify
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson codex verify
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json codex verify
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 codex verify
```

## setupvibe codex update

Atualiza Codex pelo mesmo núcleo usado por component update codex.

```text
setupvibe codex update [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Confira codex verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe codex update --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json codex update --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe codex update --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson codex update --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json codex update --yes
```

## setupvibe claude

Operar claude pelo núcleo compartilhado de componentes.

```text
setupvibe claude [OPTIONS] <COMMAND>
```

**Entradas.** Escolha um subcomando obrigatório. As opções globais podem aparecer antes ou depois do grupo.

**Saída e efeitos.** O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.

**Conferência.** Consulte a confirmação e as condições de cada subcomando antes de executar.

Subcomandos: [install](#setupvibe-claude-install), [verify](#setupvibe-claude-verify), [update](#setupvibe-claude-update).

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe claude install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json claude install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe claude install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson claude install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json claude install --yes
```

## setupvibe claude install

Prepara Claude Code pelo mesmo núcleo usado por component install claude.

```text
setupvibe claude install [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Confira claude verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--role` | String opcional server/agent, somente Portainer install. Padrão server. Agent usa porta padrão 9001 se nenhuma porta foi informada. |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe claude install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json claude install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe claude install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson claude install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json claude install --yes
```

## setupvibe claude verify

Confere a instalação de Claude Code sem iniciar login ou reconfigurar o aplicativo.

```text
setupvibe claude verify [OPTIONS]
```

**Entradas.** Sem argumento de domínio. A edição precisa permitir o componente.

**Saída e efeitos.** A consulta não grava bancos nem instala componentes. Use --output json para consumir o resultado e confira success e o código de saída.

**Conferência.** Confira claude verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe claude verify
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json claude verify
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson claude verify
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json claude verify
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 claude verify
```

## setupvibe claude update

Atualiza Claude Code pelo mesmo núcleo usado por component update claude.

```text
setupvibe claude update [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Confira claude verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe claude update --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json claude update --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe claude update --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson claude update --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json claude update --yes
```

## setupvibe antigravity

Operar antigravity pelo núcleo compartilhado de componentes.

```text
setupvibe antigravity [OPTIONS] <COMMAND>
```

**Entradas.** Escolha um subcomando obrigatório. As opções globais podem aparecer antes ou depois do grupo.

**Saída e efeitos.** O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.

**Conferência.** Consulte a confirmação e as condições de cada subcomando antes de executar.

Subcomandos: [install](#setupvibe-antigravity-install), [verify](#setupvibe-antigravity-verify), [update](#setupvibe-antigravity-update).

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe antigravity install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json antigravity install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe antigravity install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson antigravity install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json antigravity install --yes
```

## setupvibe antigravity install

Prepara Antigravity pelo mesmo núcleo usado por component install antigravity.

```text
setupvibe antigravity install [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Confira antigravity verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--role` | String opcional server/agent, somente Portainer install. Padrão server. Agent usa porta padrão 9001 se nenhuma porta foi informada. |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe antigravity install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json antigravity install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe antigravity install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson antigravity install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json antigravity install --yes
```

## setupvibe antigravity verify

Confere a instalação de Antigravity sem iniciar login ou reconfigurar o aplicativo.

```text
setupvibe antigravity verify [OPTIONS]
```

**Entradas.** Sem argumento de domínio. A edição precisa permitir o componente.

**Saída e efeitos.** A consulta não grava bancos nem instala componentes. Use --output json para consumir o resultado e confira success e o código de saída.

**Conferência.** Confira antigravity verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe antigravity verify
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json antigravity verify
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson antigravity verify
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json antigravity verify
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 antigravity verify
```

## setupvibe antigravity update

Atualiza Antigravity pelo mesmo núcleo usado por component update antigravity.

```text
setupvibe antigravity update [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Confira antigravity verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe antigravity update --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json antigravity update --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe antigravity update --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson antigravity update --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json antigravity update --yes
```

## setupvibe opencode

Operar opencode pelo núcleo compartilhado de componentes.

```text
setupvibe opencode [OPTIONS] <COMMAND>
```

**Entradas.** Escolha um subcomando obrigatório. As opções globais podem aparecer antes ou depois do grupo.

**Saída e efeitos.** O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.

**Conferência.** Consulte a confirmação e as condições de cada subcomando antes de executar.

Subcomandos: [install](#setupvibe-opencode-install), [verify](#setupvibe-opencode-verify), [update](#setupvibe-opencode-update).

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe opencode install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json opencode install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe opencode install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson opencode install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json opencode install --yes
```

## setupvibe opencode install

Prepara OpenCode pelo mesmo núcleo usado por component install opencode.

```text
setupvibe opencode install [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Confira opencode verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--role` | String opcional server/agent, somente Portainer install. Padrão server. Agent usa porta padrão 9001 se nenhuma porta foi informada. |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe opencode install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json opencode install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe opencode install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson opencode install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json opencode install --yes
```

## setupvibe opencode verify

Confere a instalação de OpenCode sem iniciar login ou reconfigurar o aplicativo.

```text
setupvibe opencode verify [OPTIONS]
```

**Entradas.** Sem argumento de domínio. A edição precisa permitir o componente.

**Saída e efeitos.** A consulta não grava bancos nem instala componentes. Use --output json para consumir o resultado e confira success e o código de saída.

**Conferência.** Confira opencode verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe opencode verify
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json opencode verify
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson opencode verify
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json opencode verify
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 opencode verify
```

## setupvibe opencode update

Atualiza OpenCode pelo mesmo núcleo usado por component update opencode.

```text
setupvibe opencode update [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Confira opencode verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe opencode update --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json opencode update --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe opencode update --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson opencode update --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json opencode update --yes
```

## setupvibe kimi

Operar kimi pelo núcleo compartilhado de componentes.

```text
setupvibe kimi [OPTIONS] <COMMAND>
```

**Entradas.** Escolha um subcomando obrigatório. As opções globais podem aparecer antes ou depois do grupo.

**Saída e efeitos.** O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.

**Conferência.** Consulte a confirmação e as condições de cada subcomando antes de executar.

Subcomandos: [install](#setupvibe-kimi-install), [verify](#setupvibe-kimi-verify), [update](#setupvibe-kimi-update).

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe kimi install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json kimi install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe kimi install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson kimi install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json kimi install --yes
```

## setupvibe kimi install

Prepara Kimi Code pelo mesmo núcleo usado por component install kimi.

```text
setupvibe kimi install [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Confira kimi verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--role` | String opcional server/agent, somente Portainer install. Padrão server. Agent usa porta padrão 9001 se nenhuma porta foi informada. |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe kimi install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json kimi install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe kimi install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson kimi install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json kimi install --yes
```

## setupvibe kimi verify

Confere a instalação de Kimi Code sem iniciar login ou reconfigurar o aplicativo.

```text
setupvibe kimi verify [OPTIONS]
```

**Entradas.** Sem argumento de domínio. A edição precisa permitir o componente.

**Saída e efeitos.** A consulta não grava bancos nem instala componentes. Use --output json para consumir o resultado e confira success e o código de saída.

**Conferência.** Confira kimi verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe kimi verify
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json kimi verify
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson kimi verify
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json kimi verify
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 kimi verify
```

## setupvibe kimi update

Atualiza Kimi Code pelo mesmo núcleo usado por component update kimi.

```text
setupvibe kimi update [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Confira kimi verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe kimi update --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json kimi update --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe kimi update --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson kimi update --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json kimi update --yes
```

## setupvibe ansible

Operar ansible pelo núcleo compartilhado de componentes.

```text
setupvibe ansible [OPTIONS] <COMMAND>
```

**Entradas.** Escolha um subcomando obrigatório. As opções globais podem aparecer antes ou depois do grupo.

**Saída e efeitos.** O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.

**Conferência.** Consulte a confirmação e as condições de cada subcomando antes de executar.

Subcomandos: [install](#setupvibe-ansible-install), [verify](#setupvibe-ansible-verify), [update](#setupvibe-ansible-update).

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe ansible install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json ansible install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe ansible install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson ansible install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json ansible install --yes
```

## setupvibe ansible install

Prepara Ansible pelo mesmo núcleo usado por component install ansible.

```text
setupvibe ansible install [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Confira ansible verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--role` | String opcional server/agent, somente Portainer install. Padrão server. Agent usa porta padrão 9001 se nenhuma porta foi informada. |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe ansible install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json ansible install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe ansible install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson ansible install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json ansible install --yes
```

## setupvibe ansible verify

Confere a instalação de Ansible sem iniciar login ou reconfigurar o aplicativo.

```text
setupvibe ansible verify [OPTIONS]
```

**Entradas.** Sem argumento de domínio. A edição precisa permitir o componente.

**Saída e efeitos.** A consulta não grava bancos nem instala componentes. Use --output json para consumir o resultado e confira success e o código de saída.

**Conferência.** Confira ansible verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe ansible verify
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json ansible verify
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson ansible verify
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json ansible verify
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 ansible verify
```

## setupvibe ansible update

Atualiza Ansible pelo mesmo núcleo usado por component update ansible.

```text
setupvibe ansible update [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Confira ansible verify e operation list. Login, licenças e configurações do fornecedor continuam separados da instalação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe ansible update --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json ansible update --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe ansible update --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson ansible update --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json ansible update --yes
```

## setupvibe tailscale

Operar tailscale pelo núcleo compartilhado de componentes.

```text
setupvibe tailscale [OPTIONS] <COMMAND>
```

**Entradas.** Escolha um subcomando obrigatório. As opções globais podem aparecer antes ou depois do grupo.

**Saída e efeitos.** O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.

**Conferência.** Consulte a confirmação e as condições de cada subcomando antes de executar.

Subcomandos: [install](#setupvibe-tailscale-install), [verify](#setupvibe-tailscale-verify), [update](#setupvibe-tailscale-update).

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe tailscale install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json tailscale install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe tailscale install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson tailscale install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json tailscale install --yes
```

## setupvibe tailscale install

Prepara Tailscale pelo mesmo núcleo usado por component install tailscale.

```text
setupvibe tailscale install [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Verifique presença e BackendState separadamente. Login, Serve, Services e Funnel ficam fora deste comando.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--role` | String opcional server/agent, somente Portainer install. Padrão server. Agent usa porta padrão 9001 se nenhuma porta foi informada. |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe tailscale install --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json tailscale install --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe tailscale install --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson tailscale install --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json tailscale install --yes
```

## setupvibe tailscale verify

Confere a instalação de Tailscale sem iniciar login ou reconfigurar o aplicativo.

```text
setupvibe tailscale verify [OPTIONS]
```

**Entradas.** Sem argumento de domínio. A edição precisa permitir o componente.

**Saída e efeitos.** A consulta não grava bancos nem instala componentes. Use --output json para consumir o resultado e confira success e o código de saída.

**Conferência.** Verifique presença e BackendState separadamente. Login, Serve, Services e Funnel ficam fora deste comando.

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe tailscale verify
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json tailscale verify
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson tailscale verify
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json tailscale verify
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 tailscale verify
```

## setupvibe tailscale update

Atualiza Tailscale pelo mesmo núcleo usado por component update tailscale.

```text
setupvibe tailscale update [OPTIONS]
```

**Entradas.** Sem ID adicional. --option CHAVE=VALOR usa opções do catálogo. --role aparece no parsing compartilhado de install, mas só é aceito para Portainer. Valores desconhecidos são recusados.

**Saída e efeitos.** A prévia não altera o host. A execução exige --yes, usa exclusividade e registra resultado no estado local. Confira o resultado e o histórico após executar.

**Conferência.** Verifique presença e BackendState separadamente. Login, Serve, Services e Funnel ficam fora deste comando.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe tailscale update --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json tailscale update --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe tailscale update --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson tailscale update --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json tailscale update --yes
```

## setupvibe updates

Consultar e aplicar atualizações selecionadas.

```text
setupvibe updates [OPTIONS] <COMMAND>
```

**Entradas.** Escolha um subcomando obrigatório. As opções globais podem aparecer antes ou depois do grupo.

**Saída e efeitos.** O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.

**Conferência.** Consulte a confirmação e as condições de cada subcomando antes de executar.

Subcomandos: [list](#setupvibe-updates-list), [apply](#setupvibe-updates-apply).

**Exemplo 1: Consultar edição.**

```bash
setupvibe updates list
```

**Exemplo 2: Consultar Git e gh.**

```bash
setupvibe updates list git gh
```

**Exemplo 3: Consultar Node.js.**

```bash
setupvibe --output json updates list node
```

**Exemplo 4: Consultar Server.**

```bash
setupvibe --edition server updates list
```

**Exemplo 5: Consultar serviço.**

```bash
setupvibe updates list redis
```

## setupvibe updates list

Consulta candidatos de atualização sem instalar ou atualizar índices APT implicitamente.

```text
setupvibe updates list [OPTIONS] [IDS]...
```

**Entradas.** IDS: zero ou mais IDs. Ausente seleciona os componentes da edição.

**Saída e efeitos.** Retorna atualizações e limitações por gerenciador. APT/Homebrew podem usar metadados locais. Fornecedor sem consulta confiável informa versão candidata desconhecida.

**Conferência.** Selecione explicitamente os IDs para updates apply.

**Exemplo 1: Consultar edição.**

```bash
setupvibe updates list
```

**Exemplo 2: Consultar Git e gh.**

```bash
setupvibe updates list git gh
```

**Exemplo 3: Consultar Node.js.**

```bash
setupvibe --output json updates list node
```

**Exemplo 4: Consultar Server.**

```bash
setupvibe --edition server updates list
```

**Exemplo 5: Consultar serviço.**

```bash
setupvibe updates list redis
```

## setupvibe updates apply

Aplica atualização somente aos IDs selecionados, pelo mesmo executor de component update.

```text
setupvibe updates apply [OPTIONS] <IDS>...
```

**Entradas.** IDS: um ou mais IDs obrigatórios. Não existe seleção implícita de todos os componentes.

**Saída e efeitos.** Exige --yes para aplicar. Retorna resultados por componente e código 5 em falha parcial.

**Conferência.** Repita updates list nos componentes selecionados.

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe updates apply git gh --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json updates apply git gh --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe updates apply git gh --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson updates apply git gh --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json updates apply git gh --yes
```

## setupvibe doctor

Confere se a plataforma está habilitada e quais ferramentas estão disponíveis antes de preparar o ambiente.

```text
setupvibe doctor [OPTIONS]
```

**Entradas.** Nenhum argumento de domínio. --edition seleciona as verificações e --timeout limita cada subprocesso.

**Saída e efeitos.** Retorna plataforma, comandos e SQLite. Ferramenta ausente não inicia instalação. Server omite mise e Homebrew.

**Conferência.** Depois de instalar um componente, repita doctor ou use component verify.

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe doctor
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json doctor
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson doctor
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json doctor
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 doctor
```

## setupvibe state

Manter bancos e reconciliar observações.

```text
setupvibe state [OPTIONS] <COMMAND>
```

**Entradas.** Escolha um subcomando obrigatório. As opções globais podem aparecer antes ou depois do grupo.

**Saída e efeitos.** O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.

**Conferência.** Consulte a confirmação e as condições de cada subcomando antes de executar.

Subcomandos: [init](#setupvibe-state-init), [status](#setupvibe-state-status), [reconcile](#setupvibe-state-reconcile), [backup](#setupvibe-state-backup).

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe state init --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json state init --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe state init --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson state init --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json state init --yes
```

## setupvibe state init

Cria os dois bancos vazios para preparar estado e métricas sem instalar aplicativos.

```text
setupvibe state init [OPTIONS]
```

**Entradas.** Sem argumento de domínio. --data-dir seleciona diretório absoluto privado.

**Saída e efeitos.** Exige --yes. Cria schema 1 transacionalmente e recusa banco futuro ou layout incompatível.

**Conferência.** Use state status para conferir caminhos e schema.

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe state init --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json state init --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe state init --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson state init --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json state init --yes
```

## setupvibe state status

Consulta bancos, versões de schema e observações existentes.

```text
setupvibe state status [OPTIONS]
```

**Entradas.** Sem argumento de domínio. Usa --data-dir ou o diretório padrão da plataforma.

**Saída e efeitos.** Ausência não cria banco. Observação local não substitui inspeção do host.

**Conferência.** Use component inspect para atualizar seu diagnóstico do ambiente real.

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe state status
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json state status
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson state status
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json state status
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 state status
```

## setupvibe state reconcile

Reobserva instalações e identifica operações interrompidas sem adotar uma origem desconhecida.

```text
setupvibe state reconcile [OPTIONS]
```

**Entradas.** Sem argumento de domínio. Exige acesso de escrita ao estado selecionado.

**Saída e efeitos.** Exige --yes e exclusividade. Operações interrompidas podem ser marcadas unknown, sem inventar sucesso.

**Conferência.** Confira state status e operation list depois de reconciliar.

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe state reconcile --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json state reconcile --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe state reconcile --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson state reconcile --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json state reconcile --yes
```

## setupvibe state backup

Cria uma cópia consistente do banco de estado antes de manutenção.

```text
setupvibe state backup [OPTIONS] --destination <DESTINATION>
```

**Entradas.** --destination: caminho obrigatório para arquivo novo. Não aceita sobrescrever um destino existente.

**Saída e efeitos.** Exige --yes e banco de estado existente. Não inclui metrics.db nem arquivos de segredos ou volumes.

**Conferência.** Confira o arquivo e preserve também os dados externos conforme sua rotina de backup.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--destination` | Caminho obrigatório para arquivo novo de backup. Destino existente é recusado. |

**Exemplo 1: Revisar antes de alterar.**

```bash
setupvibe state backup --destination /caminho/privado/setupvibe-backup.db --dry-run
```

**Exemplo 2: Salvar a prévia estruturada.**

```bash
setupvibe --output json state backup --destination /caminho/privado/setupvibe-backup.db --dry-run
```

**Exemplo 3: Executar a alteração revisada.**

```bash
setupvibe state backup --destination /caminho/privado/setupvibe-backup.db --yes
```

**Exemplo 4: Acompanhar as etapas.**

```bash
setupvibe --output ndjson state backup --destination /caminho/privado/setupvibe-backup.db --yes
```

**Exemplo 5: Executar sem perguntas e com prazo.**

```bash
setupvibe --non-interactive --timeout 120 --output json state backup --destination /caminho/privado/setupvibe-backup.db --yes
```

## setupvibe operation

Consultar histórico de operações.

```text
setupvibe operation [OPTIONS] <COMMAND>
```

**Entradas.** Escolha um subcomando obrigatório. As opções globais podem aparecer antes ou depois do grupo.

**Saída e efeitos.** O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.

**Conferência.** Consulte a confirmação e as condições de cada subcomando antes de executar.

Subcomandos: [list](#setupvibe-operation-list), [show](#setupvibe-operation-show).

**Exemplo 1: Ver operações recentes.**

```bash
setupvibe operation list
```

**Exemplo 2: Limitar primeira página.**

```bash
setupvibe operation list --limit 20
```

**Exemplo 3: Ler página seguinte.**

```bash
setupvibe operation list --limit 20 --offset 20
```

**Exemplo 4: Consumir JSON.**

```bash
setupvibe --output json operation list
```

**Exemplo 5: Consultar outro estado.**

```bash
setupvibe --data-dir /caminho/privado/setupvibe operation list
```

## setupvibe operation list

Lista operações recentes para localizar alterações e falhas por período de execução.

```text
setupvibe operation list [OPTIONS]
```

**Entradas.** --limit inteiro 1..1000, padrão 100. --offset inteiro não negativo, padrão 0.

**Saída e efeitos.** Retorna operações paginadas sem alterar status. Não contém credenciais dos subprocessos.

**Conferência.** Use operation show com o ID retornado para consultar etapas.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--limit` | Inteiro 1..1000, padrão 100, quantidade máxima por página. |
| `--offset` | Inteiro não negativo, padrão 0. Pula linhas. No histórico, offset positivo não pode ser combinado com after positivo. Prefira after/snapshot-id. |

**Exemplo 1: Ver operações recentes.**

```bash
setupvibe operation list
```

**Exemplo 2: Limitar primeira página.**

```bash
setupvibe operation list --limit 20
```

**Exemplo 3: Ler página seguinte.**

```bash
setupvibe operation list --limit 20 --offset 20
```

**Exemplo 4: Consumir JSON.**

```bash
setupvibe --output json operation list
```

**Exemplo 5: Consultar outro estado.**

```bash
setupvibe --data-dir /caminho/privado/setupvibe operation list
```

## setupvibe operation show

Exibe uma operação e o resultado de cada etapa para investigar falhas parciais.

```text
setupvibe operation show [OPTIONS] <ID>
```

**Entradas.** ID: string obrigatória retornada por operation list.

**Saída e efeitos.** Consulta somente o banco selecionado. ID sem registro não é uma autorização para retomar a operação.

**Conferência.** Compare etapas, status e códigos antes de planejar nova execução.

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe operation show ID_DA_OPERACAO
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json operation show ID_DA_OPERACAO
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson operation show ID_DA_OPERACAO
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json operation show ID_DA_OPERACAO
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 operation show ID_DA_OPERACAO
```

## setupvibe version

Identifica o executável usado em um diagnóstico ou antes de comparar artefatos. A versão vem de Cargo.toml.

```text
setupvibe version [OPTIONS]
```

**Entradas.** Nenhum argumento de domínio. O subcomando respeita --output, enquanto --version e -V exibem texto simples.

**Saída e efeitos.** Retorna versão e schema do protocolo. Não verifica releases remotas.

**Conferência.** Confira a mesma versão no nome do artefato e no changelog.

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe version
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json version
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson version
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json version
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 version
```

## setupvibe catalog

Consultar e validar o catálogo embarcado.

```text
setupvibe catalog [OPTIONS] <COMMAND>
```

**Entradas.** Escolha um subcomando obrigatório. As opções globais podem aparecer antes ou depois do grupo.

**Saída e efeitos.** O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.

**Conferência.** Consulte a confirmação e as condições de cada subcomando antes de executar.

Subcomandos: [list](#setupvibe-catalog-list), [show](#setupvibe-catalog-show), [validate](#setupvibe-catalog-validate).

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe catalog list
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json catalog list
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson catalog list
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json catalog list
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 catalog list
```

## setupvibe catalog list

Mostra os componentes disponíveis na edição para montar uma seleção.

```text
setupvibe catalog list [OPTIONS]
```

**Entradas.** Sem argumento obrigatório. A edição vem do binário, ambiente ou --edition.

**Saída e efeitos.** Retorna catalog_version e components, sem consultar instalações reais.

**Conferência.** Use catalog show ID para consultar opções antes de instalar.

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe catalog list
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json catalog list
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson catalog list
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json catalog list
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 catalog list
```

## setupvibe catalog show

Exibe detalhes, dependências e opções de um componente antes da preparação.

```text
setupvibe catalog show [OPTIONS] <ID>
```

**Entradas.** ID: string obrigatória do catálogo. Não aceita nome livre de pacote.

**Saída e efeitos.** Retorna o componente. ID desconhecido produz 2 e edição incompatível produz 3.

**Conferência.** Confirme operations e opções antes de usar component install.

**Exemplo 1: Consultar Git.**

```bash
setupvibe catalog show git
```

**Exemplo 2: Escolher papel Portainer.**

```bash
setupvibe catalog show portainer
```

**Exemplo 3: Conferir intervalo.**

```bash
setupvibe catalog show collector
```

**Exemplo 4: Consumir opções Redis.**

```bash
setupvibe --output json catalog show redis
```

**Exemplo 5: Conferir Server.**

```bash
setupvibe --edition server catalog show tailscale
```

## setupvibe catalog validate

Confere o schema embarcado ou uma proposta de catálogo sem habilitar execução externa.

```text
setupvibe catalog validate [OPTIONS]
```

**Entradas.** --file: caminho opcional. Ausente usa o catálogo embarcado.

**Saída e efeitos.** Retorna contagem/versão ou erro 2. O arquivo externo não substitui o catálogo usado pelo executor.

**Conferência.** Corrija campos, referências e ciclos e repita a validação.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--file` | Caminho opcional de catálogo JSON a validar. Não substitui o catálogo embarcado para execução. |

**Exemplo 1: Validar embarcado.**

```bash
setupvibe catalog validate
```

**Exemplo 2: Validar arquivo do projeto.**

```bash
setupvibe catalog validate --file catalog/components.json
```

**Exemplo 3: Capturar JSON.**

```bash
setupvibe --output json catalog validate
```

**Exemplo 4: Validar sem interação.**

```bash
setupvibe --non-interactive catalog validate
```

**Exemplo 5: Registrar eventos.**

```bash
setupvibe --output ndjson catalog validate --file catalog/components.json
```

## setupvibe component

Inspecionar, instalar e atualizar componentes.

```text
setupvibe component [OPTIONS] <COMMAND>
```

**Entradas.** Escolha um subcomando obrigatório. As opções globais podem aparecer antes ou depois do grupo.

**Saída e efeitos.** O grupo organiza as operações descritas abaixo. --help não executa consultas de host nem grava dados.

**Conferência.** Consulte a confirmação e as condições de cada subcomando antes de executar.

Subcomandos: [inspect](#setupvibe-component-inspect), [verify](#setupvibe-component-verify), [list](#setupvibe-component-list), [install](#setupvibe-component-install), [update](#setupvibe-component-update).

**Exemplo 1: Inspecionar Git.**

```bash
setupvibe component inspect git
```

**Exemplo 2: Consultar Node.js.**

```bash
setupvibe component inspect node
```

**Exemplo 3: Conferir Portainer.**

```bash
setupvibe component inspect portainer
```

**Exemplo 4: Automatizar leitura.**

```bash
setupvibe --output json component inspect gh
```

**Exemplo 5: Consultar Server.**

```bash
setupvibe --edition server component inspect tailscale
```

## setupvibe component inspect

Descobre presença, versão, caminho e gerenciador proprietário sem adotar a instalação.

```text
setupvibe component inspect [OPTIONS] <ID>
```

**Entradas.** ID: string obrigatória do catálogo.

**Saída e efeitos.** Retorna observação com present, owner, path e managed. Ausência é um resultado de inspeção, não uma instalação.

**Conferência.** Compare a origem antes de solicitar atualização.

**Exemplo 1: Inspecionar Git.**

```bash
setupvibe component inspect git
```

**Exemplo 2: Consultar Node.js.**

```bash
setupvibe component inspect node
```

**Exemplo 3: Conferir Portainer.**

```bash
setupvibe component inspect portainer
```

**Exemplo 4: Automatizar leitura.**

```bash
setupvibe --output json component inspect gh
```

**Exemplo 5: Consultar Server.**

```bash
setupvibe --edition server component inspect tailscale
```

## setupvibe component verify

Confere que um componente está instalado sem modificá-lo.

```text
setupvibe component verify [OPTIONS] <ID>
```

**Entradas.** ID: string obrigatória. Tailscale acrescenta o estado de backend sem autenticar.

**Saída e efeitos.** Ausência retorna 4. Versão e proprietário não comprovam login ou disponibilidade de uma API remota.

**Conferência.** Use a resposta para distinguir ausência, falha de execução e instalação existente.

**Exemplo 1: Conferir Git.**

```bash
setupvibe component verify git
```

**Exemplo 2: Conferir assistente.**

```bash
setupvibe component verify codex
```

**Exemplo 3: Conferir runtime.**

```bash
setupvibe component verify docker
```

**Exemplo 4: Consultar Tailscale sem login.**

```bash
setupvibe --output json component verify tailscale
```

**Exemplo 5: Conferir coletor instalado.**

```bash
setupvibe component verify collector
```

## setupvibe component list

Lista o catálogo da edição pelo grupo de componentes.

```text
setupvibe component list [OPTIONS]
```

**Entradas.** Sem argumento de domínio. É equivalente à consulta catalog list.

**Saída e efeitos.** Não descobre instalações nem grava observações.

**Conferência.** Use component inspect ID para consultar o host.

**Exemplo 1: Conferir no terminal.**

```bash
setupvibe component list
```

**Exemplo 2: Consumir em automação.**

```bash
setupvibe --output json component list
```

**Exemplo 3: Receber eventos por linha.**

```bash
setupvibe --output ndjson component list
```

**Exemplo 4: Consultar sem stdin interativo.**

```bash
setupvibe --non-interactive --output json component list
```

**Exemplo 5: Limitar espera de ferramentas externas.**

```bash
setupvibe --timeout 10 component list
```

## setupvibe component install

Instala componentes selecionados e somente as dependências necessárias. Instalações presentes são preservadas.

```text
setupvibe component install [OPTIONS] [IDS]...
```

**Entradas.** IDS: uma ou mais strings, obrigatórias na execução. --option aceita CHAVE=VALOR repetível, sem chaves duplicadas. Valores são validados pelo catálogo.

**Saída e efeitos.** Retorna plano ou resultados por etapa. Não adota origem externa. Serviço sem Docker tem descoberta adiada explícita até o runtime estar disponível.

**Conferência.** Use component verify e operation list. Uma falha parcial conserva etapas concluídas.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar Git e gh.**

```bash
setupvibe component install git gh --dry-run
```

**Exemplo 2: Instalar seleção Server.**

```bash
setupvibe --edition server component install git gh --yes
```

**Exemplo 3: Escolher porta Redis.**

```bash
setupvibe component install redis --option port=7000 --dry-run
```

**Exemplo 4: Escolher versão Node.js.**

```bash
setupvibe component install node --target-version 24 --dry-run
```

**Exemplo 5: Preparar Portainer Agent.**

```bash
setupvibe component install portainer --option role=agent --dry-run
```

## setupvibe component update

Atualiza os componentes solicitados pelo gerenciador que possui a instalação. Não instala dependências.

```text
setupvibe component update [OPTIONS] [IDS]...
```

**Entradas.** IDS: uma ou mais strings. --target-version é versão literal/prefixo numérico para mise. Opções de reconfiguração de serviços são recusadas.

**Saída e efeitos.** Ausência ou origem desconhecida produz falha. A versão explícita precisa ser confirmada pelo JSON global do mise e pelo caminho observado.

**Conferência.** Use updates list e component verify depois da execução.

| Opção local | Tipo, padrão e condições |
| --- | --- |
| `--option` | String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração. |

**Exemplo 1: Revisar atualização Git.**

```bash
setupvibe component update git --dry-run
```

**Exemplo 2: Atualizar Git e gh.**

```bash
setupvibe component update git gh --yes
```

**Exemplo 3: Escolher prefixo Node.js.**

```bash
setupvibe component update node --target-version 24 --dry-run
```

**Exemplo 4: Revisar Redis preservando configuração.**

```bash
setupvibe component update redis --dry-run
```

**Exemplo 5: Acompanhar Tailscale.**

```bash
setupvibe --output ndjson component update tailscale --yes
```

## Opções globais

As flags globais alteram o contexto da operação. Elas não habilitam componentes excluídos da edição nem substituem pré-condições do host.

### --edition

Enum desktop/server. Opcional. Padrão compilado, substituído por SETUPVIBE_EDITION e pela flag explícita.

Filtra o catálogo e recusa operações fora da edição antes de dependências.

**Exemplo 1: Aplicação 1 de --edition.**

```bash
setupvibe --edition desktop catalog list
```

**Exemplo 2: Aplicação 2 de --edition.**

```bash
setupvibe --edition server catalog list
```

**Exemplo 3: Aplicação 3 de --edition.**

```bash
setupvibe --edition server doctor
```

**Exemplo 4: Aplicação 4 de --edition.**

```bash
setupvibe --edition server catalog show portainer
```

**Exemplo 5: Aplicação 5 de --edition.**

```bash
setupvibe --edition desktop tui
```

### --output

Enum text/json/ndjson, padrão text.

Define stdout. JSON contém um resultado final, NDJSON contém eventos por linha.

**Exemplo 1: Aplicação 1 de --output.**

```bash
setupvibe --output text version
```

**Exemplo 2: Aplicação 2 de --output.**

```bash
setupvibe --output json catalog list
```

**Exemplo 3: Aplicação 3 de --output.**

```bash
setupvibe --output ndjson version
```

**Exemplo 4: Aplicação 4 de --output.**

```bash
setupvibe --output json metrics current
```

**Exemplo 5: Aplicação 5 de --output.**

```bash
setupvibe --output ndjson component install git --dry-run
```

### --dry-run

Booleano, padrão false.

Produz prévia sem mutar. Não implica autorização posterior.

**Exemplo 1: Aplicação 1 de --dry-run.**

```bash
setupvibe component install git --dry-run
```

**Exemplo 2: Aplicação 2 de --dry-run.**

```bash
setupvibe component update git --dry-run
```

**Exemplo 3: Aplicação 3 de --dry-run.**

```bash
setupvibe collector install --dry-run
```

**Exemplo 4: Aplicação 4 de --dry-run.**

```bash
setupvibe state init --dry-run
```

**Exemplo 5: Aplicação 5 de --dry-run.**

```bash
setupvibe service stop setupvibe-redis --dry-run
```

### --non-interactive

Booleano, padrão false.

Declara automação e recusa abertura da TUI. Não substitui --yes.

**Exemplo 1: Aplicação 1 de --non-interactive.**

```bash
setupvibe --non-interactive version
```

**Exemplo 2: Aplicação 2 de --non-interactive.**

```bash
setupvibe --non-interactive doctor
```

**Exemplo 3: Aplicação 3 de --non-interactive.**

```bash
setupvibe --non-interactive catalog list
```

**Exemplo 4: Aplicação 4 de --non-interactive.**

```bash
setupvibe --non-interactive metrics current
```

**Exemplo 5: Aplicação 5 de --non-interactive.**

```bash
setupvibe --non-interactive state init --yes
```

### --yes

Booleano, padrão false.

Autoriza somente a mutação solicitada. Na TUI, cada operação continua exigindo revisão visual.

**Exemplo 1: Aplicação 1 de --yes.**

```bash
setupvibe state init --yes
```

**Exemplo 2: Aplicação 2 de --yes.**

```bash
setupvibe git install --yes
```

**Exemplo 3: Aplicação 3 de --yes.**

```bash
setupvibe updates apply git --yes
```

**Exemplo 4: Aplicação 4 de --yes.**

```bash
setupvibe collector install --yes
```

**Exemplo 5: Aplicação 5 de --yes.**

```bash
setupvibe service restart setupvibe-redis --yes
```

### --data-dir

Caminho absoluto opcional. Flag prevalece sobre SETUPVIBE_DATA_DIR.

Linux usa XDG_DATA_HOME/setupvibe ou HOME/.local/share/setupvibe. macOS usa HOME/Library/Application Support/setupvibe. Não move dados ao mudar a flag.

**Exemplo 1: Aplicação 1 de --data-dir.**

```bash
setupvibe --data-dir /caminho/privado/setupvibe state status
```

**Exemplo 2: Aplicação 2 de --data-dir.**

```bash
setupvibe --data-dir /caminho/privado/setupvibe metrics current
```

**Exemplo 3: Aplicação 3 de --data-dir.**

```bash
setupvibe --data-dir /caminho/privado/setupvibe operation list
```

**Exemplo 4: Aplicação 4 de --data-dir.**

```bash
setupvibe --data-dir /caminho/privado/setupvibe collector status
```

**Exemplo 5: Aplicação 5 de --data-dir.**

```bash
setupvibe --data-dir /caminho/privado/setupvibe state init --dry-run
```

### --timeout

Inteiro 1..86400, padrão 300 segundos por subprocesso.

Limita subprocessos, não o tempo total de uma operação com várias etapas.

**Exemplo 1: Aplicação 1 de --timeout.**

```bash
setupvibe --timeout 10 doctor
```

**Exemplo 2: Aplicação 2 de --timeout.**

```bash
setupvibe --timeout 30 git verify
```

**Exemplo 3: Aplicação 3 de --timeout.**

```bash
setupvibe --timeout 60 service logs setupvibe-redis --follow
```

**Exemplo 4: Aplicação 4 de --timeout.**

```bash
setupvibe --timeout 120 updates list git
```

**Exemplo 5: Aplicação 5 de --timeout.**

```bash
setupvibe --timeout 600 git install --dry-run
```

### --no-color

Booleano, padrão false.

Desativa cores onde aplicável. Resultados do CLI já usam texto sem cor.

**Exemplo 1: Aplicação 1 de --no-color.**

```bash
setupvibe --no-color version
```

**Exemplo 2: Aplicação 2 de --no-color.**

```bash
setupvibe --no-color doctor
```

**Exemplo 3: Aplicação 3 de --no-color.**

```bash
setupvibe --no-color catalog list
```

**Exemplo 4: Aplicação 4 de --no-color.**

```bash
setupvibe --no-color state status
```

**Exemplo 5: Aplicação 5 de --no-color.**

```bash
setupvibe --no-color operation list
```

### --target-version

String opcional, até 100 caracteres, versão literal ou prefixo contendo número.

Somente mise. Não aceita aliases como latest. Install preserva existente e update troca a versão explicitamente.

**Exemplo 1: Aplicação 1 de --target-version.**

```bash
setupvibe component install node --target-version 24 --dry-run
```

**Exemplo 2: Aplicação 2 de --target-version.**

```bash
setupvibe component update node --target-version 24.22.1 --dry-run
```

**Exemplo 3: Aplicação 3 de --target-version.**

```bash
setupvibe component install python --target-version 3.13 --dry-run
```

**Exemplo 4: Aplicação 4 de --target-version.**

```bash
setupvibe component update ruby --target-version 3.4 --dry-run
```

**Exemplo 5: Aplicação 5 de --target-version.**

```bash
setupvibe component install java --target-version 21 --dry-run
```

### --help

Ação sem valor, aliases --help e -h.

Exibe ajuda do nível solicitado sem executar operação.

**Exemplo 1: Aplicação 1 de --help.**

```bash
setupvibe --help
```

**Exemplo 2: Aplicação 2 de --help.**

```bash
setupvibe catalog --help
```

**Exemplo 3: Aplicação 3 de --help.**

```bash
setupvibe collector run --help
```

**Exemplo 4: Aplicação 4 de --help.**

```bash
setupvibe service logs -h
```

**Exemplo 5: Aplicação 5 de --help.**

```bash
setupvibe metrics history --help
```

### --version

Ação sem valor, aliases --version e -V. Disponível na raiz.

Exibe versão como texto. Para JSON, use o subcomando version.

**Exemplo 1: Aplicação 1 de --version.**

```bash
setupvibe --version
```

**Exemplo 2: Aplicação 2 de --version.**

```bash
setupvibe -V
```

**Exemplo 3: Aplicação 3 de --version.**

```bash
setupvibe --edition server --version
```

**Exemplo 4: Aplicação 4 de --version.**

```bash
setupvibe --no-color --version
```

**Exemplo 5: Aplicação 5 de --version.**

```bash
setupvibe --non-interactive --version
```

## Opções locais

Estas flags só existem nos comandos relacionados. Datas, IDs e caminhos dos exemplos são ilustrativos. Em paginação, reutilize os cursores retornados pela primeira consulta.

### Opção local --role

String opcional server/agent, somente Portainer install. Padrão server. Agent usa porta padrão 9001 se nenhuma porta foi informada.

Disponível em [docker install](#setupvibe-docker-install), [git install](#setupvibe-git-install), [gh install](#setupvibe-gh-install), [portainer install](#setupvibe-portainer-install), [herdr install](#setupvibe-herdr-install), [codex install](#setupvibe-codex-install), [claude install](#setupvibe-claude-install), [antigravity install](#setupvibe-antigravity-install), [opencode install](#setupvibe-opencode-install), [kimi install](#setupvibe-kimi-install), [ansible install](#setupvibe-ansible-install), [tailscale install](#setupvibe-tailscale-install).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe portainer install --role agent --dry-run
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json portainer install --role agent --dry-run
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson portainer install --role agent --dry-run
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive portainer install --role agent --dry-run
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 portainer install --role agent --dry-run
```

### Opção local --option

String repetível CHAVE=VALOR. Chaves não se repetem. Inteiros e escolhas seguem o catálogo. Update de serviços não aceita reconfiguração.

Disponível em [docker install](#setupvibe-docker-install), [docker update](#setupvibe-docker-update), [git install](#setupvibe-git-install), [git update](#setupvibe-git-update), [gh install](#setupvibe-gh-install), [gh update](#setupvibe-gh-update), [portainer install](#setupvibe-portainer-install), [portainer update](#setupvibe-portainer-update), [herdr install](#setupvibe-herdr-install), [herdr update](#setupvibe-herdr-update), [codex install](#setupvibe-codex-install), [codex update](#setupvibe-codex-update), [claude install](#setupvibe-claude-install), [claude update](#setupvibe-claude-update), [antigravity install](#setupvibe-antigravity-install), [antigravity update](#setupvibe-antigravity-update), [opencode install](#setupvibe-opencode-install), [opencode update](#setupvibe-opencode-update), [kimi install](#setupvibe-kimi-install), [kimi update](#setupvibe-kimi-update), [ansible install](#setupvibe-ansible-install), [ansible update](#setupvibe-ansible-update), [tailscale install](#setupvibe-tailscale-install), [tailscale update](#setupvibe-tailscale-update), [component install](#setupvibe-component-install), [component update](#setupvibe-component-update).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe component install redis --option port=7000 --dry-run
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json component install redis --option port=7000 --dry-run
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson component install redis --option port=7000 --dry-run
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive component install redis --option port=7000 --dry-run
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 component install redis --option port=7000 --dry-run
```

### Opção local --interval

Inteiro 1..3600 segundos. Padrão 5 em install/render/run, obrigatório em configure. Não altera retenção.

Disponível em [collector install](#setupvibe-collector-install), [collector configure](#setupvibe-collector-configure), [collector render](#setupvibe-collector-render), [collector run](#setupvibe-collector-run).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe collector run --interval 5 --once --dry-run
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json collector run --interval 5 --once --dry-run
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson collector run --interval 5 --once --dry-run
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive collector run --interval 5 --once --dry-run
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 collector run --interval 5 --once --dry-run
```

### Opção local --scope

Enum opcional. Em coletor: user/system, padrão por edição. Em métricas: host/disk/container/source, ausente inclui todos.

Disponível em [collector install](#setupvibe-collector-install), [collector render](#setupvibe-collector-render), [metrics current](#setupvibe-metrics-current), [metrics history](#setupvibe-metrics-history).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe metrics current --scope host
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json metrics current --scope host
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson metrics current --scope host
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive metrics current --scope host
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 metrics current --scope host
```

### Opção local --platform

Enum linux/macos opcional. Padrão sistema atual. Somente renderização de unidade, sem instalação cruzada.

Disponível em [collector render](#setupvibe-collector-render).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe collector render --platform linux
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json collector render --platform linux
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson collector render --platform linux
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive collector render --platform linux
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 collector render --platform linux
```

### Opção local --once

Booleano, padrão false. Um ciclo do host e encerramento do ciclo Docker em curso. Incompatível com --samples.

Disponível em [collector run](#setupvibe-collector-run).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe collector run --once --dry-run
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json collector run --once --dry-run
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson collector run --once --dry-run
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive collector run --once --dry-run
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 collector run --once --dry-run
```

### Opção local --samples

Inteiro positivo opcional. Limita ciclos do host. Incompatível com --once.

Disponível em [collector run](#setupvibe-collector-run).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe collector run --samples 3 --dry-run
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json collector run --samples 3 --dry-run
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson collector run --samples 3 --dry-run
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive collector run --samples 3 --dry-run
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 collector run --samples 3 --dry-run
```

### Opção local --id

String opcional, identificador exato do recurso de métricas. Ausente não filtra ID.

Disponível em [metrics current](#setupvibe-metrics-current), [metrics history](#setupvibe-metrics-history).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe metrics current --id host
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json metrics current --id host
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson metrics current --id host
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive metrics current --id host
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 metrics current --id host
```

### Opção local --limit

Inteiro 1..1000, padrão 100, quantidade máxima por página.

Disponível em [metrics current](#setupvibe-metrics-current), [metrics history](#setupvibe-metrics-history), [operation list](#setupvibe-operation-list).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe operation list --limit 20
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json operation list --limit 20
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson operation list --limit 20
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive operation list --limit 20
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 operation list --limit 20
```

### Opção local --offset

Inteiro não negativo, padrão 0. Pula linhas. No histórico, offset positivo não pode ser combinado com after positivo. Prefira after/snapshot-id.

Disponível em [metrics current](#setupvibe-metrics-current), [metrics history](#setupvibe-metrics-history), [operation list](#setupvibe-operation-list).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe operation list --offset 20
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json operation list --offset 20
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson operation list --offset 20
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive operation list --offset 20
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 operation list --offset 20
```

### Opção local --max-age

Inteiro 1..604800, padrão 30 segundos. Define fresh em current. Aceito por history pelo schema compartilhado, sem filtrar seu período.

Disponível em [metrics current](#setupvibe-metrics-current), [metrics history](#setupvibe-metrics-history).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe metrics current --max-age 60
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json metrics current --max-age 60
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson metrics current --max-age 60
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive metrics current --max-age 60
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 metrics current --max-age 60
```

### Opção local --from

RFC3339 com fuso, opcional. Padrão última hora. Limitado à retenção de sete dias.

Disponível em [metrics history](#setupvibe-metrics-history).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe metrics history --from 2026-10-22T00:00:00Z
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json metrics history --from 2026-10-22T00:00:00Z
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson metrics history --from 2026-10-22T00:00:00Z
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive metrics history --from 2026-10-22T00:00:00Z
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 metrics history --from 2026-10-22T00:00:00Z
```

### Opção local --to

RFC3339 com fuso, opcional. Padrão agora. Amostras futuras são excluídas.

Disponível em [metrics history](#setupvibe-metrics-history).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe metrics history --to 2026-10-22T12:00:00Z
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json metrics history --to 2026-10-22T12:00:00Z
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson metrics history --to 2026-10-22T12:00:00Z
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive metrics history --to 2026-10-22T12:00:00Z
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 metrics history --to 2026-10-22T12:00:00Z
```

### Opção local --after

Inteiro não negativo, padrão 0. Cursor de ID retornado como next_after, até 9223372036854775807. Não combine valor positivo com offset positivo.

Disponível em [metrics history](#setupvibe-metrics-history).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe metrics history --after 10
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json metrics history --after 10
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson metrics history --after 10
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive metrics history --after 10
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 metrics history --after 10
```

### Opção local --snapshot-id

Inteiro opcional retornado na primeira página. Mantém limite de inserções entre páginas, sujeito à retenção. Aceita 0..9223372036854775807.

Disponível em [metrics history](#setupvibe-metrics-history).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe metrics history --snapshot-id 100
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json metrics history --snapshot-id 100
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson metrics history --snapshot-id 100
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive metrics history --snapshot-id 100
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 metrics history --snapshot-id 100
```

### Opção local --since

RFC3339 com fuso, opcional. Filtra logs a partir da data informada.

Disponível em [service logs](#setupvibe-service-logs).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe service logs setupvibe-redis --since 2026-10-22T00:00:00Z
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json service logs setupvibe-redis --since 2026-10-22T00:00:00Z
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson service logs setupvibe-redis --since 2026-10-22T00:00:00Z
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive service logs setupvibe-redis --since 2026-10-22T00:00:00Z
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 service logs setupvibe-redis --since 2026-10-22T00:00:00Z
```

### Opção local --follow

Booleano, padrão false. Acompanha logs até timeout, sinal ou encerramento da origem.

Disponível em [service logs](#setupvibe-service-logs).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe service logs setupvibe-redis --follow
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json service logs setupvibe-redis --follow
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson service logs setupvibe-redis --follow
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive service logs setupvibe-redis --follow
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 service logs setupvibe-redis --follow
```

### Opção local --tail

Inteiro 1..10000, padrão 100 linhas de log.

Disponível em [service logs](#setupvibe-service-logs).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe service logs setupvibe-redis --tail 20
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json service logs setupvibe-redis --tail 20
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson service logs setupvibe-redis --tail 20
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive service logs setupvibe-redis --tail 20
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 service logs setupvibe-redis --tail 20
```

### Opção local --advertise-addr

String obrigatória. Endereço do nó anunciado ao Swarm, validado antes da chamada Docker.

Disponível em [swarm init](#setupvibe-swarm-init).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe swarm init --advertise-addr 192.0.2.10 --dry-run
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json swarm init --advertise-addr 192.0.2.10 --dry-run
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson swarm init --advertise-addr 192.0.2.10 --dry-run
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive swarm init --advertise-addr 192.0.2.10 --dry-run
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 swarm init --advertise-addr 192.0.2.10 --dry-run
```

### Opção local --manager

String obrigatória HOST:PORT do manager, por exemplo 192.0.2.10:2377.

Disponível em [swarm join](#setupvibe-swarm-join).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe swarm join --manager 192.0.2.10:2377 --dry-run
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json swarm join --manager 192.0.2.10:2377 --dry-run
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson swarm join --manager 192.0.2.10:2377 --dry-run
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive swarm join --manager 192.0.2.10:2377 --dry-run
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 swarm join --manager 192.0.2.10:2377 --dry-run
```

### Opção local --token-stdin

Booleano, padrão false. Obrigatório na execução de join. O token é lido de stdin e não é argumento.

Disponível em [swarm join](#setupvibe-swarm-join).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe swarm join --manager 192.0.2.10:2377 --token-stdin --dry-run
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json swarm join --manager 192.0.2.10:2377 --token-stdin --dry-run
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson swarm join --manager 192.0.2.10:2377 --token-stdin --dry-run
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive swarm join --manager 192.0.2.10:2377 --token-stdin --dry-run
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 swarm join --manager 192.0.2.10:2377 --token-stdin --dry-run
```

### Opção local --destination

Caminho obrigatório para arquivo novo de backup. Destino existente é recusado.

Disponível em [state backup](#setupvibe-state-backup).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe state backup --destination /caminho/privado/backup.db --dry-run
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json state backup --destination /caminho/privado/backup.db --dry-run
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson state backup --destination /caminho/privado/backup.db --dry-run
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive state backup --destination /caminho/privado/backup.db --dry-run
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 state backup --destination /caminho/privado/backup.db --dry-run
```

### Opção local --file

Caminho opcional de catálogo JSON a validar. Não substitui o catálogo embarcado para execução.

Disponível em [catalog validate](#setupvibe-catalog-validate).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe catalog validate --file catalog/components.json
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json catalog validate --file catalog/components.json
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson catalog validate --file catalog/components.json
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive catalog validate --file catalog/components.json
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 catalog validate --file catalog/components.json
```

### Opção local --snapshot

Booleano, padrão false. Renderiza frame de diagnóstico sem TTY e sem mutações.

Disponível em [tui](#setupvibe-tui).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe tui --snapshot
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json tui --snapshot
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson tui --snapshot
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive tui --snapshot
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 tui --snapshot
```

### Opção local --width

Inteiro 50..240, padrão 129, largura usada por snapshot.

Disponível em [tui](#setupvibe-tui).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe tui --snapshot --width 80
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json tui --snapshot --width 80
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson tui --snapshot --width 80
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive tui --snapshot --width 80
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 tui --snapshot --width 80
```

### Opção local --height

Inteiro 18..100, padrão 44, altura usada por snapshot.

Disponível em [tui](#setupvibe-tui).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe tui --snapshot --height 24
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json tui --snapshot --height 24
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson tui --snapshot --height 24
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive tui --snapshot --height 24
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 tui --snapshot --height 24
```

### Opção local --tab

Inteiro 0..5, padrão 0: Home, Aplicativos, Serviços, Métricas, Histórico, Sobre.

Disponível em [tui](#setupvibe-tui).

**Exemplo 1: Consultar ou revisar no terminal.**

```bash
setupvibe tui --snapshot --tab 3
```

**Exemplo 2: Consumir a resposta JSON.**

```bash
setupvibe --output json tui --snapshot --tab 3
```

**Exemplo 3: Receber NDJSON.**

```bash
setupvibe --output ndjson tui --snapshot --tab 3
```

**Exemplo 4: Usar sem interação.**

```bash
setupvibe --non-interactive tui --snapshot --tab 3
```

**Exemplo 5: Limitar espera de subprocessos.**

```bash
setupvibe --timeout 10 tui --snapshot --tab 3
```

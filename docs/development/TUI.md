# Interface de terminal

> TUI Desktop e Server da v2. Ratatui 0.29 e Crossterm 0.28, com execução pelo núcleo do CLI.

## Abrir e navegar

```bash
setupvibe
setupvibe tui
setupvibe --edition server tui
setupvibe --data-dir /caminho/privado/setupvibe tui --tab 3
```

Sem subcomando, um terminal interativo abre a TUI. Stdin e stdout precisam ser
terminais; automações devem usar comandos individuais com JSON/NDJSON.
`--non-interactive` não abre a interface. `--dry-run` e `--target-version`
pertencem aos comandos individuais; a TUI tem sua própria revisão de alterações.
`--yes` fornecido ao iniciar a TUI não dispensa a confirmação de cada operação.

O campo superior mostra a edição e o diretório de dados. Tab dá foco ao campo;
Enter permite editar o caminho absoluto. A mudança recarrega somente o contexto
de consulta. Não move bancos nem reconfigura o coletor instalado. E alterna a
edição e limpa a seleção de componentes. Server mostra somente Git, gh, Docker,
Portainer, Tailscale e coletor, respeitando as mesmas restrições do CLI.

| Tecla | Ação |
| --- | --- |
| Ctrl+Q | Sair; se houver operação, solicita cancelamento e aguarda o encerramento |
| Ctrl+C | Cancelar a operação atual e manter a TUI aberta |
| Esc | Descartar revisão/edição ou voltar à Home |
| Tab / Shift+Tab | Campo, atualização, abas, lista e detalhes |
| Setas / J / K | Navegar na lista ou rolar detalhes conforme foco |
| PageUp / PageDown | Rolar o painel de detalhes |
| Ctrl+U | Atualizar a leitura da área atual |
| Ctrl+G / Ctrl+A / Ctrl+T | Home, Aplicativos, Serviços |
| Ctrl+R / Ctrl+O / Ctrl+B | Métricas, Histórico, Sobre |
| P | Preparar seleção inicial de componentes |
| `:` | Abrir uma operação avançada para revisão |

O mouse seleciona abas e linhas, abre o campo de diretório e aciona Atualizar.
A roda rola detalhes. Não existe alteração persistente ao abrir uma aba.
Quando há operação, mudanças de contexto ficam indisponíveis até ela terminar;
cancelamento permanece acessível. Erros aparecem no rodapé e nos detalhes.

## Telas

| Aba | Conteúdo e finalidade |
| --- | --- |
| Home | Componentes da edição, registros locais de instalação, CPU e RAM do host |
| Aplicativos | Seleção, catálogo, dependências, opções, inspeção e atualizações |
| Serviços | Containers e serviços Swarm descobertos, detalhes, logs e controle |
| Métricas | Últimas amostras, atualidade, histórico por recurso e status do coletor |
| Histórico | Até cem operações recentes e detalhes de cada resultado |
| Sobre | Versão, edição, limites do produto e atalhos |

A Home mostra `Sem amostra` quando os dados estão ausentes ou desatualizados.
Não mostra zero como substituto de ausência. O número de instalações representa
observações gravadas no estado local, não uma varredura completa do host. Enter
em um aplicativo consulta a instalação real pelos adaptadores.

## Preparação e aplicativos

P abre Aplicativos com uma seleção inicial. Na Server, seleciona os seis
componentes permitidos. Na Desktop, seleciona Git, gh, Docker, Portainer,
Tailscale, coletor, mise, Node.js e Python. A seleção é ajustável antes de
qualquer alteração; nenhum programa é instalado por pressionar P.

| Tecla em Aplicativos | Comportamento |
| --- | --- |
| Espaço | Marcar ou desmarcar componente |
| Enter | Inspecionar instalação atual da linha |
| I | Planejar instalação dos marcados ou da linha atual |
| U | Planejar atualização dos marcados ou da linha atual |
| V | Verificar os marcados ou a linha atual |
| D | Consultar atualizações pelo gerenciador proprietário |
| O | Editar opções do componente atual em objeto JSON |

O editor de opções carrega os padrões do catálogo e seleciona somente o
componente atual. Exemplos: portas/bind, papel Portainer, implantação Swarm e
intervalo do coletor. Ctrl+U limpa o campo; Enter confirma a edição; Esc descarta.
Valores passam novamente pela validação do planejador antes da execução.

Exemplo de Portainer standalone com acesso somente local:

```json
{"bind":"127.0.0.1","deployment":"standalone","port":9443,"role":"server"}
```

O modo Swarm exige bind compatível e nó manager; não é equivalente à publicação
loopback de container standalone. Veja [Docker e Swarm](DOCKER.md). Opções de
instalação não são usadas para reconfigurar um serviço durante atualização.

## Revisão, execução e falhas

Fluxo: selecionar → solicitar instalação/atualização → aguardar prévia → revisar
plano, dependências e comandos → Enter para executar ou Esc para descartar →
acompanhar etapas → consultar resultado e histórico.

A prévia não escreve bancos. Um plano com `ready: false` não oferece confirmação
de execução. A confirmação usa os mesmos argumentos revisados e acrescenta
`--yes` ao CLI interno. O executor volta a observar o ambiente antes de alterar;
mudanças externas entre prévia e execução podem causar recusa.

A interface mostra carregamento, componente em execução, resultados de etapas
e falhas. Não há percentual inventado quando o instalador não informa progresso.
Mutações concorrentes continuam sujeitas aos locks do núcleo. Falhas parciais
preservam sucessos e registram o resultado de cada componente.

Ctrl+C envia SIGINT ao CLI interno. Ele encerra seus subprocessos e grava o
cancelamento conforme o contrato da operação. Ctrl+Q solicita o mesmo
cancelamento antes de sair. Operações não são retomadas automaticamente.
SIGKILL, queda de energia ou encerramento forçado do terminal ainda exigem
reconciliação do estado; não há promessa de rollback universal.

## Serviços e métricas

Em Serviços: Enter inspeciona, S inicia, T para, R reinicia, L consulta os últimos
logs e W consulta o Swarm. Alterações sempre passam pela prévia e confirmação.
Propriedade, edição e capacidades são verificadas pelo núcleo. Um serviço
externo pode ser observado sem ser adotado. Serviço Swarm global não oferece
start/stop como se fosse um container isolado.

Em Métricas: Enter abre a amostra, H consulta a última hora do recurso
selecionado e C consulta o supervisor do coletor. A leitura inicial mostra até
cem recursos. Para períodos ou páginas adicionais, use o CLI descrito no
[contrato de métricas](METRICS.md). A TUI não precisa estar aberta para coletar.
Fechá-la não para o serviço independente.

O histórico visual também mostra até cem operações. O CLI oferece paginação
completa. Logs em acompanhamento contínuo e filtros de data ficam no CLI;
a TUI oferece a consulta finita para manter a navegação disponível.

## Operações avançadas

O campo aberto com `:` aceita uma lista JSON de argumentos, sem shell. Ele
oferece revisão antes de acrescentar confirmação. Exemplos:

```json
["collector","install","--interval","5"]
["collector","configure","--interval","10"]
["collector","stop"]
["collector","restart"]
["swarm","init","--advertise-addr","192.0.2.10"]
["portainer","install","--role","agent"]
```

Flags globais, `--yes`, credenciais e comandos fora das operações permitidas
são recusados. Associação ao Swarm continua no CLI com `--token-stdin`; a TUI
não pede token em um campo que possa aparecer em captura ou histórico.
Tailscale permanece limitado a instalar, verificar e atualizar.

## Arquitetura e diagnóstico

`src/tui/mod.rs` controla foco, seleção, revisão e mensagens. `view.rs` renderiza
o shell; `theme.rs` concentra os tokens; `job.rs` inicia o mesmo executável em
modo NDJSON, sem shell e sem stdin interativo. Assim, TUI e CLI compartilham
planejador, adaptadores, locks, histórico e códigos de resultado.

O canal entre interface e processo tem fila limitada; cada linha de evento
aceita até 2 MiB. A interface restaura o terminal ao sair. A consulta inicial
do SQLite é local; consultas externas usam processo separado para não prender
a navegação durante downloads ou inspeções.

```bash
setupvibe --output json tui --snapshot --width 129 --height 44 --tab 1
npm run capture:tui
```

`--snapshot` renderiza o mesmo frame em TestBackend e retorna linhas, células e
tokens. Não executa mutações. As capturas usam esse frame, convertido para
SVG/PNG com Playwright, sem redesenhar a interface ou acrescentar moldura falsa.
Para gerá-las, instale dependências de desenvolvimento e Chromium do Playwright.

## Contrato visual e comprovação

A referência é `TUI-DESIGN-SYSTEM.md` no Hub e a TUI do Specsfy. O SetupVibe
preserva cabeçalho roxo, identificador com borda, botão Atualizar, abas, conteúdo
e três linhas de rodapé. Em telas largas, lista e detalhes ficam lado a lado;
em 80 colunas, ficam empilhados. O layout mínimo reduzido é 50x18.

Tokens têm nomes semânticos e fonte única em `theme.rs`. A fonte é a monospace
configurada no terminal. Foco muda cor/borda sem alterar geometria. Estados de
carregamento, erro e conclusão também usam texto; não dependem somente de cor.
A atualização é explícita, sem animações ou polling que altere seleção.

Testes Node verificam 80x24, 129x44 e 160x50 nas duas edições e em todas as abas,
contraste WCAG AA dos pares de texto, navegação por teclado/mouse em PTY real,
ausência de escrita antes da confirmação e execução com histórico. Também
verificam cancelamento e independência do coletor.

Capturas para revisão:

- [Home Desktop](../assets/tui/desktop-home.png).
- [Aplicativos Desktop](../assets/tui/desktop-apps.png).
- [Aplicativos Server em 80x24](../assets/tui/server-apps.png).
- [Métricas em 160x50](../assets/tui/metrics.png).

Hallmark foi aplicado à hierarquia, estados, contraste e contenção visual.
Regras de CSS, fontes web, navegação de site e rotação de temas não substituem
o contrato obrigatório de terminal do Hub. Não foram criados site, hero,
depoimentos, métricas fictícias ou identidade visual nova.

## Referências

- [Ratatui 0.29](https://docs.rs/ratatui/0.29.0/ratatui/).
- [Crossterm 0.28](https://docs.rs/crossterm/0.28.1/crossterm/).
- [Execução e automação](CLI.md).
- [Supervisão e agentes](SUPERVISION-AGENTS.md).

## Revisão visual registrada

Hallmark · pre-emit critique: P4 H4 E4 S5 R5 V3.
A avaliação é qualitativa, não substitui testes. Quatro capturas foram revistas:
ações e foco têm hierarquia legível; a Server mantém seis componentes; métricas
vazias não inventam valores; os rodapés permanecem fixos. O scrollbar aparece
somente quando o conteúdo excede o painel. O layout estreito permite rolar os
detalhes sem esconder a navegação. Não há decoração sem função operacional.
O registro de contexto está em `.hallmark/preflight.json` e `.hallmark/log.json`.

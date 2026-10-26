# Implementação do SetupVibe 2

> Atualizado em 22/10/2026. Branch v2. Implementação local concluída.

## Escopo autorizado

Implementar o produto completo, retirar legado da branch, decidir detalhes
sem novas perguntas e manter documentação no repositório, no Hub e no ClickUp.
Não há autorização para commit, push ou publicação remota nesta execução.

## Entregas

| Entrega | Tarefa | Estado |
| --- | --- | --- |
| 01. Consolidar contratos e preparar a branch v2 | [Acompanhar](https://app.clickup.com/t/17tr6jh0pmc) | Concluída |
| 02. Implementar catálogo embarcado e planejador | [Acompanhar](https://app.clickup.com/t/17tr6jh0pmd) | Concluída |
| 03. Implementar estado SQLite e reconciliação | [Acompanhar](https://app.clickup.com/t/17tr6jh0pme) | Concluída |
| 04. Implementar CLI e contratos de automação | [Acompanhar](https://app.clickup.com/t/17tr6jh0pmf) | Concluída |
| 05. Implementar adaptadores e atualizações | [Acompanhar](https://app.clickup.com/t/17tr6jh0pmg) | Concluída |
| 06. Implementar aplicativos essenciais | [Acompanhar](https://app.clickup.com/t/17tr6jh0pmh) | Concluída |
| 07. Implementar Docker, Swarm e serviços | [Acompanhar](https://app.clickup.com/t/17tr6jh0pmj) | Concluída |
| 08. Implementar Tailscale restrito | [Acompanhar](https://app.clickup.com/t/17tr6jh0pmk) | Concluída |
| 09. Implementar coletor e métricas | [Acompanhar](https://app.clickup.com/t/17tr6jh0pmm) | Concluída |
| 10. Implementar supervisão e consultas de agentes | [Acompanhar](https://app.clickup.com/t/17tr6jh0pmn) | Concluída |
| 11. Implementar TUI completa | [Acompanhar](https://app.clickup.com/t/17tr6jh0pmp) | Concluída |
| 12. Implementar bootstrap e distribuição | [Acompanhar](https://app.clickup.com/t/17tr6jh0pmq) | Concluída |
| 13. Validar integração e cenários de aceitação | [Acompanhar](https://app.clickup.com/t/17tr6jh0pmr) | Concluída |
| 14. Atualizar documentação e auditar entrega v2 | [Acompanhar](https://app.clickup.com/t/17tr6jh0pmt) | Concluída |

As datas no ClickUp são previsões iniciais entre 22 e 28/10/2026.
Não são comprovação de entrega. Cronômetros medem somente trabalho executado.

## Estado atual

Implementação local 2.0.0-alpha.1 concluída nos módulos Rust, catálogo, adaptadores,
SQLite, CLI, TUI, Docker/Swarm, aplicativos, Tailscale, coletor e supervisão.
Bootstrap e distribuição produzem binários musl Desktop/Server verificados em
Debian 12/13 e Ubuntu 24.04 amd64. Os arquivos legados foram retirados desta branch.

A aceitação passou com 110 testes e 10 integrações. A referência documenta 97
entradas de ajuda, 75 comandos finais e cinco exemplos por entrada. O verificador
confere superfície real, contratos autorados, links e contexto de agentes.

As 15 partes no ClickUp, o índice principal e os registros de status, datas,
comentários e tempo foram conferidos. macOS e ARM ainda exigem
execução em seus ambientes. Git, releases e website não foram publicados.

## Retomada

Leia contratos e mapa de aceitação. Confira Git, tarefa ativa e comentários
antes de editar. Valide cada entrega antes de concluí-la. Atualize esta página
e as páginas ClickUp ao mudar o estado implementado.

## Segunda rodada

A [revisão de 23/10/2026](ROUND-2.md) corrige paginação e respostas vazias de
métricas, além de ampliar a conferência da documentação. A tarefa
[Rodada 2](https://app.clickup.com/t/17tr6jh3777) registra execução e revisão.

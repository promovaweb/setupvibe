# Documentação do SetupVibe 2

A versão local 2.0.0-alpha.1 implementa o produto descrito nestas páginas.
Leia o [guia de uso](user/README.md) para preparar um ambiente e a
[referência completa](cli/REFERENCE.md) para automação.

## Assuntos

| Parte | Documentação |
| --- | --- |
| 01. Produto e requisitos | [Ler](development/PRODUCT.md) |
| 02. Edições e compatibilidade | [Ler](development/COMPATIBILITY.md) |
| 03. Instalação e distribuição | [Ler](development/DISTRIBUTION.md) |
| 04. Arquitetura técnica | [Ler](development/ARCHITECTURE.md) |
| 05. Catálogo JSON embarcado | [Ler](development/CATALOG.md) |
| 06. TUI e navegação | [Ler](development/TUI.md) |
| 07. CLI e automação | [Ler](development/CLI.md) |
| 08. Instalação e atualizações | [Ler](development/ADAPTERS.md) |
| 09. Aplicativos essenciais | [Ler](development/APPLICATIONS.md) |
| 10. Docker, Swarm e serviços | [Ler](development/DOCKER.md) |
| 11. SQLite e estado local | [Ler](development/STATE.md) |
| 12. Coletor e métricas | [Ler](development/METRICS.md) |
| 13. Integração com agentes | [Ler](development/SUPERVISION-AGENTS.md) |
| 14. Tailscale | [Ler](development/TAILSCALE.md) |
| 15. Validação e implementação | [Ler](development/ACCEPTANCE.md) |

## Manutenção

[Contratos](development/CONTRACTS.md), [tarefas](development/IMPLEMENTATION.md),
[registro de validação](development/VALIDATION.json) e
[mapeamento ClickUp](development/CLICKUP.json) mantêm o contexto da implementação.
O CLI tem sua [superfície extraída](cli/surface.json) e cinco exemplos por entrada.
Execute `npm run docs:check` ao alterar comandos ou seus contratos.

O [ClickUp](https://app.clickup.com/9007154145/v/dc/8cdwgz1-16513/8cdwgz1-28593)
contém as mesmas 15 partes. O repositório conserva também código, testes,
capturas da TUI e referência detalhada para agentes.

A [segunda rodada de aperfeiçoamento](development/ROUND-2.md) registra correções
e validações posteriores à implementação inicial.

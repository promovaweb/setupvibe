---
name: setupvibe-v2-maintenance
description: Mantém código, testes, documentação e tarefas do SetupVibe 2. Use ao alterar CLI, TUI, catálogo, adaptadores, coletor, bootstrap ou contexto de agentes da branch v2.
---

# Manter o SetupVibe 2

Os caminhos abaixo são relativos à raiz deste repositório independente.

1. Leia `AGENTS.md`, `docs/development/CONTRACTS.md` e `docs/development/ACCEPTANCE.md`.
2. Confira a branch e mudanças locais. Preserve trabalho existente.
3. Leia tarefa e comentários no ClickUp. Use o MCP, mova para andamento, inicie cronômetro e registre o plano.
4. Localize código, teste e página pelo índice `docs/README.md`. Compartilhe o núcleo entre CLI e TUI.
5. Preserve instalações externas, configurações, credenciais e volumes. Nunca instale pacotes no host para testar.
6. Use Rust para o produto e Node.js para scripts e testes. Execute mutações de teste em ambientes descartáveis.
7. Atualize o contrato autorado em `scripts/manual-source.mjs` quando mudar comandos. Rode `npm run docs:generate` e `npm run docs:check`.
8. Rode `npm run check`, `npm test` e integrações pertinentes. Bootstrap exige `npm run bootstrap:check`. Registre plataforma realmente executada.
9. Atualize a página ClickUp indicada por `docs/development/CLICKUP.json` e releia o conteúdo salvo. Comente resultados, revise, conclua e pare o cronômetro.
10. Confira o Git ao terminar. Publicação precisa de autorização própria, versão, changelog, tag e release.

Server contém apenas Docker/Swarm, Portainer, Git, gh, Tailscale e coletor.
Tailscale oferece somente instalar, verificar e atualizar. Retenção de métricas
é fixa em sete dias. Dados ausentes não representam zero. Consultar recursos
não aplica limites de CPU ou memória.

Atualize `AGENTS.md` e `CLAUDE.md` juntos. Preserve esta skill nas duas pastas
de agentes. Não declare macOS ou ARM testados sem executar nesses sistemas.

# Plano do SetupVibe 2

Planejamento de 4 de novembro de 2026. Implementação em andamento.

## Tecnologia e escopo

O produto usará Bun como runtime, TypeScript e OpenTUI na interface de
terminal. CLI e TUI compartilham catálogo, planejamento, execução e
verificação. A escolha entre Core direto, React ou Solid será validada na
etapa 02, junto às dependências nativas e ao empacotamento.

Desktop inclui mise para runtimes, aplicativos e serviços locais. Server
fica restrito a Docker/Swarm, Portainer, Git, gh, Tailscale e coletor.
O produto preserva configurações existentes e apresenta uma prévia antes de
executar alterações. SQLite armazena estado e métricas em bancos separados.
O coletor roda independentemente da TUI e retém sete dias de métricas.
Tailscale oferece instalação, verificação e atualização.

## Sequência de execução

As 12 tarefas foram criadas em 4 de novembro de 2026. As etapas 01 a 10 estão em andamento; as demais permanecem em
nao iniciado, sem datas de início ou vencimento. Cada etapa contém entregas,
verificações, documentação e links para a etapa anterior e seguinte.

- [01 | Definir produto, edições e compatibilidade](https://app.clickup.com/t/17tr6jh7mq3).
- [02 | Estruturar Bun, TypeScript e OpenTUI](https://app.clickup.com/t/17tr6jh7mq2).
- [03 | Implementar catálogo e planejamento](https://app.clickup.com/t/17tr6jh7mq1).
- [04 | Implementar persistência e execução de operações](https://app.clickup.com/t/17tr6jh7mq0).
- [05 | Implementar CLI e automação](https://app.clickup.com/t/17tr6jh7mpz).
- [06 | Implementar instalação, mise e atualizações](https://app.clickup.com/t/17tr6jh7mpy).
- [07 | Implementar Docker, Swarm e serviços](https://app.clickup.com/t/17tr6jh7mpx).
- [08 | Implementar métricas, coletor e supervisão](https://app.clickup.com/t/17tr6jh7mpw).
- [09 | Construir a TUI completa com OpenTUI](https://app.clickup.com/t/17tr6jh7mpv).
- [10 | Implementar bootstrap e distribuição](https://app.clickup.com/t/17tr6jh7mpu).
- [11 | Homologar os fluxos e corrigir falhas](https://app.clickup.com/t/17tr6jh7mpt).
- [12 | Conferir manual e preparar a release](https://app.clickup.com/t/17tr6jh7mpr).

## Estado do código

A branch v2 parte da main no commit e86a16d. Os scripts Shell e PowerShell
presentes pertencem à geração publicada. A aplicação Bun está parcialmente implementada. Consulte
[DESENVOLVIMENTO.md](docs/v2/DESENVOLVIMENTO.md) para comandos e limitações. Não instale ferramentas no host para testar
o instalador. Use ambientes isolados.

Os scripts operacionais do Hub continuam em Node.js. Bun é o runtime do
produto SetupVibe. Preserve a main e as releases publicadas.

## Referências

- [Lista de tarefas](https://app.clickup.com/9007154145/v/l/6-1400510000002240-1).
- [Documentação e subpáginas](https://app.clickup.com/9007154145/v/dc/8cdwgz1-16513/8cdwgz1-28573).
- [OpenTUI](https://opentui.com/docs/).

As 17 páginas do ClickUp descrevem o planejamento atual. A matriz pretendida
precisa ser homologada por sistema e arquitetura antes de anunciar suporte.
A etapa 12 prepara a release; publicação exige autorização.

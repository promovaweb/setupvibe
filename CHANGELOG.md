# Changelog do SetupVibe 2

## 2.0.0-alpha.1 (não publicada)

### Segunda rodada de aperfeiçoamento

- Corrigida a validação de cursores de métricas antes da leitura do banco.
- Recusada a combinação de cursor e deslocamento positivos para evitar omissão de registros.
- Uniformizados os metadados das consultas vazias com e sem banco existente.
- Ampliada a conferência de links do manual para detectar seções ausentes.
- Vinculada a versão do manual diretamente ao Cargo.toml.

### Implementação inicial

- Implementado núcleo Rust compartilhado por CLI e TUI, com catálogo JSON embarcado e edições Desktop/Server.
- Implementados planejamento, prévia, confirmação explícita, cancelamento, timeout, JSON/NDJSON e histórico de operações.
- Adicionados adaptadores APT, Homebrew, mise e fornecedores, com descoberta de proprietário e preservação de instalações existentes.
- Implementados aplicativos essenciais, Docker Engine, Swarm, Portainer e serviços Desktop com persistência e recuperação de atualização.
- Limitado Tailscale a instalação, verificação e atualização.
- Implementados SQLite com migrações, WAL, reconciliação, backup de estado e controle de concorrência.
- Adicionados coletor independente, métricas de host/containers, retenção de sete dias e supervisão systemd/launchd.
- Implementada TUI com seis telas, teclado, mouse, revisão e acompanhamento de operações.
- Adicionados bootstraps Desktop/Server, verificação SHA-256, binários musl e matriz CI Linux/macOS.
- Retirados scripts, configurações, manuais e skills da geração anterior desta branch.
- Documentados 15 assuntos, guia de uso, referência completa de comandos, contexto de agentes e acompanhamento no ClickUp.
- Validados 105 testes e 10 integrações, incluindo fornecedores, Docker/Swarm, supervisor, Tailscale e distribuição HTTPS em Linux amd64.

Consulte [aceitação](docs/development/ACCEPTANCE.md) para resultados e limitações.
macOS e ARM ainda exigem execução em seus próprios ambientes. Nenhuma release,
tag ou publicação remota foi criada por esta implementação local.

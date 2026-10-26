# SetupVibe 2

SetupVibe prepara e gerencia ambientes Desktop e Server por CLI e TUI em Rust.
A branch `v2` contém a implementação `2.0.0-alpha.1`, com catálogo embarcado,
instalação e atualização por proprietário, Docker/Swarm, SQLite e coletor independente.

A implementação local passou em **110 testes e 10 integrações**. Os binários Linux
amd64 foram exercitados em Debian 12/13 e Ubuntu 24.04. macOS e ARM têm alvos e
workflows preparados, mas ainda exigem execução nessas plataformas. Esta versão
não foi publicada e os domínios de instalação ainda não representam sua entrega.

## Começar

Requisitos de desenvolvimento: Rust 1.94+, Node.js 22+ e dependências de compilação.

```bash
npm ci
npm run build
./target/debug/setupvibe version
./target/debug/setupvibe doctor
./target/debug/setupvibe tui
```

Para automação ou SSH:

```bash
./target/debug/setupvibe --edition server --output json catalog list
./target/debug/setupvibe --edition server component install git gh --dry-run
./target/debug/setupvibe --edition server component install git gh --yes
```

O último comando altera o ambiente. Revise a prévia e as permissões necessárias.
A [orientação de uso](docs/user/README.md) apresenta instalação, seleção,
atualização, serviços, métricas e recuperação de falhas.

## Edições

| Edição | Conteúdo |
| --- | --- |
| Desktop | 26 componentes, incluindo runtimes, assistentes, Herdr, Ansible, Git, gh, Docker, serviços locais e coletor |
| Server | Docker Engine/Swarm, Portainer Server/Agent, Git, gh, Tailscale e coletor nativo |

A Server não inclui assistentes, bancos de desenvolvimento nem stacks extras de
monitoramento. Tailscale oferece somente instalação, verificação e atualização.
Métricas permanecem por sete dias. Configurações, credenciais e volumes existentes
são preservados. Veja a [matriz de compatibilidade](docs/development/COMPATIBILITY.md).

## Documentação

- [Índice dos 15 assuntos](docs/README.md).
- [Referência completa do CLI](docs/cli/REFERENCE.md).
- [Arquitetura](docs/development/ARCHITECTURE.md) e [contratos](docs/development/CONTRACTS.md).
- [Aceitação e resultados](docs/development/ACCEPTANCE.md) e [segunda rodada](docs/development/ROUND-2.md).
- [Tarefas e acompanhamento](docs/development/IMPLEMENTATION.md).
- [Contexto para agentes](AGENTS.md) e [contribuição](CONTRIBUTING.md).
- [Visão Geral da Versão 2.0 no ClickUp](https://app.clickup.com/9007154145/v/dc/8cdwgz1-16513/8cdwgz1-28593).

## Verificar e distribuir

```bash
npm run check
npm test
npm run docs:check
npm run bootstrap:check
npm run build:linux
npm run test:integration
```

As integrações exigem Docker e rede. Usam ambientes descartáveis, sem instalar
pacotes ou serviços no host. `build:linux` produz artefatos musl e checksums em
`dist/`. [Distribuição](docs/development/DISTRIBUTION.md) detalha bootstrap,
alvos, CI e limites. A versão vem de `Cargo.toml` e dependências ficam fixadas
em `Cargo.lock` e `package-lock.json`.

Scripts e manuais da geração anterior foram retirados desta branch. O histórico
Git preserva essa geração. Marca e ativos oficiais ficam em [brand/](brand/README.md).
Código sob [GPL v3](LICENSE).

# Contexto do SetupVibe 2 para agentes

Este repositório independente contém a geração 2 na branch `v2`.
Não restaure scripts legados como fallback de instalação.
Responda, documente e escreva interface em Português do Brasil.

## Ordem de leitura

1. [README.md](README.md) e `Cargo.toml`.
2. [Contratos](docs/development/CONTRACTS.md).
3. [Implementação e tarefas](docs/development/IMPLEMENTATION.md).
4. [Aceitação e resultados](docs/development/ACCEPTANCE.md).
5. [Guia de uso](docs/user/README.md) e [referência CLI](docs/cli/REFERENCE.md).
6. Código, testes e referência do módulo alterado.

## Implementação

- Preserve alterações locais; confira o Git antes e depois do trabalho.
- Compartilhe catálogo, plano, execução e verificação entre CLI e TUI.
- Passe argumentos de subprocessos separadamente. Não avalie texto do
  catálogo em shell nem persista segredos.
- Recuse componentes fora da edição antes de resolver suas dependências.
- Não adote instalações externas nem substitua configurações silenciosamente.
- Colete métricas em processo separado com retenção fixa de sete dias.
- Tailscale não gerencia login, Serve, Services ou Funnel.
- Use Node.js para automação e testes de integração; não use Python.
- Testes não devem instalar pacotes no host. Use diretórios temporários,
  executáveis de teste e ambientes descartáveis para mutações.
- Bootstrap Bash exige `bash -n` e `shellcheck`.
- Não faça commit, push, tag ou publicação sem autorização correspondente.

## Documentação e acompanhamento

Atualize contratos e manual junto de qualquer comportamento novo.
Distinga implementação, teste local, teste isolado e homologação de plataforma.
Não declare suporte testado por inferência.

Tarefas: lista ClickUp `1400510000002240`, workspace `9007154145`.
Ao executar: ler tarefa e comentários, mover para `em andamento`, iniciar
cronômetro e publicar plano. Após verificar: comentar resultado, mover para
`revisar`, auditar, concluir e parar cronômetro.
O usuário autorizou concluir tarefas e escolher detalhes sem novas perguntas.

Mantenha este arquivo e `CLAUDE.md` alinhados. Skills da v2 devem existir nas
duas pastas de agentes com referências locais completas.
Markdown segue [MARKDOWN.md](MARKDOWN.md). A versão vem de `Cargo.toml`;
publicações exigem changelog, tag e GitHub Release.

## Mapa de manutenção

A v2 está implementada localmente. Leia os limites de plataforma em
[compatibilidade](docs/development/COMPATIBILITY.md). O mapa de módulos está em
[arquitetura](docs/development/ARCHITECTURE.md). Use a skill
[setupvibe-v2-maintenance](.codex/skills/setupvibe-v2-maintenance/SKILL.md).

Ao mudar comandos, atualize `scripts/manual-source.mjs` e execute
`npm run docs:generate` e `npm run docs:check`. O mapeamento das 15 páginas
remotas está em `docs/development/CLICKUP.json`. A referência inclui cinco
exemplos por comando. A ajuda sozinha não substitui o contrato de uso.

Binários em `dist/` e workflows CI não significam release publicada.
Não use testes simulados para afirmar homologação física de macOS ou ARM.

# Contribuir com o SetupVibe 2

Leia [AGENTS.md](AGENTS.md), preserve mudanças locais e vincule a entrega à tarefa
ClickUp. A versão canônica vem de `Cargo.toml`. Não restaure código legado para
contornar uma falha da v2.

## Preparação e verificação

```bash
npm ci
npm run build
npm run check
npm test
npm run docs:check
npm run bootstrap:check
```

Rust 1.94+ compila o produto. Node.js 22+ executa scripts e testes. Não use Python.
Testes de instalação usam ambientes descartáveis. Não modifique pacotes, contas
ou serviços do host para validar uma alteração.

Integrações exigem Docker, rede e espaço para imagens. A distribuição precisa
ser construída antes de seus testes:

```bash
npm run build:linux
npm run test:integration
npm run capture:tui
```

O [mapa de aceitação](docs/development/ACCEPTANCE.md) relaciona cenários, testes e
plataformas. Não transforme um teste com mock em comprovação de instalação real.

## Atualizar contratos e manuais

Comportamento novo exige documentação de parâmetros, saída, permissões, efeitos
e falhas. Mantenha `scripts/manual-source.mjs` alinhado com o CLI e regenere:

```bash
npm run docs:generate
npm run docs:check
```

O verificador compara a árvore de ajuda com 97 entradas atuais, cobra cinco
exemplos por entrada e confere arquivos e âncoras de links locais.
A versão do manual vem diretamente de `Cargo.toml`. Novos comandos precisam de contrato
autorado, além da ajuda. Consulte [arquitetura](docs/development/ARCHITECTURE.md).

Atualize a página ClickUp correspondente, comente a tarefa e registre o tempo real.
Mantenha `AGENTS.md` e `CLAUDE.md` alinhados. A skill `setupvibe-v2-maintenance`
existe nas duas pastas de agentes e orienta o fluxo de manutenção.

Publicação exige autorização, versão, changelog, tag e GitHub Release. Build local,
artefatos CI e conclusão de tarefa não equivalem a publicação.

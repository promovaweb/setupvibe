---
name: make-changelog
description: Gerencia e automatiza a criação de entradas no CHANGELOG.md seguindo o padrão Keep a Changelog. Extrai mudanças do histórico do Git, categoriza (Added, Changed, Fixed, Removed) e garante a consistência com as versões das scripts desktop.sh e server.sh.
---

# 📝 Workflow de Changelog SetupVibe

Este guia define o processo para manter um histórico de mudanças preciso, legível e padronizado.

## 1. Coleta de Mudanças (Git Intelligence)

Antes de escrever, identifique exatamente o que mudou desde a última versão:

- **Comando principal:** `git log vANTERIOR..HEAD --oneline` (substitua `vANTERIOR` pela última tag ou versão documentada).
- **Análise de Diff:** Se o log for vago, use `git diff vANTERIOR..HEAD --stat` para ver quais arquivos e seções foram modificados.
- **Sincronização de Scripts:** Verifique mudanças nas funções `step_NN_` em `desktop.sh` e `server.sh`.

## 2. Categorização Obrigatória

Distribua as mudanças nas seções padronizadas do "Keep a Changelog":

- **Added:** Novos recursos, novas ferramentas instaladas, novos aliases ou novas traduções.
- **Changed:** Alterações em comportamentos existentes, melhorias de performance, atualizações de dependências ou refatoração de passos (steps).
- **Fixed:** Correção de bugs, ajustes de permissões (sudo/user), tratamento de edge cases ou correção de links.
- **Removed:** Recursos ou ferramentas que foram removidos do projeto.

## 3. Formatação e Estilo

- **Cabeçalho da Versão:** Use H2 com colchetes, versão e data (AAAA-MM-DD).
  *   *Exemplo:* `## [v0.41.8] - 2026-04-05`
- **Mensagens:**
  *   Use o tempo verbal no passado (ex: "Added", "Improved", "Fixed").
  *   Seja conciso mas específico (ex: em vez de "Update PATH", use "Improved PATH handling for Ruby and Composer").
  *   Use bullet points (`- `).
- **Espaçamento:** Uma linha em branco entre o título da categoria e o primeiro item, e entre categorias.
- **Separador:** Use `---` entre versões para manter a legibilidade.

## 4. Checklist de Integridade

- [ ] A versão no CHANGELOG coincide exatamente com a `VERSION` em `desktop.sh` e `server.sh`.
- [ ] A data está correta (data do dia da liberação).
- [ ] O novo bloco de versão está no **topo** do arquivo (abaixo do header principal).
- [ ] Todos os arquivos `.md` da pasta `docs/` e da raiz foram atualizados para refletir essa mesma versão.
- [ ] O arquivo termina com o rodapé de formatação padrão.

---

## Exemplo de Entrada Ideal

```markdown
## [v0.42.0] - 2026-04-10

### Added

- Adicionado suporte para Fedora 40 nas scripts de instalação.
- Novo alias `vclean` para limpeza profunda de ambientes virtuais.

### Changed

- Migração do passo de IA CLI para utilizar a nova API do Gemini.
- Otimização do tempo de boot do Tmux via pré-carregamento de plugins.

### Fixed

- Corrigido erro de permissão ao instalar o `uv` em sistemas Debian 12.
```

---


---

## Regra Obrigatória — Markdown

**Ao criar ou modificar qualquer arquivo `.md`, você DEVE invocar a skill `/markdown-format` antes de concluir a tarefa. As regras de formatação estão em [`MARKDOWN.md`](../../../MARKDOWN.md). Esta regra é inegociável e se aplica a qualquer skill, independente do seu escopo.**
---
name: documentation
description: Workflow mestre para gestão de documentação do SetupVibe. Automatiza criação de guias, traduções para PT-BR/ES/FR, sincronização de passos (steps) das scripts, automação de CHANGELOG via git e validação rigorosa de links e padrões Markdown.
---

# 📖 Workflow de Documentação SetupVibe

Este guia define o padrão ouro para manter a documentação do SetupVibe sincronizada, traduzida e tecnicamente impecável.

## 🏗️ Fase 1: Criação e Padrões Markdown (Linter)

Ao criar ou editar QUALQUER arquivo `.md`, você DEVE invocar a skill **`markdown-format`** para garantir a conformidade com as regras do projeto:

1.  **Cabeçalho Padrão:** Começar com H1 seguido de blockquote com a versão. Ex: `> Descrição curta — v0.41.6`.
2.  **Linting Delegado:** Todas as regras de títulos, tabelas, code blocks, links, listas e espaçamentos são gerenciadas pela skill `markdown-format`. **Não ignore seus avisos**.
3.  **Linting Final:** Após criar ou editar o arquivo, processe-o com a skill `markdown-format` para validar conformidade.

## 🔄 Fase 2: Sincronização de Passos (Steps)

Sempre que as funções `step_NN_` em `desktop.sh` ou `server.sh` mudarem:

1.  **Mapeamento:** Localize a função no script (ex: `step_13`).
2.  **Replicação:** Atualize a seção "What Gets Installed" no `README.md` da raiz e em todos os 4 idiomas em `docs/desktop/` e `docs/server/`.
3.  **Validação:** Após a edição, processe todos os arquivos afetados com a skill `markdown-format`.

## 📝 Fase 3: Gestão de CHANGELOG

Utilize a skill especializada `make-changelog` para documentar novas versões. Ela já integra o workflow de formatação padrão.

## 🌍 Fase 4: Tradução e Glossário Técnico

O Inglês (`en/`) é a fonte da verdade. Ao traduzir:

*   **Glossário de Consistência:**
    *   `Step` ➔ Passo (PT) / Paso (ES) / Étape (FR)
    *   `Setup` ➔ Configuração (PT) / Configuración (ES) / Configuration (FR)

## 🔍 Fase 5: Validação Final (Checklist)

1.  **Format Check:** Todos os arquivos passaram pela skill `markdown-format`?
2.  **Link Check:** `ls` nos caminhos relativos para confirmar que os destinos existem.
3.  **Version Check:** `grep_search` para garantir que versões antigas foram substituídas.

---


---

## Regra Obrigatória — Markdown

**Ao criar ou modificar qualquer arquivo `.md`, você DEVE invocar a skill `/markdown-format` antes de concluir a tarefa. As regras de formatação estão em [`MARKDOWN.md`](../../../MARKDOWN.md). Esta regra é inegociável e se aplica a qualquer skill, independente do seu escopo.**
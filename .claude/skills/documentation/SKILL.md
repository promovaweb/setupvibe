---
name: documentation
description: Workflow mestre para gestão de documentação do SetupVibe. Automatiza criação de guias, traduções para PT-BR/ES/FR, sincronização de passos (steps) das scripts, automação de CHANGELOG via git e validação rigorosa de links e padrões Markdown.
---

# 📖 Workflow de Documentação SetupVibe

Este guia define o padrão ouro para manter a documentação do SetupVibe sincronizada, traduzida e tecnicamente impecável.

## 🏗️ Fase 1: Criação e Padrões Markdown (Linter)

Ao criar ou editar QUALQUER arquivo `.md`, você DEVE seguir estas regras para evitar erros de renderização:

1.  **Cabeçalho Padrão:** O arquivo deve começar com um H1 seguido de um blockquote com a versão.
    *   *Exemplo:*
        ```markdown
        # Título do Guia
        
        > Descrição curta — v0.41.8
        ```
2.  **Hierarquia de Títulos:** Use `#` para H1, `##` para H2, etc. Nunca pule níveis (ex: não pule de H1 para H3).
3.  **Tabelas:** Alinhamento obrigatório com pipes `|` e linha separadora `|---|---|`.
4.  **Blocos de Código:** Sempre especifique a linguagem para syntax highlighting (ex: ` ```bash `, ` ```js `).
5.  **Links Relativos:** Verifique se o caminho está correto em relação à localização do arquivo. 
    *   *Atenção:* Arquivos em `docs/desktop/pt-br/` que linkam para `conf/` devem usar `../../../conf/arquivo`.
6.  **Rodapé Obrigatório:** Todo arquivo deve terminar exatamente com:
    ```markdown
    ---
    > Apply Markdown standards using the `/markdown-format` skill.
    ```

## 🔄 Fase 2: Sincronização de Passos (Steps)

Sempre que houver mudanças nas funções `step_NN_` nos arquivos `desktop.sh` ou `server.sh`:

1.  **Mapeamento:** Localize a função no script (ex: `step_13`).
2.  **Atualização:** Vá até a seção "What Gets Installed" (ou "O que é instalado") nos READMEs correspondentes.
3.  **Replicação:** Aplique a mudança no `README.md` da raiz e nos READMEs de `docs/desktop/` ou `docs/server/` em **todos os 4 idiomas**.

## 📝 Fase 3: Gestão de CHANGELOG

Para documentar uma nova versão, utilize a skill especializada `make-changelog`. Ela automatiza:
- A coleta de logs do Git.
- A categorização em Added, Changed e Fixed.
- A garantia de que o novo bloco de versão esteja no topo e formatado corretamente.

Após atualizar o CHANGELOG, siga para a Fase 4 para garantir que as traduções e links reflitam a nova versão.

## 🌍 Fase 4: Tradução e Glossário Técnico

O Inglês (`en/`) é sempre a fonte da verdade. Ao traduzir para `pt-br/`, `es/` e `fr/`:

*   **NÃO TRADUZA:** Comandos de terminal, nomes de pacotes, aliases ou variáveis de ambiente.
*   **TRADUZA:** Explicações, labels de tabelas e títulos.
*   **Glossário de Consistência:**
    *   `Step` ➔ Passo (PT) / Paso (ES) / Étape (FR)
    *   `Setup` ➔ Configuração (PT) / Configuración (ES) / Configuration (FR)
    *   `Tool` ➔ Ferramenta (PT) / Herramienta (ES) / Outil (FR)

## 🔍 Fase 5: Validação Final (Checklist)

Antes de considerar a tarefa concluída, execute:
1.  `grep_search` para garantir que a versão antiga não existe mais.
2.  `ls` nos caminhos dos links relativos criados para confirmar que o arquivo de destino existe.
3.  Verificação visual de que o rodapé padrão está presente.

---


---

## Regra Obrigatória — Markdown

**Ao criar ou modificar qualquer arquivo `.md`, você DEVE invocar a skill `/markdown-format` antes de concluir a tarefa. As regras de formatação estão em [`MARKDOWN.md`](../../../MARKDOWN.md). Esta regra é inegociável e se aplica a qualquer skill, independente do seu escopo.**
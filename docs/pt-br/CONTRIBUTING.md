# Guia de Contribuição (PT-BR)

Bem-vindo ao guia de contribuição do **SetupVibe**! Estamos empolgados com o seu interesse. Este documento descreve os padrões e fluxos de trabalho necessários para contribuir com este projeto.

## 🚀 Como Começar

1. **Faça um Fork** do repositório.
2. **Clone** o seu fork localmente.
3. **Crie uma branch** para sua funcionalidade ou correção (ex: `feat/nova-ferramenta` ou `fix/link-quebrado`).
4. **Implemente** suas mudanças seguindo os padrões abaixo.
5. **Envie um Pull Request** com uma descrição clara das suas alterações.

---

## 🛠 Padrões de Código (Bash)

O SetupVibe utiliza dois scripts principais: `desktop.sh` e `server.sh`. Todo o código Shell deve seguir estes padrões:

### 1. Elevação Inteligente de Privilégios

Nunca utilize `sudo` diretamente dentro de funções, a menos que seja estritamente necessário por motivos específicos. Utilize nossas funções auxiliares:

- **`user_do`**: Executa um comando como o usuário real (mesmo que o script tenha sido iniciado com `sudo`). Use para instalar ferramentas em `$HOME`, configurar o Git ou gerenciar dotfiles do usuário.
- **`sys_do`**: Executa um comando com privilégios elevados. Use para gerenciamento de pacotes do sistema (`apt`), modificação de `/etc` ou gerenciamento de serviços do sistema.

### 2. Arquitetura Modular

Os scripts são organizados em funções modulares chamadas `step_N`. Se você adicionar uma nova funcionalidade:

1. Adicione o título ao array `STEPS`.
2. Crie uma função `step_N` correspondente.
3. Garanta que a lógica suporte tanto **macOS (`$IS_MACOS`)** quanto **Linux (`$IS_LINUX`)** onde aplicável.

### 3. Idempotência

Os scripts devem ser seguros para execução múltipla. Sempre verifique se uma ferramenta já está instalada ou se uma configuração já existe antes de aplicar as alterações.

### 4. Gerenciamento de Chaves (Linux)

Não utilize `apt-key` (depreciado). Sempre armazene chaves GPG do APT em `/etc/apt/keyrings/` utilizando os auxiliares `install_key` ou `sys_do`.

---

## 📝 Padrões de Documentação (Markdown)

Todos os arquivos `.md` devem seguir estas regras rigorosamente:

1. **Hierarquia**: Use cabeçalhos hierárquicos (H1 → H2 → H3). Nunca pule níveis.
2. **Tabelas**: Alinhe colunas com pipes `|` e inclua uma linha separadora `|---|`.
3. **Blocos de Código**: Sempre especifique a linguagem (ex: ` ```bash `).
4. **Links**: Use o formato `[texto](url)`. Não use URLs brutas.
5. **Listas**: Use hífens `-` para listas não ordenadas.
6. **Espaçamento**: Uma linha em branco antes e depois de cabeçalhos, blocos de código e tabelas.
7. **Sem HTML**: Evite `<br>`, `<b>`, `<i>` ou outras tags HTML.

---

## 🔢 Processo de Versionamento

Ao atualizar a versão (ex: de `0.41.9` para `0.42.0`), você **deve** atualizar a string de versão em todos os seguintes locais:

- `desktop.sh` (variável `VERSION`)
- `server.sh` (variável `VERSION`)
- `CHANGELOG.md` (adicionar uma nova entrada)
- `README.md` (visão geral do projeto na raiz)
- `GEMINI.md` (visão geral do projeto para o agente)
- `CLAUDE.md` (visão geral do projeto para o agente)
- Todos os arquivos `README.md` em `docs/` e seus subdiretórios.

---

## 🤖 Automação & Skills

Este projeto utiliza **Agent Skills** (localizadas em `.gemini/skills` e `.claude/skills`) para automatizar tarefas.

- Se você for um agente de IA, você **deve** ativar as skills relevantes (ex: `markdown-format`, `make-changelog`) antes de realizar tarefas.
- Se você for um humano, esteja ciente de que essas skills reforçam os padrões mencionados acima.

---

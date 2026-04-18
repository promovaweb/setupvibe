# Guia do Spec-Kit

O SetupVibe instala o [Spec-Kit](https://github.com/github/spec-kit) na edição Desktop (macOS e Linux desktop) via `uv tool install specify-cli`.

> Guia de ferramentas — v0.41.7

- **Comando:** `specify`
- **Pacote:** `specify-cli` (PyPI)
- **Requisitos:** Python 3.11+, `uv`, Git e um agente de IA

---

## O que é o Spec-Kit?

O Spec-Kit é um **conjunto de ferramentas de código aberto para o Spec-Driven Development (SDD)** — uma metodologia que inverte a abordagem tradicional de desenvolvimento de software, tornando as especificações executáveis antes que qualquer código seja escrito.

Em vez de pular direto para o código ("vibe coding"), o SDD guia você através de três fases:

| Fase | Comando | Propósito |
|---|---|---|
| **Specify** | `/speckit.specify` | Define *o que* construir e *por que* |
| **Plan** | `/speckit.plan` | Define *como* construir (arquitetura, stack técnica) |
| **Tasks** | `/speckit.tasks` | Quebra o plano em partes de implementação acionáveis |

---

## Primeiros Passos

```bash
# Verifica se todas as dependências estão instaladas
spcheck

# Inicializa um novo projeto em uma nova pasta
spinit meu-projeto

# Inicializa no diretório atual com o Claude
spci

# Inicializa no diretório atual com o Gemini
spgi

# Inicializa no diretório atual com o Copilot
spkpi
```

---

## Instalação e Atualização

```bash
# Instala o Spec-Kit manualmente (se necessário)
uv tool install specify-cli

# Atualiza para a versão mais recente
spup
```

---

## Referência da CLI

### `specify init`

Prepara um projeto para Spec-Driven Development.

```bash
specify init <NOME_DO_PROJETO> [opções]
```

| Opção | Descrição |
|---|---|
| `--ai <agente>` | Agente de IA para usar: `claude`, `copilot`, `gemini`, `codebuddy`, `pi` |
| `--script <tipo>` | Tipo de script: `sh` (Bash) ou `ps` (PowerShell) |
| `--here` | Inicializa no diretório atual em vez de uma nova pasta |
| `--offline` | Usa ativos integrados sem buscar na rede |
| `--ignore-agent-tools` | Pula a validação de ferramentas do agente de IA |

### `specify check`

Verifica se todas as dependências necessárias (Python, uv, Git, agente de IA) estão instaladas e acessíveis.

```bash
specify check
```

---

## Aliases do SetupVibe

Estes aliases estão disponíveis após executar o SetupVibe Desktop no macOS ou Linux.

| Alias | Comando | Descrição |
|---|---|---|
| `sp` | `specify` | Atalho para o comando principal |
| `spinit` | `specify init` | Inicializa SDD em novo diretório |
| `spcheck` | `specify check` | Verifica dependências instaladas |
| `sphere` | `specify init --here` | Inicializa SDD no diretório atual |
| `spci` | `specify init --here --ai claude` | Inicia projeto SDD com Claude Code |
| `spgi` | `specify init --here --ai gemini` | Inicia projeto SDD com Gemini CLI |
| `spkpi` | `specify init --here --ai copilot` | Inicia projeto SDD com GitHub Copilot |
| `spup` | `uv tool upgrade specify-cli` | Atualiza o Spec-Kit |

---

## Fluxo de Trabalho Típico

### 1. Preparar o projeto

```bash
mkdir meu-app && cd meu-app
spci
```

Isso cria a estrutura do Spec-Kit com o Claude Code como agente de IA.

### 2. Escrever a especificação

Abra seu agente de IA e execute o comando `/speckit.specify`. Responda aos prompts para definir:

- Qual problema você está resolvendo?
- Quem são os usuários?
- Quais são os cenários principais e os resultados esperados?

### 3. Criar o plano técnico

Execute `/speckit.plan` em seu agente de IA para produzir:

- Decisões de arquitetura
- Escolhas de stack de tecnologia
- Pontos de integração e restrições

### 4. Quebrar em tarefas

Execute `/speckit.tasks` para gerar uma lista numerada e ordenada de tarefas de implementação a partir do plano.

### 5. Implementar

Use `/speckit.implement` ou trabalhe tarefa por tarefa com seu agente de IA, referenciando a especificação e o plano em cada etapa.

---

## Agentes de IA Suportados

| Agente | Flag | Notas |
|---|---|---|
| Claude Code | `--ai claude` | Recomendação padrão para usuários do SetupVibe |
| GitHub Copilot | `--ai copilot` | Requer assinatura do Copilot |
| Gemini CLI | `--ai gemini` | Nível gratuito disponível |
| CodeBuddy | `--ai codebuddy` | Assistente de IA da Tencent Cloud |
| Pi | `--ai pi` | Assistente de IA da Inflection |

---

## Dicas

- Execute `spcheck` antes de iniciar qualquer projeto para confirmar se seu ambiente está pronto.
- Use `--offline` em ambientes isolados ou quando a rede não for confiável.
- A flag `--here` (alias `sphere`) é útil quando a pasta do projeto já existe.
- Faça o commit dos arquivos de especificação gerados junto com seu código — eles servem como documentação viva.
- Execute `spup` periodicamente para se manter na versão mais recente do Spec-Kit.

---

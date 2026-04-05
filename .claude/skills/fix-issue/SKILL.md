---
name: fix-issue
description: Workflow completo para investigar, corrigir e fechar issues do repositório promovaweb/setupvibe. Lê a issue no GitHub, cria a branch fix/issue-N, identifica a causa raiz nos scripts, aplica as correções, faz commit e push, e pode postar um comentário na issue com o comando de teste apontando para a branch.
metadata:
  short-description: Corrige issues do SetupVibe no GitHub
---

# Fix Issue — SetupVibe

Workflow para corrigir issues reportadas em `promovaweb/setupvibe`.

## Invocação

```
/fix-issue <número>
/fix-issue <número> comment
```

- `/fix-issue 15` — investiga e corrige a issue
- `/fix-issue 15 comment` — após a correção, posta comentário na issue pedindo que o reporter teste

---

## Fase 1: Leitura e Diagnóstico

1. Leia a issue no GitHub:

```bash
gh issue view <número> --repo promovaweb/setupvibe
```

2. Anote o autor da issue (campo `author:`) — será usado no comentário final.

3. Identifique o(s) arquivo(s) afetado(s). Os candidatos principais são:

| Arquivo | Quando investigar |
|---|---|
| `desktop.sh` | Erro em macOS ou Linux desktop |
| `server.sh` | Erro em servidor Linux |
| `conf/zshrc-*.zsh` | Problema de PATH, alias ou shell |
| `conf/tmux-*.conf` | Problema com tmux ou plugins |
| `docs/` | Documentação incorreta ou ausente |

4. Leia as seções relevantes dos scripts com Read ou Grep antes de propor qualquer mudança. **Nunca modifique código que não foi lido.**

---

## Fase 2: Criar a Branch

Antes de qualquer edição, crie e mude para a branch de correção:

```bash
git checkout -b fix/issue-<número>
```

Exemplos: `fix/issue-15`, `fix/issue-12`.

---

## Fase 3: Identificação da Causa Raiz

Antes de editar, responda:

- Qual linha ou bloco exato causa o problema?
- É um problema de PATH, de permissão, de pipe quebrado, de ordem de execução ou de lógica condicional?
- A correção afeta macOS, Linux ou ambos? Cada OS tem bloco separado nos scripts (`if $IS_MACOS; then ... else ... fi`).

### Padrões de bug recorrentes no SetupVibe

| Padrão | Sintoma | Correção típica |
|---|---|---|
| Pipe quebra `user_do` | Parte do comando roda como root | Envolver em `user_do bash -c "..."` |
| `$HOME` errado em sudo | Arquivo criado em `/root` | Usar `$REAL_HOME` em vez de `$HOME` |
| `mv` com CWD errado | Arquivo não chega ao destino | Usar `--install-dir` ou path absoluto |
| PATH não disponível em sudo | Comando não encontrado após instalar | Incluir `export PATH=...:$PATH` dentro do `bash -c` |
| TMPDIR com `noexec` | Compilação falha em `/tmp` | Usar `mkdir -p "$HOME/.tmp"; export TMPDIR="$HOME/.tmp"` |
| `eval "$(tool init -)"` ausente | Shims não disponíveis | Adicionar init antes do uso da ferramenta |
| `.bashrc` não atualizado | Ferramenta sumiu após nova sessão bash | Adicionar `export PATH` ao `.bashrc` também |

---

## Fase 4: Aplicar a Correção

1. Edite apenas o(s) arquivo(s) afetado(s) com a ferramenta Edit.
2. Respeite o bloco OS correto (`IS_MACOS` vs `else` para Linux).
3. Siga os padrões de `user_do` e `sys_do` já estabelecidos no script.
4. Não adicione tratamento de erro para cenários impossíveis — confie nas garantias do script.
5. Se a correção exigir mudança nos zshrc, aplique nos três arquivos relevantes:
   - `conf/zshrc-macos.zsh`
   - `conf/zshrc-linux.zsh`
   - `conf/zshrc-server.zsh` (apenas se o problema afeta o server)

---

## Fase 5: Validação

Após editar, confirme:

- [ ] O bloco editado está sintaticamente correto (pipes, aspas, escape de variáveis).
- [ ] `$REAL_HOME` é usado onde o contexto é sudo.
- [ ] Comandos dentro de `user_do bash -c "..."` escapam variáveis corretamente (`\$HOME` vs `$REAL_HOME`).
- [ ] A correção não quebra o fluxo do OS oposto.

---

## Fase 6: Commit e Push da Branch

Após validar, faça commit e suba a branch:

```bash
git add <arquivos alterados>
git commit -m "fix: <descrição curta da correção> (closes #<número>)"
git push -u origin fix/issue-<número>
```

---

## Fase 7: Notificação de Conclusão

Quando o código estiver pronto, informe o usuário com este modelo:

---

**Correção aplicada — Issue #\<número\>**

**Branch:** `fix/issue-<número>`

**Causa raiz:** \<descrição objetiva em 1-2 linhas\>

**Arquivos alterados:**

| Arquivo | O que mudou |
|---|---|
| `arquivo.sh` | Descrição da mudança |

**Pronto para revisão.** Para postar o comentário na issue e avisar o reporter, execute:

```
/fix-issue <número> comment
```

---

## Fase 8: Comentário na Issue (argumento `comment`)

Quando invocado com o argumento `comment`, poste um comentário na issue via `gh` com o seguinte conteúdo, adaptando o script afetado (`desktop.sh` ou `server.sh`) e a edição:

### Para desktop.sh

```bash
gh issue comment <número> --repo promovaweb/setupvibe --body "$(cat <<'EOF'
Olá @<autor>! 👋

Identificamos e corrigimos o problema relatado. A correção está disponível na branch `fix/issue-<número>` para testes.

Para testar, execute o comando abaixo no terminal:

**macOS:**
\`\`\`bash
curl -sSL https://raw.githubusercontent.com/promovaweb/setupvibe/fix/issue-<número>/desktop.sh | bash
\`\`\`

**Linux Desktop:**
\`\`\`bash
curl -sSL https://raw.githubusercontent.com/promovaweb/setupvibe/fix/issue-<número>/desktop.sh | bash
\`\`\`

Se o problema for resolvido, confirme aqui nos comentários. Caso contrário, descreva o erro que ainda aparece.

Obrigado pelo report! 🙏
EOF
)"
```

### Para server.sh

```bash
gh issue comment <número> --repo promovaweb/setupvibe --body "$(cat <<'EOF'
Olá @<autor>! 👋

Identificamos e corrigimos o problema relatado. A correção está disponível na branch `fix/issue-<número>` para testes.

Para testar, execute o comando abaixo no terminal:

\`\`\`bash
curl -sSL https://raw.githubusercontent.com/promovaweb/setupvibe/fix/issue-<número>/server.sh | bash
\`\`\`

Se o problema for resolvido, confirme aqui nos comentários. Caso contrário, descreva o erro que ainda aparece.

Obrigado pelo report! 🙏
EOF
)"
```

Substitua `<autor>` pelo login do usuário que abriu a issue (campo `author:` lido na Fase 1) e `<número>` pelo número da issue.

---

> Apply Markdown standards using the `/markdown-format` skill.

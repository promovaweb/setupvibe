# Guia do Tmux
> Configuração do multiplexador de terminal — v0.41.6

O SetupVibe instala e configura o tmux com o [TPM](https://github.com/tmux-plugins/tpm) e um conjunto selecionado de plugins. A Edição Desktop usa [`conf/tmux-desktop.conf`](../../../conf/tmux-desktop.conf), baixada automaticamente durante a instalação.

A Edição Server usa uma [`conf/tmux-server.conf`](../../../conf/tmux-server.conf) mais enxuta — mesmos atalhos, mas sem os plugins `docker`, `mise` e `tmux-open`, e com uma barra de status simplificada (`git · cwd` à esquerda).

---

## O que é o tmux?

O tmux é um **multiplexador de terminal** — permite executar múltiplas sessões de terminal em uma única janela, manter sessões ativas após desconexão e dividir a tela em painéis. Essencial para servidores remotos e usuários avançados.

**Conceitos principais:**

| Conceito    | Descrição                                                        |
| ----------- | ---------------------------------------------------------------- |
| **Sessão**  | Uma coleção de janelas. Sobrevive à desconexão.                  |
| **Janela**  | Como uma aba do navegador — uma visão em tela cheia na sessão.   |
| **Painel**  | Uma divisão dentro de uma janela. Múltiplos painéis por janela.  |
| **Prefix**  | `Ctrl + b` — pressionado antes de todo atalho do tmux.           |

---

## Primeiros Passos

```bash
# Iniciar uma nova sessão
tmux

# Iniciar uma sessão com nome
tmux new -s meuprojeto

# Listar sessões
tmux ls

# Conectar à última sessão
tmux attach

# Conectar a uma sessão com nome
tmux attach -t meuprojeto

# Encerrar uma sessão
tmux kill-session -t meuprojeto
```

Após abrir o tmux, pressione `prefix + I` (i maiúsculo) para instalar todos os plugins.

---

## Atalhos de Teclado Padrão

> Todos os atalhos exigem pressionar **`Ctrl + b`** primeiro, depois a tecla.

### Sessões

| Atalho       | Ação                                              |
| ------------ | ------------------------------------------------- |
| `prefix + s` | Listar e alternar sessões (interativo)            |
| `prefix + $` | Renomear sessão atual                             |
| `prefix + d` | Desconectar da sessão (sessão continua ativa)     |
| `prefix + (` | Ir para a sessão anterior                         |
| `prefix + )` | Ir para a próxima sessão                          |
| `prefix + L` | Ir para a última sessão utilizada                 |

### Janelas

| Atalho         | Ação                                    |
| -------------- | --------------------------------------- |
| `prefix + c`   | Criar nova janela                       |
| `prefix + ,`   | Renomear janela atual                   |
| `prefix + &`   | Encerrar janela atual                   |
| `prefix + n`   | Próxima janela                          |
| `prefix + p`   | Janela anterior                         |
| `prefix + l`   | Última janela (alternar)                |
| `prefix + w`   | Listar e alternar janelas (interativo)  |
| `prefix + 0–9` | Ir para janela pelo número              |
| `prefix + '`   | Digitar número da janela para ir        |
| `prefix + .`   | Mover janela para índice diferente      |
| `prefix + f`   | Buscar janela pelo nome                 |

### Painéis

| Atalho                 | Ação                                                                  |
| ---------------------- | --------------------------------------------------------------------- |
| `prefix + %`           | Dividir verticalmente (esquerda/direita)                              |
| `prefix + "`           | Dividir horizontalmente (cima/baixo)                                  |
| `prefix + o`           | Ir para o próximo painel                                              |
| `prefix + ;`           | Alternar para o último painel ativo                                   |
| `prefix + x`           | Encerrar painel atual                                                 |
| `prefix + z`           | Zoom/unzoom do painel (alternar tela cheia)                           |
| `prefix + q`           | Mostrar números dos painéis (pressione o número para ir)              |
| `prefix + {`           | Trocar painel com o anterior                                          |
| `prefix + }`           | Trocar painel com o próximo                                           |
| `prefix + Alt+1–5`     | Mudar para layouts predefinidos (even-h, even-v, main-h, main-v, tiled) |
| `prefix + !`           | Transformar painel em janela própria                                  |
| `prefix + m`           | Marcar painel                                                         |
| `prefix + M`           | Limpar marcação do painel                                             |
| `↑ ↓ ← →`              | Navegar entre painéis por direção                                     |
| `prefix + Ctrl + ↑↓←→` | Redimensionar painel (1 célula)                                       |
| `prefix + Alt + ↑↓←→`  | Redimensionar painel (5 células)                                      |

### Modo de Cópia

| Atalho                  | Ação                                  |
| ----------------------- | ------------------------------------- |
| `prefix + [`            | Entrar no modo de cópia               |
| `prefix + ]`            | Colar último buffer copiado           |
| `prefix + #`            | Listar buffers de colagem             |
| `prefix + =`            | Escolher buffer da lista para colar   |
| `prefix + -`            | Excluir buffer mais recente           |
| `q` (no modo de cópia)  | Sair do modo de cópia                 |
| `Space` (modo de cópia) | Iniciar seleção                       |
| `Enter` (modo de cópia) | Copiar seleção e sair                 |
| `/` (modo de cópia)     | Buscar para frente                    |
| `?` (modo de cópia)     | Buscar para trás                      |

### Diversos

| Atalho            | Ação                          |
| ----------------- | ----------------------------- |
| `prefix + :`      | Abrir prompt de comando tmux  |
| `prefix + ?`      | Listar todos os atalhos       |
| `prefix + r`      | Recarregar configuração tmux  |
| `prefix + t`      | Mostrar relógio               |
| `prefix + i`      | Mostrar informações da janela |
| `prefix + ~`      | Mostrar mensagens do tmux     |
| `prefix + D`      | Escolher cliente para desconectar |
| `prefix + E`      | Distribuir painéis igualmente |
| `prefix + Ctrl+z` | Suspender cliente tmux        |

---

## Plugins

### Núcleo

| Plugin                                                                      | Descrição             |
| --------------------------------------------------------------------------- | --------------------- |
| [tmux-plugins/tpm](https://github.com/tmux-plugins/tpm)                     | Gerenciador de plugins |
| [tmux-plugins/tmux-sensible](https://github.com/tmux-plugins/tmux-sensible) | Padrões sensatos      |

**Atalhos do TPM:**

| Atalho           | Ação                       |
| ---------------- | -------------------------- |
| `prefix + I`     | Instalar plugins           |
| `prefix + U`     | Atualizar plugins          |
| `prefix + Alt+u` | Remover plugins não usados |

---

### Navegação e Controle de Painéis

#### [tmux-pain-control](https://github.com/tmux-plugins/tmux-pain-control)

Atalhos consistentes e intuitivos para divisão e redimensionamento de painéis.

| Atalho             | Ação                            | Substitui padrão                                   |
| ------------------ | ------------------------------- | -------------------------------------------------- |
| `prefix + \|`      | Dividir verticalmente (esq/dir) | `prefix + %` ainda funciona                        |
| `prefix + -`       | Dividir horizontalmente (c/b)   | Substitui `delete-buffer` (raramente usado)        |
| `prefix + \`       | Dividir verticalmente completo  | —                                                  |
| `prefix + _`       | Dividir horizontalmente completo | —                                                 |
| `prefix + h`       | Selecionar painel à esquerda    | —                                                  |
| `prefix + j`       | Selecionar painel abaixo        | —                                                  |
| `prefix + k`       | Selecionar painel acima         | —                                                  |
| `prefix + l`       | Selecionar painel à direita     | `last-window` restaurado após carregamento do plugin |
| `prefix + H/J/K/L` | Redimensionar painel (5 células) | —                                                 |

#### [christoomey/vim-tmux-navigator](https://github.com/christoomey/vim-tmux-navigator)

Navegue entre painéis do tmux e splits do vim com as mesmas teclas.

| Atalho     | Ação                    |
| ---------- | ----------------------- |
| `Ctrl + h` | Mover para esquerda     |
| `Ctrl + j` | Mover para baixo        |
| `Ctrl + k` | Mover para cima         |
| `Ctrl + l` | Mover para direita      |
| `Ctrl + \` | Ir para o painel anterior |

> Sem prefix. Funciona de forma transparente dentro do vim/neovim.

---

### Mouse

#### [NHDaly/tmux-better-mouse-mode](https://github.com/NHDaly/tmux-better-mouse-mode)

| Recurso                        | Comportamento                                             |
| ------------------------------ | --------------------------------------------------------- |
| Rolar para baixo no modo cópia | Sai do modo de cópia automaticamente                      |
| Rolar sobre painel             | Não muda o painel ativo                                   |
| Rolar em vim/less/man          | Envia eventos de scroll para o app (buffer alternativo)   |

---

### Cópia e Clipboard

#### [tmux-plugins/tmux-yank](https://github.com/tmux-plugins/tmux-yank)

| Atalho       | Contexto     | Ação                                          |
| ------------ | ------------ | --------------------------------------------- |
| `prefix + y` | Normal       | Copiar texto da linha de comando              |
| `prefix + Y` | Normal       | Copiar diretório de trabalho atual            |
| `y`          | Modo cópia   | Copiar seleção para clipboard                 |
| `Y`          | Modo cópia   | Copiar seleção e colar na linha de comando    |

#### [CrispyConductor/tmux-copy-toolkit](https://github.com/CrispyConductor/tmux-copy-toolkit)

| Atalho       | Ação                      |
| ------------ | ------------------------- |
| `prefix + e` | Ativar copy toolkit       |

#### [abhinav/tmux-fastcopy](https://github.com/abhinav/tmux-fastcopy)

Cópia baseada em dicas (estilo vimium). Destaca padrões de texto na tela e permite copiá-los digitando letras curtas de dica.

| Atalho       | Ação                      |
| ------------ | ------------------------- |
| `prefix + F` | Ativar dicas do fastcopy  |

Reconhece: URLs, IPs, hashes Git, caminhos de arquivo, UUIDs, cores hex, números e mais.

> Usa `prefix + F` (maiúsculo) — `prefix + f` é preservado para o `find-window` nativo do tmux.

---

### Abertura de URLs e Arquivos

#### [tmux-plugins/tmux-open](https://github.com/tmux-plugins/tmux-open)

| Atalho      | Contexto   | Ação                              |
| ----------- | ---------- | --------------------------------- |
| `o`         | Modo cópia | Abrir com aplicativo padrão       |
| `Ctrl + o`  | Modo cópia | Abrir com `$EDITOR`               |
| `Shift + s` | Modo cópia | Pesquisar seleção no navegador    |

#### [wfxr/tmux-fzf-url](https://github.com/wfxr/tmux-fzf-url)

| Atalho       | Ação               |
| ------------ | ------------------ |
| `prefix + u` | Abrir seletor de URL |

---

### Gerenciamento de Sessões

#### [tmux-plugins/tmux-resurrect](https://github.com/tmux-plugins/tmux-resurrect)

Salva e restaura todo o ambiente tmux após reinicializações.

| Atalho            | Ação              |
| ----------------- | ----------------- |
| `prefix + Ctrl+s` | Salvar sessão     |
| `prefix + Ctrl+r` | Restaurar sessão  |

Salva: janelas, painéis, diretórios de trabalho, conteúdo dos painéis, programas em execução.

#### [tmux-plugins/tmux-continuum](https://github.com/tmux-plugins/tmux-continuum)

| Recurso                    | Valor              |
| -------------------------- | ------------------ |
| Intervalo de auto-salvamento | A cada 10 minutos |
| Auto-restauração ao iniciar | Ativado           |

Sem atalhos — funciona automaticamente em segundo plano.

#### [omerxx/tmux-sessionx](https://github.com/omerxx/tmux-sessionx)

Gerenciador de sessões completo com preview via fzf.

| Atalho       | Ação                        |
| ------------ | --------------------------- |
| `prefix + S` | Abrir gerenciador de sessões |

Dentro do sessionx: `Ctrl+d` excluir sessão, `Ctrl+r` renomear, `Tab` alternar preview.

> Usa `prefix + S` (maiúsculo) — `prefix + o` é preservado para o `rotate-pane` nativo do tmux.

---

### Buscador Fuzzy

#### [sainnhe/tmux-fzf](https://github.com/sainnhe/tmux-fzf)

Gerencie sessões, janelas, painéis e execute comandos via fzf.

| Atalho                   | Ação                  |
| ------------------------ | --------------------- |
| `prefix + F` (maiúsculo) | Abrir menu tmux-fzf   |

---

### Auxiliares de Interface

#### [Freed-Wu/tmux-digit](https://github.com/Freed-Wu/tmux-digit)

| Atalho         | Ação                              |
| -------------- | --------------------------------- |
| `prefix + 0–9` | Ir diretamente para janela pelo índice |

#### [anghootys/tmux-ip-address](https://github.com/anghootys/tmux-ip-address)

Exibe o endereço IP atual da máquina na barra de status. Sem atalhos.

#### [tmux-plugins/tmux-prefix-highlight](https://github.com/tmux-plugins/tmux-prefix-highlight)

Destaca a barra de status quando a tecla prefix está ativa, no modo de cópia ou no modo de sincronização. Sem atalhos.

#### [alexwforsythe/tmux-which-key](https://github.com/alexwforsythe/tmux-which-key)

| Atalho           | Ação                    |
| ---------------- | ----------------------- |
| `prefix + Space` | Abrir menu which-key    |

> `prefix + Space` é intencionalmente dedicado ao which-key. O next-layout ainda está disponível via `prefix + Alt+1–5`.

#### [jaclu/tmux-menus](https://github.com/jaclu/tmux-menus)

| Atalho       | Ação                  |
| ------------ | --------------------- |
| `prefix + g` | Abrir menu de contexto |

---

### Tema

#### [2KAbhishek/tmux2k](https://github.com/2KAbhishek/tmux2k)

**Desktop** (`tmux-desktop.conf`):

| Posição  | Widgets                            |
| -------- | ---------------------------------- |
| Esquerda | `git` · `cwd` · `docker` · `mise`  |
| Direita  | `cpu` · `ram` · `network` · `time` |

**Server** (`tmux-server.conf`):

| Posição  | Widgets                            |
| -------- | ---------------------------------- |
| Esquerda | `git` · `cwd`                      |
| Direita  | `cpu` · `ram` · `network` · `time` |

**Tema:** `onedark` com separadores powerline em ambas as edições.

---

## Resolução de Conflitos de Teclas

| Tecla            | Padrão tmux                   | Plugin            | Resolução                                                                           |
| ---------------- | ----------------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| `prefix + f`     | `find-window`                 | tmux-fastcopy     | Fastcopy movido para `prefix + F` — padrão preservado                              |
| `prefix + o`     | `rotate-pane`                 | tmux-sessionx     | Sessionx movido para `prefix + S` — padrão preservado                              |
| `prefix + l`     | `last-window`                 | tmux-pain-control | Padrão restaurado com `bind-key l last-window` após carregamento do TPM             |
| `prefix + -`     | `delete-buffer`               | tmux-pain-control | Pain-control substitui com split-h — aceito (padrão raramente usado)               |
| `prefix + \`     | *(split do pain-control)*     | tmux-menus        | Menus movidos para `prefix + g` — split do pain-control preservado                 |
| `prefix + M`     | `select-pane -M` (clear mark) | tmux-menus        | Menus movidos para `prefix + g` — padrão preservado                                |
| `prefix + Space` | `next-layout`                 | tmux-which-key    | which-key usa Space — next-layout ainda disponível via `prefix + Alt+1–5`           |

---

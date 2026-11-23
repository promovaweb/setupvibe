# Shell e terminal

Um ambiente preparado se perde no primeiro `git pull` do próprio dotfiles ou no
primeiro instalador que reescreve o `.zshrc`. O SetupVibe evita essa disputa com
um bloco delimitado: ele escreve só entre dois marcadores, guarda uma cópia do
arquivo antes da primeira mudança e deixa um arquivo separado para as suas
linhas.

O `auto` aplica esse bloco ao fim da instalação e `shell apply` permite
reaplicá-lo depois. Ambos convertem arquivos do SetupVibe 1 antes de escrever
o bloco novo, preservando as suas personalizações num arquivo separado.

## O que o `shell apply` escreve

| Caminho | Conteúdo |
| --- | --- |
| `~/.zshrc` (Debian, Ubuntu, Mint, Zorin, macOS e server) | `PATH`, `mise activate`, Oh My Zsh com plugins, zoxide, Starship, aliases e `~/.zshrc.local` |
| `~/.bashrc` (Omarchy) | `PATH`, aliases e `~/.bashrc.local` |
| `~/.tmux.conf` (menos Omarchy) | carrega `~/.setupvibe/shell/tmux.conf`, que carrega `~/.tmux.conf.local` antes do TPM |
| `~/.setupvibe/shell/aliases.sh` | aliases válidos em ZSH e Bash |
| `~/.setupvibe/shell/aliases-agents.sh` | aliases que abrem agentes sem confirmação |
| `~/.setupvibe/shell/tmux.conf` | plugins, tema e teclas do tmux |
| `~/.zshrc.local`, `~/.bashrc.local`, `~/.tmux.conf.local` | o lugar das suas linhas, criados uma vez e nunca sobrescritos |

Antes da primeira alteração, o arquivo original vai para
`~/.setupvibe/backups/` com o sufixo `.first` e uma cópia com data. No Linux, o
`apply` também troca o shell de login para ZSH com `chsh`, usando sudo quando
precisa.

```bash
setupvibe desktop shell apply --dry-run
setupvibe desktop shell apply
```

Use o primeiro comando para consultar os arquivos e os blocos previstos e o
segundo para gravá-los. Depois de aplicar, abra um terminal novo ou recarregue o shell
na sessão atual:

```bash
exec $SHELL -l
```

## O bloco e o arquivo local

O bloco começa em `# >>> setupvibe >>>` e termina em `# <<< setupvibe <<<`. Ele é
substituído inteiro a cada execução, então não edite dentro dele: a próxima
atualização descarta a alteração. O que você escreve fora do bloco fica.

As suas linhas vão para o arquivo `.local`:

```bash
# ~/.zshrc.local
export EDITOR=vim
alias deploy='./scripts/deploy.sh'
```

O arquivo usa o formato do `.zshrc` e é carregado no fim do bloco. Para
tmux, `~/.tmux.conf.local` é carregado antes do TPM, o que permite trocar teclas
e tema sem alterar o arquivo gerenciado.

## Presets do Starship e plugins do Zsh

No Desktop e no Server, a primeira instalação aplica o Gruvbox Rainbow com
os separadores do SetupVibe quando ainda não existe `~/.config/starship.toml`.
Para consultar os presets da sua versão do Starship e experimentar outro tema:

```bash
starship preset --list
setupvibe desktop shell apply --preset tokyo-night
```

No Server e no Omarchy, troque `desktop` pelo nome da edição. Abra um novo
terminal para carregar o tema. O comando grava a escolha em
`~/.setupvibe/shell/starship.toml`. Seu arquivo pessoal permanece no lugar.
Uma variável `STARSHIP_CONFIG` definida por você tem prioridade. Para voltar
ao tema anterior, remova o arquivo do preset em `~/.setupvibe/shell/` e abra
um terminal novo.

No Zsh, o bloco carrega os plugins instalados do Oh My Zsh. O Desktop inclui
plugins de linguagens e ferramentas como Git, Docker e Composer. O Server
usa a seleção de administração, com Ansible, nmap e tmux. Plugins pessoais
declarados antes do bloco entram na mesma lista, sem duplicatas. O plugin
`zsh-syntax-highlighting` carrega por último. No Omarchy, o Bash continua
usando o prompt da distribuição até você escolher um preset.

## Aliases

Os aliases passam por um guarda que só define o nome quando nada responde por
ele: nem alias, nem função, nem comando instalado. Com essa verificação, os
nomes existentes são preservados. `df` é a exceção, porque
envolve o próprio comando de propósito.

Nomes que escondiam programas comuns foram renomeados: `gs` virou `gstat`
(Ghostscript), `ci` virou `cin` (RCS), `ts` virou `tsv` (moreutils), `dc` virou
`dco` (a calculadora `dc`) e `gofmt` virou `gofmtw`. `pn` e `pnx` são pulados em
silêncio quando o pnpm já instala comandos com esses nomes, porque fazem a mesma
coisa. O `setupvibe desktop doctor` lista os aliases pulados na máquina.

Os aliases de agente ficam em arquivo separado e desativam as confirmações
da ferramenta: `cco` para Claude Code, `cxo` para `codex --yolo` e `oco` para
`opencode --auto`. `cc` não serve para Claude Code porque já é o compilador C.
Para deixar os três de fora e voltar a abrir os agentes pelo comando completo:

```bash
setupvibe desktop config set shell.agentAliases false
setupvibe desktop shell apply
```

A troca vale na próxima aplicação do shell. O `doctor` mostra o estado dos
aliases na checklist do módulo Usuário e nos achados do Doctor.

## Ver o que está aplicado

O comando `shell` sem subcommand imprime a ajuda. Para conferir o estado, use o
`doctor`, que aponta o bloco ausente, o `PATH` incompleto e cada alias pulado:

```bash
setupvibe desktop doctor
setupvibe desktop config get shell.agentAliases
```

## Remover sem perder o resto

`shell remove` apaga só o conteúdo entre os marcadores. Os arquivos `.local`,
os backups, os itens instalados e a pasta `~/.setupvibe/` ficam.

```bash
setupvibe desktop shell remove
```

O comando não desinstala pacote, não apaga o estado e não desfaz a troca do
shell de login. Para desfazer tudo, use `self uninstall`, no capítulo de
manutenção.

Para restaurar o ambiente depois de remover o bloco, aplique outra vez:

```bash
setupvibe desktop shell apply
```

## Omarchy

O Omarchy administra Bash, Starship, Tmux, Docker e mise. A edição
`setupvibe omarchy` acrescenta o bloco de integração do Bash e instala
pacotes com `omarchy pkg add`. O PHP usa a versão 8.6.0 num diretório de
dados do mise dedicado ao SetupVibe.

```bash
setupvibe omarchy install php
setupvibe omarchy check php
MISE_DATA_DIR="$HOME/.setupvibe/omarchy/mise" mise exec php@8.6.0 -- php --version
```

## Próximo passo

O ambiente do terminal está aplicado e as suas personalizações têm lugar
próprio. O capítulo [Manutenção](06-manutencao.md) cobre o que fazer daqui em
diante: diagnosticar, atualizar o binário, tirar um relatório e remover a
instalação quando ela não serve mais.

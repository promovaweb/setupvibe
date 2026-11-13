# Shell e terminal

Um ambiente preparado se perde no primeiro `git pull` do próprio dotfiles ou no
primeiro instalador que reescreve o `.zshrc`. O SetupVibe evita essa disputa com
um bloco delimitado: ele escreve só entre dois marcadores, guarda uma cópia do
arquivo antes da primeira mudança e deixa um arquivo separado para as suas
linhas.

Quem aplica esse bloco é o `auto`, ao fim da instalação, e o `shell apply`,
quando você quer refazer. Os dois usam o mesmo código e convertem um arquivo do
SetupVibe 1 quando encontram um, então o bloco novo nunca cai sobre o antigo.

## O que o `shell apply` escreve

| Caminho | Conteúdo |
| --- | --- |
| `~/.zshrc` (Debian, Ubuntu, Mint, Zorin, Arch, macOS e server) | `PATH`, `mise activate`, Oh My Zsh com plugins, zoxide, Starship, aliases e `~/.zshrc.local` |
| `~/.bashrc` (Omarchy) | `PATH`, `STARSHIP_CONFIG` para `~/.config/setupvibe/starship.toml`, aliases e `~/.bashrc.local`; os arquivos do Omarchy ficam intactos |
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
setupvibe shell apply --dry-run
setupvibe shell apply
```

O primeiro comando mostra os arquivos e os blocos que seriam escritos; o
segundo escreve. Depois de aplicar, abra um terminal novo ou recarregue o shell
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

O formato é o mesmo do `.zshrc`, e o arquivo é carregado no fim do bloco. Para
tmux, `~/.tmux.conf.local` é carregado antes do TPM, o que permite trocar teclas
e tema sem tocar no arquivo gerenciado.

## Aliases

Os aliases passam por um guarda que só define o nome quando nada responde por
ele: nem alias, nem função, nem comando instalado. O seu setup sempre vence, e
nenhum alias do SetupVibe esconde um programa real. `df` é a exceção, porque
envolve o próprio comando de propósito.

Nomes que escondiam programas comuns foram renomeados: `gs` virou `gstat`
(Ghostscript), `ci` virou `cin` (RCS), `ts` virou `tsv` (moreutils), `dc` virou
`dco` (a calculadora `dc`) e `gofmt` virou `gofmtw`. `pn` e `pnx` são pulados em
silêncio quando o pnpm já instala comandos com esses nomes, porque fazem a mesma
coisa. O `setupvibe doctor` lista os aliases pulados na máquina.

Os aliases de agente ficam em arquivo separado e abrem a ferramenta sem pedir
confirmação: `cco` para Claude Code, `cxo` para `codex --yolo` e `oco` para
`opencode --auto`. `cc` não serve para Claude Code porque já é o compilador C.
Para deixar os três de fora e voltar a abrir os agentes pelo comando completo:

```bash
setupvibe config set shell.agentAliases false
setupvibe shell apply
```

A troca vale na próxima aplicação do shell. O `doctor` mostra o estado dos
aliases na checklist do módulo Usuário e nos achados do Doctor.

## Ver o que está aplicado

O comando `shell` sem subcommand imprime a ajuda. Para conferir o estado, use o
`doctor`, que aponta o bloco ausente, o `PATH` incompleto e cada alias pulado:

```bash
setupvibe doctor
setupvibe config get shell.agentAliases
```

## Remover sem perder o resto

`shell remove` apaga só o conteúdo entre os marcadores. Os arquivos `.local`,
os backups, os itens instalados e a pasta `~/.setupvibe/` ficam.

```bash
setupvibe shell remove
```

O comando não desinstala pacote, não apaga o estado e não desfaz a troca do
shell de login. Para desfazer tudo, use `self uninstall`, no capítulo de
manutenção.

Se você removeu o bloco e quer o ambiente de volta, aplique outra vez:

```bash
setupvibe shell apply
```

## Omarchy

O Omarchy já tem shell, prompt, tmux e aliases próprios. Nessa máquina, o
SetupVibe escreve no `~/.bashrc` um bloco que aponta para o Starship do
SetupVibe e para os aliases, sem substituir `.bashrc`, `starship.toml` nem a
configuração de tmux do sistema. Tudo o que o Omarchy mantém continua valendo, e
o que o SetupVibe acrescenta fica dentro do bloco.

## Próximo passo

O ambiente do terminal está aplicado e as suas personalizações têm lugar
próprio. O capítulo [Manutenção](06-manutencao.md) cobre o que fazer daqui em
diante: diagnosticar, atualizar o binário, tirar um relatório e remover a
instalação quando ela não serve mais.

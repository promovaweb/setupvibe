# Vindo do SetupVibe 1

Uma máquina preparada pelo SetupVibe 1 tem valor: o shell funciona, as chaves
estão no lugar, as ferramentas respondem. O problema é que aquele preparo foi
escrito por scripts que não deixam versão em disco. O SetupVibe 2 não apaga o que
encontra; ele reconhece os rastros, oferece converter e deixa você decidir o que
sai.

## Como a máquina antiga é reconhecida

O SetupVibe 1 não grava a versão em arquivo, então a detecção procura assinaturas
conhecidas:

| Rastro | Edição |
| --- | --- |
| `~/.zshrc` gerado por `conf/zshrc-*.zsh`, sem os marcadores do SetupVibe 2 | desktop ou server |
| `~/.tmux.conf` gerado por `conf/tmux-*.conf`, sem marcadores | desktop ou server |
| bloco `# >>> SetupVibe Omarchy 4 >>>` em `~/.bashrc` | Omarchy |
| `~/.setupvibe/bin/ssh_copy_id` e `~/.setupvibe/portainer-compose.yml` | qualquer |
| `%ProgramData%\SetupVibe\*.json` e `~/.setupvibe/windows-utilities.json` | Windows |

Um arquivo conta como SetupVibe 1 quando carrega a assinatura da versão 0.41.x ou
quando pelo menos 60% das linhas estão nos originais embutidos no binário. Isso
cobre releases anteriores da mesma série.

`setupvibe system` mostra o achado, `setupvibe doctor` repete com o comando que
resolve e o Início da TUI sugere a migração até o `config.json` registrar
`migratedFromV1`.

```bash
setupvibe system
setupvibe doctor
```

## O que acontece sem migrar

O `auto` e o `shell apply` convertem um `.zshrc` e um `.tmux.conf` do SetupVibe
1 antes de escrever os blocos novos, então o bloco do SetupVibe 2 nunca cai sobre
o arquivo antigo. A conversão é sem perda: o arquivo vai para
`~/.setupvibe/backups/`, as linhas que você acrescentou passam para
`~/.zshrc.local` ou `~/.tmux.conf.local` sob um comentário com data, e o arquivo
é reescrito com o bloco.

Numa máquina que já tem ferramentas, o `init` monta a primeira seleção com o que
passa na verificação e marca cada item como `adopted`. Item adotado não sai num
`remove` sem `--force`.

## O plano do `migrate`

`migrate` faz o mesmo e mais: converte o bloco do Omarchy, mantém o
`ssh_copy_id` como atalho e pergunta sobre cada duplicidade. Comece pelo
`--dry-run`, que mostra o plano e as linhas que vão mudar, com segredo mascarado:

```bash
setupvibe migrate --dry-run
```

Trecho do plano desta máquina, com a pasta pessoal reduzida a `~`:

```text
migrate (dry run)

1. Move ~/.zshrc from SetupVibe 1 to the SetupVibe 2 block, keeping your lines in ~/.zshrc.local
2. Move ~/.tmux.conf from SetupVibe 1 to the SetupVibe 2 block, keeping your lines in ~/.tmux.conf.local
3. Keep ssh_copy_id as a shortcut to setupvibe ssh copy-id, with the same options
4. Write the SetupVibe aliases and tmux settings to ~/.setupvibe/shell/
5. Starship gruvbox-rainbow preset in ~/.config/starship.toml
   skipped when: test -s ~/.config/starship.toml
6. SetupVibe block in ~/.zshrc
7. SetupVibe block in ~/.tmux.conf

Lines that move to ~/.zshrc.local:
  …

Duplicates kept (remove with --remove-legacy, or answer yes in a terminal): legacy-go, legacy-rbenv, legacy-linuxbrew, legacy-npm-global, legacy-nodesource
```

O plano não altera nada. Ele mostra a ordem, os arquivos que serão copiados e as
duplicidades que o comando encontrou. Leia antes de executar.

## Executar

```bash
setupvibe migrate
```

Num terminal, o comando pergunta uma vez por duplicidade. Sem terminal, informe o
que pode sair:

```bash
setupvibe migrate --remove-legacy go,rbenv
setupvibe migrate --remove-legacy all
```

As duplicidades são o Go em `~/.local/go`, o `rbenv`, o `~/.npm-global` e o
repositório NodeSource. O Node instalado continua; o que sai é o repositório APT
que a versão antiga acrescentou.

O Linuxbrew é a exceção: ele nunca é removido pelo SetupVibe, porque outras
fórmulas podem depender dele. O comando imprime o desinstalador para você rodar
quando quiser. O `ssh_copy_id` antigo continua funcionando como atalho de
`setupvibe ssh copy-id`, com as mesmas options `--host`, `--user`, `--pass`,
`--key` e `--port`.

No fim, o `config.json` registra `migratedFromV1` com a data e a edição de
origem, e os itens encontrados entram como adotados.

## O que conferir depois

1. **Abra um shell novo.** O bloco novo carrega o mise, o Starship e os aliases.
2. **Rode `setupvibe check`.** O comando confere os itens adotados contra a
   versão fixada; o que estiver fora aparece com `✗`.
3. **Leia o `doctor`.** Os avisos de restos do SetupVibe 1 devem desaparecer
   depois da migração; o que ficar tem um comando ao lado.
4. **Confira as suas linhas.** O conteúdo movido está em `~/.zshrc.local` e
   `~/.tmux.conf.local`, na mesma ordem do arquivo antigo.
5. **Confira os backups.** O original está em `~/.setupvibe/backups/` se algo
   precisar voltar.

## Se algo der errado

| Sintoma | Exit code | O que fazer |
| --- | --- | --- |
| sudo pede senha sem terminal | 13 `SUDO_PASSWORD` | rode no terminal ou crie a regra com `user nopasswd` |
| id desconhecido em `--remove-legacy` | 2 `USAGE` | use `go`, `rbenv`, `npm-global`, `nodesource` ou `all` |
| parte dos passos falhou | 10 `PARTIAL` | leia o log; o que ficou está no plano |
| sistema sem suporte | 11 `UNSUPPORTED_SYSTEM` | confira `setupvibe system` |

Se a conversão não resolver, o arquivo original está em
`~/.setupvibe/backups/` e pode ser copiado de volta. Nada do SetupVibe 1 é
apagado sem confirmação.

## Próximo passo

A máquina migrou e a configuração antiga está preservada. O capítulo
[Problemas comuns e glossário](11-problemas-e-glossario.md) reúne os sintomas que
aparecem com mais frequência e o vocabulário usado no resto do guia.

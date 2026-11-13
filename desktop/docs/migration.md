# Vindo do SetupVibe 1

O SetupVibe 2 instala e mantém o ambiente por um binário, com TUI, CLI e
servidor MCP no mesmo executável. Numa máquina preparada pelo SetupVibe 1
(0.41.x), ele continua funcionando sem perder o que você configurou: o
`{{bin}} migrate` converte os arquivos, guarda uma cópia de cada um e só remove
as duplicidades depois da sua confirmação.

## Como o binário reconhece o SetupVibe 1

O SetupVibe 1 não grava versão em disco. O binário procura os arquivos que ele
deixava:

| Traço | Origem |
| --- | --- |
| `~/.zshrc` do `conf/zshrc-*.zsh`, sem os marcadores do SetupVibe 2 | desktop ou servidor |
| `~/.tmux.conf` do `conf/tmux-*.conf`, sem os marcadores | desktop ou servidor |
| bloco `# >>> SetupVibe Omarchy 4 >>>` em `~/.bashrc` | Omarchy |
| `~/.setupvibe/bin/ssh_copy_id` e `~/.setupvibe/portainer-compose.yml` | qualquer edição |
| `%ProgramData%\SetupVibe\*.json` e `~/.setupvibe/windows-utilities.json` | Windows |

Um arquivo conta como SetupVibe 1 quando carrega a assinatura da versão 0.41.x
ou quando pelo menos 60% das linhas aparecem nos arquivos originais embutidos,
o que cobre releases 0.41.x um pouco diferentes.

Três superfícies mostram o resultado:

```bash
{{bin}} system                 # SetupVibe 1   found (desktop): run setupvibe migrate --dry-run
{{bin}} doctor                 # ! SetupVibe 1 found: ~/.zshrc from SetupVibe 1; ...
{{bin}}                        # o cartão Doctor e o próximo passo no Início
```

## Antes de migrar

1. Instale o binário do SetupVibe 2 com o instalador da edição.
2. Rode `{{bin}} system` e `{{bin}} doctor` e leia os traços encontrados.
3. Veja o plano com `{{bin}} migrate --dry-run`. Nada é alterado nesse passo.
4. Feche os editores abertos em `~/.zshrc` e `~/.tmux.conf`.

O SetupVibe 1 não precisa ser desinstalado. Ele não tem desinstalador; o
`migrate` cuida dos arquivos que ele deixou.

## O que o `migrate` faz

1. Copia o `~/.zshrc` e o `~/.tmux.conf` do SetupVibe 1 para
   `~/.setupvibe/backups/`.
2. Move as linhas que você acrescentou para `~/.zshrc.local` e
   `~/.tmux.conf.local`, com um comentário datado e a origem de cada bloco.
   Linhas que já estão nos arquivos originais não são copiadas.
3. Esvazia o arquivo convertido para o SetupVibe 2 escrever o bloco novo entre
   `# >>> setupvibe >>>` e `# <<< setupvibe <<<`.
4. Troca o bloco do SetupVibe Omarchy no `~/.bashrc` pelo bloco do SetupVibe 2,
   com backup antes.
5. Reescreve `~/.setupvibe/bin/ssh_copy_id` como atalho de
   `{{bin}} ssh copy-id`, com os mesmos `--host`, `--user`, `--pass`, `--key` e
   `--port`.
6. Grava os blocos do shell e monta a primeira seleção com os itens que já
   passam na checagem, marcados como `adopted`. Um item adotado não é removido
   sem `--force`, porque não foi o SetupVibe 2 que instalou.
7. Pergunta, uma vez por duplicidade, se pode remover. Sem terminal, remove só
   os ids passados em `--remove-legacy`.
8. Grava `migratedFromV1` no `~/.setupvibe/config.json` com a data e a edição de
   origem.

Os segredos que aparecem nas linhas movidas são mascarados no plano, com
`TOKEN`, `KEY`, `SECRET` e `PASSWORD` trocados por `****`. Os arquivos
guardam o valor real.

## Opções

| Opção | Efeito |
| --- | --- |
| `--dry-run` | mostra os passos e as linhas que vão mudar, sem alterar nada |
| `--remove-legacy <itens>` | sem terminal, remove só as duplicidades indicadas: `go`, `rbenv`, `npm-global`, `nodesource` ou `all` |
| `--json` | devolve o plano ou o resultado no envelope, com os mesmos passos |

```bash
{{bin}} migrate --dry-run                     # leia o plano e as linhas movidas
{{bin}} migrate                               # converte, grava os blocos e pergunta cada duplicidade
{{bin}} migrate --json --dry-run              # plano em JSON, para anexar num ticket
{{bin}} migrate --remove-legacy go,rbenv      # num cloud-init, sem terminal
{{bin}} migrate --remove-legacy all           # remove as quatro duplicidades
```

A tool MCP `migrate` segue o mesmo fluxo: `dry_run` é `true` por padrão e a
execução real exige `confirm: true`, depois de mostrar o plano. `remove_legacy`
recebe `go`, `rbenv`, `npm-global`, `nodesource` ou `all`.

## Duplicidades

| Id | O que é | O que o `migrate` faz |
| --- | --- | --- |
| `legacy-go` | Go em `~/.local/go` | remove a pasta, depois que o Go do mise está instalado |
| `legacy-rbenv` | rbenv em `~/.rbenv` | remove a pasta, depois que o Ruby do mise está instalado |
| `legacy-npm-global` | pacotes globais em `~/.npm-global` | remove a pasta; os agentes passam a vir do mise |
| `legacy-nodesource` | repositório NodeSource em `/etc/apt/sources.list.d/` | remove a lista e a chave; o Node já instalado fica |
| `legacy-linuxbrew` | Linuxbrew em `/home/linuxbrew/.linuxbrew` | nunca remove; mostra o comando de desinstalação, porque outras fórmulas podem usar |

O `doctor` continua listando o que ficou. O `migrate` pode ser executado de
novo: um arquivo que já tem o bloco do SetupVibe 2 não é convertido outra vez.

## Sem rodar o `migrate`

O `auto`, o `shell apply` e o `doctor --fix` também convertem um `.zshrc` e um
`.tmux.conf` do SetupVibe 1 antes de escrever os blocos novos. A conversão é a
mesma, com backup e linhas movidas para os arquivos `.local`.
O `init` monta a primeira seleção a partir do que já passa na checagem.

Rodar o `migrate` antes continua valendo a pena: ele trata o bloco do Omarchy,
o atalho `ssh_copy_id` e as duplicidades, que a conversão automática não toca.

## Windows

No Windows, o `migrate` reconhece os arquivos de estado do `desktop.ps1` em
`%ProgramData%\SetupVibe\` e em `~/.setupvibe/windows-utilities.json`. Esses
arquivos guardam o estado do WSL, do firewall do OpenSSH e do `PATH`; eles
ficam onde estão e o SetupVibe 2 não os remove.

O `init` adota o Git, o PowerShell 7 e o Windows Terminal que já estavam na
máquina. Isso evita o problema do SetupVibe 1, que removia programas que a
pessoa já tinha antes do setup.

## Depois da migração

Abra um shell novo para carregar `PATH`, aliases e prompt, e confira o estado:

```bash
exec $SHELL -l
{{bin}} doctor
{{bin}} check
```

O guia de problemas que aparecem nessa checagem está em
[troubleshooting.md](troubleshooting.md). A referência dos commands está em
[cli.md](cli.md) e os códigos de saída em [exit-codes.md](exit-codes.md).

## Exit codes

| Code | Quando |
| --- | --- |
| 0 | a migração terminou, com ou sem duplicidades mantidas |
| 2 | um id desconhecido foi passado em `--remove-legacy` |
| 10 | um passo falhou e os outros foram aplicados; o log traz o caminho |
| 11 | o sistema ou a arquitetura não tem suporte nesta edição |
| 13 | o `sudo` pede senha e não há terminal para digitá-la |

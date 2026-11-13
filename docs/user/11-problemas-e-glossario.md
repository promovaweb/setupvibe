# Problemas comuns e glossário

Quase toda falha do SetupVibe tem um comando que a diagnostica. O `doctor` lê o
runtime, o `init`, os itens, o `PATH`, o bloco do shell e os restos do SetupVibe
1, e mostra o comando ao lado de cada achado. Este capítulo reúne os sintomas
que aparecem com mais frequência, o que cada um significa e o vocabulário usado
no resto do guia.

## Comece pelo `doctor`

```bash
setupvibe doctor
```

Um `✗` é problema, um `!` é aviso, e cada linha que exige ação traz o comando
que resolve. Quando o achado é de nível `fail`, o comando termina com 3,
`CONFIG`; leia o texto antes de tratar como arquivo de configuração quebrado.

## Sintomas e saídas

| Sintoma | Causa provável | Comando |
| --- | --- | --- |
| `sudo asks for a password` | o passo privilegiado usa `sudo -n` e não há senha em cache | `setupvibe user nopasswd <user>` ou `sudo -v` antes |
| `Another SetupVibe run is in progress` | outra execução segura `run.lock` | `cat ~/.setupvibe/run.lock` e esperar |
| erro de TLS ou certificado em download | proxy ou CA corporativa | `--ca-file` e `HTTPS_PROXY`, se necessário |
| `github.com unreachable` | rede ou DNS | `setupvibe system` e `--cache-dir` |
| relógio mais de cinco minutos fora | NTP desligado | `sudo timedatectl set-ntp true` |
| `3.2 GB free, 10 GB needed` | pouco espaço na pasta pessoal | liberar espaço ou mover o cache |
| item com status `other` | outra cópia instalada por APT, Homebrew ou npm | `setupvibe install <item>` e conferir o `PATH` |
| `3 of 42 steps failed` | falha parcial; o resto ficou aplicado | ler o log e repetir só o que faltou |
| `SetupVibe 1 found` | máquina preparada pela versão 1 | `setupvibe migrate --dry-run` |
| `! Restart needed` | `/var/run/reboot-required` existe | reiniciar ou `auto --reboot` |
| contêiner publicando em `0.0.0.0` | Docker não passa pelo UFW | publicar em `127.0.0.1` |
| alias não definido | já existe comando com o mesmo nome | conferir com `type <nome>` |
| `settings.json` inválido | valor fora do schema | `setupvibe config list` e corrigir |
| `Run: setupvibe upgrade` | arquivo de estado de versão mais nova | `setupvibe upgrade` |
| comando em pipe imprime a ajuda e sai com 2 | sem TTY | rodar no terminal ou usar o CLI |
| duas edições na mesma máquina | desktop e server são exclusivas | `setupvibe self uninstall` antes da troca |

## Sudo sem senha

O `auto` exige `sudo` sem senha porque não abre prompt. `init`, `migrate` e
`shell apply` pedem a senha uma vez num terminal e seguem com a credencial em
cache; sem terminal, param antes de alterar a máquina.

```bash
setupvibe user nopasswd deploy
sudo -v && setupvibe auto --user deploy
```

O exit code é 13, `SUDO_PASSWORD`. Com `--keep-nopasswd`, o `auto` mantém a
regra temporária que ele criou.

## Falha parcial

Um passo com falha não interrompe os seguintes. O resultado fica no log e no
`last-run.json`, com status por item, e o comando termina com 10, `PARTIAL`.
Corrija a causa e repita só o que faltou:

```bash
setupvibe doctor
setupvibe install node python --force
setupvibe check
```

Não é preciso recomeçar do zero: o que passou continua aplicado.

## Ferramenta de outro gerenciador

`other` aparece quando o comando existe fora das pastas do mise e de
`~/.local/bin`. O SetupVibe não sobrescreve a cópia existente; ele instala a
dele ao lado. Para conferir qual responde primeiro:

```bash
setupvibe list --check
command -v node
setupvibe install node
```

Se a versão ativa continuar sendo a outra, ajuste o `PATH` ou remova a cópia
antiga. O `doctor` mostra o caminho da cópia que ganhou a disputa.

## Onde ler mais

- `setupvibe --skill troubleshooting` imprime a mesma matéria com o detalhe de
  cada caso, dentro do binário.
- O apêndice de códigos de saída, no fim do livro, lista a classe de cada
  número.
- O apêndice de configuração explica cada arquivo de `~/.setupvibe/`.
- `setupvibe report` gera o Markdown para anexar numa issue quando a falha
  precisa de outra pessoa.

## Glossário

| Termo | Significado |
| --- | --- |
| item | uma ferramenta da lista embutida, com id, versão, método e verificação |
| seleção | o conjunto de itens escolhidos, gravado em `selection.json` |
| perfil | um recorte nomeado da lista, como `essencial` e `remoto` |
| versão fixada | a versão que o binário instala e confere, não a última do fornecedor |
| adotado | item que já estava na máquina e foi registrado pelo `init` sem ser instalado |
| outro gerenciador | cópia instalada por APT, Homebrew, npm ou instalador do fornecedor |
| bloco do shell | trecho entre `# >>> setupvibe >>>` e `# <<< setupvibe <<<` |
| run log | arquivo em `~/.setupvibe/logs/`, com um evento NDJSON por linha |
| cofre | `credentials.json`, cifrado com AES-256-GCM |
| master key | chave de 32 bytes que abre o cofre; fica em `master.key` ou em variável |
| variante | classificação da máquina: local, remota sem interface ou remota exposta |
| headless | máquina sem sessão gráfica; itens `gui` ficam de fora |
| dry run | execução que mostra o plano e não altera nada |
| canal | `stable` ou `beta`, de onde o `upgrade` e o aviso de versão leem |
| exit code | número que classifica o resultado do comando, de 0 a 130 |
| OpenCLI | descrição JSON da árvore de commands, impressa por `--opencli` |
| envelope | objeto `{ ok, command, data }` ou `{ ok, command, error }` do `--json` |

## Fechamento

O guia termina nos apêndices. Quando precisar da lista exata de uma option, do
conteúdo de um arquivo de estado ou do significado de um exit code, comece por
eles; quando precisar lembrar por que a máquina está naquele estado, volte ao
capítulo da operação correspondente.

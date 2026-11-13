# Instalação e primeiro uso

Uma máquina nova não está pronta para trabalhar. Falta compilador, `git`,
runtime, CLI, container e um shell que carregue tudo no lugar certo. Feito à
mão, esse preparo vira uma sequência de comandos que ninguém revisa e que muda
quando alguém instala a versão mais nova de um runtime.

O SetupVibe 2 separa o preparo em duas etapas que você pode repetir. A
primeira instala o binário: um arquivo com versão do release e checksum
conferido. A segunda, `setupvibe init`, prepara a máquina com as dependências
de compilação e o mise. Só depois disso os itens entram, um a um ou pelo
`auto`.

Neste capítulo você percorre as duas etapas num host Linux, olha a lista de
itens antes e depois, instala o primeiro conjunto e confere o resultado. O
Windows e o servidor têm capítulos próprios; aqui o caminho é o de uma máquina
de trabalho com terminal.

## O que a máquina precisa

O binário recusa um sistema fora da lista e avisa quando a versão é anterior à
mínima. A checagem acontece antes de qualquer alteração, em todo comando que
mexe na máquina.

| Sistema | Versão mínima | Arquiteturas |
| --- | --- | --- |
| Ubuntu | 24.04 | x64, arm64 |
| Debian | 12 | x64, arm64 |
| Mint | 22 | x64 |
| Zorin | 18 | x64 |
| Arch | rolling | x64 |
| Omarchy | 4 | x64 |
| macOS | 12 | x64, arm64 |
| Windows | build 22621 | x64 |
| WSL | WSL 2 | x64, arm64 |

Além do sistema, o `init` confere cinco coisas e explica cada uma quando falha:

- **disco**: 10 GB livres na pasta pessoal na edição desktop, 5 GB na server.
  O número cobre as cadeias de ferramentas que o mise mantém e os caches de
  download.
- **memória**: abaixo de 2 GB o `init` avisa que a compilação pode ficar sem
  memória e sugere `setupvibe install swap`.
- **locale UTF-8**: sem ele, ferramentas que tratam nomes de arquivo com acento,
  como `git` e `mise`, podem gravar o nome errado.
- **rede e relógio**: o `init` compara o relógio com o de um servidor HTTPS.
  Mais de cinco minutos de diferença derrubam a validação de TLS e de
  checksum.
- **usuário**: o `init` não roda como root. Numa máquina remota, crie o usuário
  de trabalho antes, como o capítulo de servidor mostra.

## 1. Instale o binário

O installer lê a versão do canal em `version.json`, baixa o binário do release
correspondente ao sistema e confere o `SHA256SUMS` antes de gravar.

```bash
curl --proto '=https' --tlsv1.2 -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.sh | sh
```

Num Linux x64 com `cosign` instalado, a saída termina assim:

```text
Downloading setupvibe 2.0.0-dev.25 for linux-x64...
Signature of SHA256SUMS verified with cosign.
Installed ~/.local/bin/setupvibe (2.0.0-dev.25).
```

A linha da assinatura aparece só quando o `cosign` existe na máquina. Nesse
caso, o installer confere a assinatura Sigstore do `SHA256SUMS` contra o
workflow de release do repositório e aborta quando ela não corresponde. Sem
`cosign`, a conferência fica no checksum.

O destino é `~/.local/bin` para quem não é root e `/usr/local/bin` para root.
Quando a pasta não está no `PATH`, o installer avisa em vez de editar o seu
shell. Confira a versão:

```bash
setupvibe --version
```

```text
setupvibe 2.0.0-dev.25
```

Para instalar a edição server, escolha a edição na linha de comando. As duas
são exclusivas por máquina.

```bash
curl --proto '=https' --tlsv1.2 -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.sh | sh -s -- --edition server
```

O canal `beta` existe para testar uma versão antes da estável e usa a mesma
verificação:

```bash
curl --proto '=https' --tlsv1.2 -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.sh | SETUPVIBE_CHANNEL=beta sh
```

No Windows, o installer é outro e grava em `%LOCALAPPDATA%\Programs\SetupVibe`.
O capítulo [Windows e WSL](09-windows-e-wsl.md) mostra a linha completa, o
`PATH` do usuário e o que o binário não altera no PowerShell.

## 2. Abra a interface e leia o próximo passo

Num terminal de verdade, o binário sem argumentos abre a TUI no **Início**.
Sete cartões resumem os módulos: Inventário, Usuário, Doctor, Logs, Tailscale,
Máquina e Sobre. Acima deles, o próprio produto indica o passo que resolve o
estado atual da máquina. Numa instalação nova, o passo é concluir o `init`.

As teclas que bastam na primeira sessão:

| Tecla | Ação |
| --- | --- |
| `1` a `7` | abre o módulo do número |
| `←` `→` `↑` `↓` | move entre os cartões do Início |
| `Enter` | abre o cartão selecionado |
| `Esc` | volta ao Início; no Início, sai |
| `?` | mostra a lista completa de teclas |
| `q` | sai |

Num pipe, sem terminal interativo, o binário imprime a ajuda e sai com exit
code 2. O comando explícito `setupvibe tui` sem TTY sai com 8, `NO_TTY`. Isso
mantém um agente ou um script longe de uma tela que nunca vai responder.

O resto do capítulo segue pelo CLI. Cada passo fica registrado num comando que
você repete numa máquina diferente, e a TUI executa os mesmos comandos em outro
processo.

## 3. Veja o que a lista mostra

`setupvibe list` imprime os itens por categoria, com a versão fixada e o estado
na máquina. Este é o começo da saída desta máquina, que já tinha ferramentas
instaladas por Homebrew, `rbenv` e `npm` global:

```text
System

  ○ build-deps             distro        init
  ○ mise                   2026.11.6     init
  ◐ sshpass                distro        other (/usr/bin/sshpass)
  ○ wsl                    latest        unavailable

Languages

  ◐ node                   24.22.3       other (/home/linuxbrew/.linuxbrew/bin/node)
  ◐ python                 3.14.10       other (/usr/bin/python)
  ○ uv                     0.13.7        available
  ◐ php                    8.5           other (/usr/bin/php)
  ◐ bun                    1.4.4         other (~/.bun/bin/bun)
  …
```

A coluna do meio é a versão que o binário instala, não a versão que está na
máquina. Numa máquina limpa, quase todas as linhas aparecem como `available`.
O estado explica o que fazer a seguir:

| Estado | `list` | TUI | Significado |
| --- | --- | --- | --- |
| `installed` | ● | ● | selecionado e conferido com a versão fixada |
| `outdated` | ● | ↑ | selecionado com uma versão diferente da que este binário fixa |
| `failed` | ● | ✗ | o último `check` do item não passou |
| `other` | ◐ | ◐ | o comando existe fora das pastas do mise e de `~/.local/bin`, e a linha mostra o caminho |
| `available` | ○ | ○ | instala neste sistema e ainda não foi instalado |
| `unavailable` | ○ | · | não tem entrada de instalação para este sistema |
| `system` | ○ | ◆ | já vem com o sistema, como no macOS e no Omarchy |
| `init` | ○ | ◇ | entra pelo `init`, não pela seleção |
| `gui` | ○ | ◌ | item gráfico, deixado de fora numa máquina sem interface |

O `list` usa ● para os três estados de item selecionado e ○ para todo o resto,
o que basta quando você só quer saber se o item entrou. A TUI separa os casos
com símbolos próprios, e é nela que a diferença entre instalado, desatualizado
e com falha aparece na primeira olhada.

`other` não é erro. A ferramenta está na máquina, instalada por outro
gerenciador, e o SetupVibe instala a própria cópia pelo método que a lista
define para aquele item. Ele não sobrescreve a cópia que veio de APT, Homebrew,
npm ou do instalador do fornecedor. As duas convivem, e o `PATH` define qual
responde primeiro.

Para ver só uma categoria, filtre pelo id. Para rodar a verificação de cada
item selecionado junto com a lista, use `--check`:

```bash
setupvibe list --category languages
setupvibe list --check
```

## 4. Prepare a máquina

O `init` altera pacotes do sistema e grava o primeiro estado. Rode com
`--dry-run` e leia o plano antes:

```bash
setupvibe init --dry-run
```

As primeiras linhas desta máquina, com a lista de pacotes do passo 2 cortada:

```text
Requirements

✓ user: not root
✓ edition: desktop
✓ disk: 74.0 GB free (minimum 10 GB)
✓ memory: 20.5 GB
✓ locale: en_US.UTF-8
✓ network: github.com reachable
✓ clock: 8 s from the server

init (dry run)

1. Refresh the package index
   $ sudo apt-get -o DPkg::Lock::Timeout=600 update
2. Install build-essential, git, curl, wget, unzip, xz-utils, file, procps, ca-certificates, gnupg, libssl-dev, … with the system package manager
   $ sudo apt-get install -y -o DPkg::Lock::Timeout=600 …
3. Install mise 2026.11.6 to ~/.local/bin/mise (SHA-256 from the release)
   → download https://github.com/jdx/mise/releases/download/v2026.11.6/mise-v2026.11.6-linux-x64, verify it with https://github.com/jdx/mise/releases/download/v2026.11.6/SHASUMS256.txt and write ~/.local/bin/mise
…
```

O plano lista cada comando com o argumento completo e, quando existe, a
condição que faz o passo ser pulado numa segunda execução. O `mise` é baixado
do release oficial e conferido contra o `SHASUMS256.txt` do mesmo release.

Quando a checagem falha, o `init` para antes de alterar qualquer coisa e
devolve o exit code da classe:

| Falha | Exit code | O que fazer |
| --- | --- | --- |
| sistema ou versão fora da lista | 11 `UNSUPPORTED_SYSTEM` | confira a tabela do começo do capítulo |
| execução como root | 12 `ROOT` | rode como o seu usuário; no servidor, crie o usuário antes |
| menos espaço que o mínimo | 14 `DISK_SPACE` | libere espaço na pasta pessoal |
| rede ou relógio | 5 `NETWORK_OR_API` | confira a conexão e ative o NTP |

Com o plano conferido, execute sem `--dry-run`:

```bash
setupvibe init
```

O `init` instala as dependências de compilação e o mise, grava o registro em
`~/.setupvibe/config.json` e para. Ele não instala o resto da lista. Numa
máquina sem identidade Git configurada, ele pergunta o nome e o e-mail uma vez,
grava no Git e no estado do SetupVibe. Numa máquina que já tem ferramentas, ele
registra o que passa na verificação como `adopted` em
`~/.setupvibe/selection.json`, sem instalar nem remover nada. A saída informa
quantos itens foram adotados e lista os ids.

Itens adotados não saem num `remove` sem `--force`, porque não foi o SetupVibe
que os instalou. Se um passo falhar, o `init` continua os outros e termina com
10 `PARTIAL`; o log da execução mostra cada resultado.

## 5. Instale os primeiros itens

Comece pelo ambiente do terminal, que é onde o resto do trabalho acontece:
`zsh`, `starship` e `tmux`. O `--dry-run` mostra as dependências puxadas junto
e a ordem:

```bash
setupvibe install zsh starship tmux --dry-run
```

O plano inclui os requisitos de cada item e a configuração do shell quando a
seleção tem `zsh`, `tmux`, `tpm`, `starship` ou `oh-my-zsh`. Passos que já estão
prontos aparecem como pulados. Sem `--dry-run`, a execução instala e confere
cada item antes de gravar a seleção:

```bash
setupvibe install zsh starship tmux
```

O `install` grava em `~/.setupvibe/selection.json` o item e a versão instalada.
Se o item já passa na verificação com a versão fixada, ele é pulado e o motivo
aparece na saída; `--force` reinstala. Quando existe outra cópia da ferramenta
na máquina, o comando avisa o caminho antes de instalar a cópia do SetupVibe,
que fica em pasta própria e não substitui a outra.

Se você pular o `init`, o comando recusa e aponta o que falta:

```text
✗ init has not been completed. Run: setupvibe init
```

Essa recusa sai com exit code 3, `CONFIG`. É o mesmo código que um
`settings.json` inválido devolve, por isso leia a mensagem além do número.

Para instalar uma ferramenta que não está na lista, use `--external`. A versão
fica fixada no registro em `~/.setupvibe/external.json`:

```bash
setupvibe install --external terraform@1.13.4
```

## 6. Ou deixe o `auto` fazer tudo

Quando a máquina precisa ficar igual a outra, ou quando não há ninguém para
responder, o `auto` percorre a instalação inteira sem perguntas. Ele lê as
respostas de opções, variáveis `SETUPVIBE_*` ou de um arquivo `--config`,
instala os itens, configura o shell e aplica o módulo de segurança quando cabe.

```bash
setupvibe auto --dry-run
```

O `--dry-run` mostra o plano completo sem alterar nada, e o `--plan arquivo.json`
grava o mesmo plano para revisão. O capítulo
[Instalação automática](02-instalacao-automatica.md) mostra os perfis, o arquivo
de respostas, a retomada depois de uma falha e o uso em provisionamento.

| Situação | Caminho |
| --- | --- |
| máquina pessoal, você quer escolher item por item | `init` e depois `install` |
| máquina de equipe, VPS ou CI, que precisa ficar igual à outra | `auto` com `--profile` ou `--config` |
| quer revisar antes de executar | `auto --dry-run` ou `auto --plan` |

## 7. Confira o resultado

`setupvibe check` roda a verificação de cada item selecionado e compara com a
versão fixada. Sem itens na seleção, ele confere o perfil `essencial`. O comando
não altera nada; ele responde com exit code 0 quando tudo confere e 10 quando
algum item falha. Com `--json`, a mesma informação chega no envelope que um
script lê.

```bash
setupvibe check
setupvibe check zsh tmux --json
```

`setupvibe doctor` olha a máquina inteira: runtime, estado do SetupVibe,
pré-requisitos pendentes, itens e restos do SetupVibe 1. Trecho da saída desta
máquina, que veio do SetupVibe 1 com a pasta de estado em modo 775:

```text
Runtime

✓ bun: 1.4.4; minimum 1.4.4
! stdin: Not a TTY
! stdout: Not a TTY
✗ directory: Mode 775, expected 700; doctor --fix sets it
! settings: Not created
! master-key: none
! credentials: Not created
✓ binary: setupvibe 2.0.0-dev.25
✓ platform: linux-x64
```

`✓` é aprovado, `!` é aviso e `✗` é problema. O estado do SetupVibe deve ficar
numa pasta `0700`, porque ela guarda o cofre; o `doctor --fix` corrige o modo e
as demais correções seguras (pastas e bloco do shell), e deixa o resto para você
decidir. Sem `--fix`, o comando não aplica correção alguma.

## O que mudou na máquina

| Caminho | O que é |
| --- | --- |
| `~/.local/bin/setupvibe` ou `/usr/local/bin/setupvibe` | o binário instalado pelo installer |
| `~/.local/bin/mise` | o gerenciador de versões instalado pelo `init` |
| `~/.setupvibe/config.json` | edição, sistema detectado, registro do `init` e identidade do Git |
| `~/.setupvibe/selection.json` | itens escolhidos, versão instalada e status do último `check` |
| `~/.setupvibe/settings.json` | preferências, criado na primeira gravação |
| `~/.setupvibe/last-run.json` | resultado completo do último `auto`, quando você usa esse caminho |
| `~/.setupvibe/logs/` | um log por execução, com um evento por linha |
| `~/.zshrc` e `~/.tmux.conf` | bloco entre `# >>> setupvibe >>>` e `# <<< setupvibe <<<` (no Omarchy, `~/.bashrc`) |
| `~/.zshrc.local` e `~/.tmux.conf.local` | o lugar das suas linhas, fora do bloco |
| `~/.config/mise/config.toml` | versões globais do mise escolhidas pelos itens |

A pasta `~/.setupvibe/` é criada com permissão `0700` e os arquivos que o
binário grava ficam com `0600`. O `shell apply` guarda uma cópia do arquivo
original em `~/.setupvibe/backups/` antes da primeira alteração.

## Se algo der errado

| Sintoma | Causa provável | O que fazer |
| --- | --- | --- |
| `setupvibe: command not found` | `~/.local/bin` fora do `PATH` | abra um terminal novo ou acrescente a pasta ao `PATH` |
| exit code 3 com `init has not been completed` | comando de item antes do `init` | rode `setupvibe init` |
| exit code 12 `ROOT` | execução como root | rode como o seu usuário; no servidor, use `setupvibe user create` |
| exit code 14 `DISK_SPACE` | menos de 10 GB livres na desktop | libere espaço e repita |
| exit code 20 `REBOOT_PENDING` | o sistema pede reinício | reinicie ou use `auto --reboot` |
| exit code 10 `PARTIAL` | um passo falhou e os outros seguiram | leia `~/.setupvibe/logs/` e rode `setupvibe doctor` |
| installer recusa a assinatura | `SHA256SUMS` não corresponde ao workflow | não use o arquivo baixado; baixe de novo e confira o release |

## Próximo passo

A máquina já tem o binário, os pré-requisitos e os primeiros itens. O capítulo
[Instalação automática](02-instalacao-automatica.md) mostra como transformar
esse mesmo caminho num provisionamento repetível, com perfil, arquivo de
respostas e retomada depois de uma falha.

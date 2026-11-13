# Troubleshooting

O `{{bin}} doctor` é o primeiro comando em qualquer falha: ele confere o
runtime, o `init`, os itens, o PATH, o bloco do shell, o estado do Windows e os
restos do SetupVibe 1, e mostra o comando que resolve cada achado. O que segue
são as situações que o código trata, com o sintoma, a causa, o comando e o exit
code envolvido.

| Sintoma | Vá para |
| --- | --- |
| `sudo asks for a password` ou nada acontece sem terminal | [Sudo sem senha](#sudo-sem-senha) |
| `Another SetupVibe run is in progress` | [Outra execução em andamento](#outra-execução-em-andamento) |
| download falha atrás de proxy ou CA corporativa | [Proxy e CA](#proxy-e-ca) |
| `github.com unreachable` ou relógio fora | [Rede e relógio](#rede-e-relógio) |
| `10 GB needed` ou `5 GB needed` | [Disco](#disco) |
| ferramenta com status `other` e versão diferente | [Ferramenta de outro gerenciador](#ferramenta-de-outro-gerenciador) |
| `N of M steps failed` | [Falha parcial](#falha-parcial) |
| `SetupVibe 1 found` | [SetupVibe 1 na máquina](#setupvibe-1-na-máquina) |
| `! Restart needed` no fim do `auto` | [Reinício pendente](#reinício-pendente) |
| `containers publish ports on every interface` | [Container publicado em todas as interfaces](#container-publicado-em-todas-as-interfaces) |
| `aliases not defined because a command has the same name` | [Aliases que não foram criados](#aliases-que-não-foram-criados) |
| Windows com reinício pendente ou component store corrompido | [Windows](#windows) |
| WSL sem acesso de entrada | [WSL](#wsl) |
| `settings.json does not contain valid JSON` | [settings.json inválido](#settingsjson-inválido) |
| `Run: <bin> upgrade` ao ler um arquivo de estado | [Estado de versão mais nova](#estado-de-versão-mais-nova) |
| ferramenta MCP com `isError: true` | [Ferramenta MCP devolve isError](#ferramenta-mcp-devolve-iserror) |
| comando em pipe imprime a ajuda e sai com 2 | [Sem terminal](#sem-terminal) |

## Sudo sem senha

**Sintoma.** O `auto` para com `sudo asks for a password. auto needs
passwordless sudo` mesmo num terminal. `init`, `migrate` e `shell apply` param
com `sudo asks for a password and there is no terminal to type it` quando não
há terminal para digitar a senha.

**Causa.** Todo passo privilegiado roda com `sudo -n`. O `auto` exige a regra
sem senha desde o começo e não abre prompt. `init`, `migrate` e `shell apply`
pedem a senha uma vez num terminal e seguem com as credenciais em cache; sem
terminal, param antes de alterar a máquina.

**Comando.** Crie a regra do SetupVibe para o usuário de trabalho. Num
terminal, `sudo -v` antes mantém a credencial em cache, e o `sudo -n` da
execução seguinte passa:

```bash
{{bin}} user nopasswd deploy
sudo -v && {{bin}} auto --user deploy
{{bin}} auto --user deploy --keep-nopasswd
```

Para retirar a regra depois:

```bash
{{bin}} user nopasswd deploy --remove
```

**Exit code.** 13 (`SUDO_PASSWORD`). O `auto` com `--keep-nopasswd` mantém a
regra temporária que ele mesmo criou.

## Outra execução em andamento

**Sintoma.** `✗ Another SetupVibe run is in progress.`

**Causa.** O `auto` grava o PID em `~/.setupvibe/run.lock` e só uma execução
altera a máquina por vez. Um lock de processo que já morreu é assumido
automaticamente; um lock de processo vivo recusa a segunda execução.

**Comando.** Confira o PID e espere, ou remova o lock quando o dono não existe
mais:

```bash
cat ~/.setupvibe/run.lock
ps -p "$(cat ~/.setupvibe/run.lock)"
rm ~/.setupvibe/run.lock
```

**Exit code.** 30 (`LOCKED`).

## Proxy e CA

**Sintoma.** Download, `apt`, `mise`, `npm` ou `pip` falham com erro de TLS ou
de certificado, e o mesmo endereço abre no navegador.

**Causa.** A rede corporativa exige proxy, uma CA própria ou as duas coisas. O
binário repassa `HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` e `ALL_PROXY` aos
comandos, inclusive os que rodam com `sudo`, e exporta `SETUPVIBE_CA_FILE` para
Node, Bun, curl, Git, Python e pip.

**Comando.** Passe a CA e o proxy na execução, ou grave os dois no
`~/.setupvibe/config.json` para valer sempre:

```bash
{{bin}} auto --ca-file /etc/ssl/certs/corp.pem --cache-dir /srv/setupvibe-cache
HTTPS_PROXY=http://proxy.empresa:3128 {{bin}} install node
cat ~/.setupvibe/config.json
$EDITOR ~/.setupvibe/config.json
```

O bloco do `config.json` fica assim:

```json
{ "network": { "caFile": "/etc/ssl/certs/corp.pem", "cacheDir": "/srv/setupvibe-cache" } }
```

**Exit code.** 5 (`NETWORK_OR_API`) quando a falha de TLS vira falha de
download. Uma CA aceita só por uma ferramenta costuma aparecer como falha de
passo, com 10 (`PARTIAL`).

## Rede e relógio

**Sintoma.** `✗ github.com unreachable` no `auto`, ou uma checagem que avisa
que o relógio está mais de cinco minutos fora.

**Causa.** Todo download do SetupVibe vem do GitHub. Sem rede, o `init` e o
`auto` param na checagem. Com relógio fora, TLS e soma de verificação falham
mesmo com rede boa.

**Comando.** Confira DNS, proxy e relógio, e use o cache quando a máquina não
tem saída:

```bash
{{bin}} system
{{bin}} auto --skip-network-check --cache-dir /srv/setupvibe-cache
sudo timedatectl set-ntp true
```

Com o cache quente, um download fixado no inventário instala sem rede. O
`--skip-network-check` pula só a checagem de rede e relógio, não os downloads.

**Exit code.** 5 (`NETWORK_OR_API`) para a rede, 1 (`GENERIC_ERROR`) para o
relógio fora da tolerância.

## Disco

**Sintoma.** `✗ 3.2 GB free, 10 GB needed`.

**Causa.** O `init` e o `auto` exigem 10 GB livres na pasta do usuário no
desktop e 5 GB no servidor. É o espaço para os runtimes, os caches e os
downloads.

**Comando.** Libere espaço e rode de novo. Para ver o que ocupa a pasta:

```bash
df -h ~
du -sh ~/* | sort -h | tail
{{bin}} auto --cache-dir /outro/disco/setupvibe-cache
```

**Exit code.** 14 (`DISK_SPACE`). Mover o cache para outro disco reduz a
necessidade de espaço na pasta do usuário.

## Ferramenta de outro gerenciador

**Sintoma.** Um item aparece com status `other` no `list` e na TUI, e a versão
instalada não é a fixada. O `doctor` mostra
`the command in PATH comes from /usr/bin/... not from mise`.

**Causa.** O SetupVibe instala pelo mise nas pastas dele e não sobrescreve uma
ferramenta que veio do APT, Homebrew, npm ou do instalador do fornecedor. Ele
mostra de onde vem a cópia atual e instala a dele ao lado.

**Comando.** Escolha uma das saídas: remover a outra cópia, ou pôr os shims do
mise na frente no PATH.

```bash
{{bin}} list --check
command -v node
{{bin}} install node
{{bin}} doctor
```

**Exit code.** 0 quando a instalação ao lado termina. Uma falha de item aparece
como 10 (`PARTIAL`), e `doctor` com achado fail devolve 3 (`CONFIG`).

## Falha parcial

**Sintoma.** `✗ 3 of 42 steps failed. Log: ~/.setupvibe/logs/...`

**Causa.** Um passo que falha não interrompe os outros. O resultado fica no log
da execução e em `~/.setupvibe/last-run.json`, com status por item.

**Comando.** Leia a falha no log, corrija a causa e repita só o que faltou:

```bash
{{bin}} doctor
{{bin}} install node python --force
{{bin}} check
tail -n 40 "$(ls -t ~/.setupvibe/logs/*.log | head -1)"
```

**Exit code.** 10 (`PARTIAL`). O resto do plano ficou aplicado; não é preciso
recomeçar do zero. A TUI mostra os mesmos eventos no módulo Logs.

## SetupVibe 1 na máquina

**Sintoma.** `doctor` mostra `! SetupVibe 1 found: ~/.zshrc from SetupVibe 1;
~/.tmux.conf from SetupVibe 1; ...` e o Início sugere a migração.

**Causa.** A máquina foi preparada pelo SetupVibe 1 (0.41.x). O `auto`, o
`shell apply` e o `doctor --fix` convertem os arquivos antes de gravar o bloco,
mas o `migrate` faz a conversão completa, com backup, e trata as duplicidades.

**Comando.** Veja o plano e depois migre; o guia completo está em
[migration.md](migration.md).

```bash
{{bin}} migrate --dry-run
{{bin}} migrate
{{bin}} migrate --remove-legacy all
```

**Exit code.** 0 quando a migração termina, 10 (`PARTIAL`) quando um passo
falha, 13 (`SUDO_PASSWORD`) sem terminal para o `sudo`.

## Reinício pendente

**Sintoma.** O `auto` termina com `! Restart needed` e exit code 20.

**Causa.** O Linux cria `/var/run/reboot-required` quando um pacote exige
reinício. O `auto` não reinicia sozinho sem `--reboot`.

**Comando.** Reinicie e rode de novo, ou peça a retomada automática:

```bash
test -f /var/run/reboot-required && echo "restart pending"
{{bin}} auto --reboot
```

**Exit code.** 20 (`REBOOT_PENDING`). Com `--reboot`, o `auto` instala uma
unidade systemd de execução única que retoma o plano depois do reinício.

## Container publicado em todas as interfaces

**Sintoma.** O `doctor` avisa
`containers publish ports on every interface: portainer 0.0.0.0:9443->9443/tcp`.

**Causa.** O Docker escreve as próprias regras de iptables e não passa pelo
UFW. Um `-p 9443:9443` fica aberto para a internet, mesmo com o firewall
ligado.

**Comando.** Publique na interface local e alcance o serviço por SSH ou
Tailscale:

```bash
docker ps --format '{{.Names}}  {{.Ports}}'
docker run -d --name app -p 127.0.0.1:8080:8080 minha/imagem
```

**Exit code.** 0 no `doctor` quando é o único achado, porque é aviso; 3
(`CONFIG`) quando há um achado de nível fail junto.

## Aliases que não foram criados

**Sintoma.** O `doctor` avisa
`aliases not defined because a command has the same name: dc (/usr/bin/dc)`.

**Causa.** Cada alias passa por `_sv_alias`, que só define o nome quando nenhum
alias, função ou comando instalado responde por ele. A sua configuração e os
programas reais têm prioridade.

**Comando.** Confira quem responde ao nome e escolha outro no arquivo `.local`:

```bash
type dc
{{bin}} doctor
echo 'alias dcx="docker compose"' >> ~/.zshrc.local
exec $SHELL -l
```

**Exit code.** 0, porque o achado é aviso.

## Windows

**Sintoma.** `init` ou `auto` param por reinício pendente, ou o `doctor` avisa
que o component store está corrompido.

**Causa.** O Windows agenda a instalação de componentes e exige reinício antes
de continuar. O `auto` lê as chaves `RebootPending` e `RebootRequired`; o
`doctor` e o `init` rodam `DISM /Online /Cleanup-Image /CheckHealth`.

**Comando.** Rode num PowerShell elevado. Para retomar sozinho depois do
reinício, use `--reboot`, que cria a tarefa `SetupVibeAutoResume`. Para reparar
o component store, rode a reparação lenta:

```powershell
setupvibe doctor
setupvibe auto --reboot
setupvibe doctor --repair-windows
```

**Exit code.** 20 (`REBOOT_PENDING`) quando falta reiniciar. A reparação roda
`DISM /RestoreHealth` e depois `sfc /scannow`, e devolve 10 (`PARTIAL`) se um
dos dois falhar. Um component store que não pode ser reparado pede a imagem de
instalação da mesma build.

## WSL

**Sintoma.** Um serviço dentro do WSL responde no próprio WSL e não responde a
partir do Windows ou de outra máquina.

**Causa.** O firewall Hyper-V recusa conexões de entrada para o WSL, e o
SetupVibe mantém esse padrão. A instalação do WSL 2 grava um bloco no
`%USERPROFILE%\.wslconfig` com rede espelhada, DNS por tunelamento, proxy,
recuperação de memória e disco esparso.

**Comando.** Abra só a porta necessária, no PowerShell elevado:

```powershell
New-NetFirewallHyperVRule -Name setupvibe-3000 -DisplayName setupvibe-3000 -Direction Inbound -VMCreatorId '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -Protocol TCP -LocalPorts 3000
```

**Exit code.** Não há code próprio: o achado `wsl-firewall` do `doctor` é aviso,
e a conexão recusada aparece no serviço, não no SetupVibe.

## settings.json inválido

**Sintoma.** `✗ ~/.setupvibe/settings.json does not contain valid JSON.` ou
`✗ "tui.theme" accepts only: night, day; got "dusk".`

**Causa.** O arquivo é JSON com dois espaços de indentação, e os valores de
enum e boolean passam pela conversão do schema antes de serem gravados.

**Comando.** Leia o arquivo, corrija o valor ou volte ao padrão:

```bash
{{bin}} config list
{{bin}} config schema
{{bin}} config unset tui.theme
{{bin}} config set tui.theme night
```

**Exit code.** 3 (`CONFIG`). Um erro de permissão no arquivo devolve 7
(`PERMISSION`).

## Estado de versão mais nova

**Sintoma.** `config.json uses schema 2, newer than this SetupVibe (1). Run:
{{bin}} upgrade`, com o nome do binário em execução.

**Causa.** Um binário mais novo gravou o arquivo de estado. O binário antigo
recusa ler um formato que não conhece, em vez de corromper o arquivo.

**Comando.** Atualize o binário; os arquivos de estado continuam válidos.

```bash
{{bin}} upgrade --check
{{bin}} upgrade
```

**Exit code.** A recusa acontece no início de qualquer command e aparece no
stderr; o `upgrade` devolve 0 quando conclui.

## Ferramenta MCP devolve isError

**Sintoma.** Uma tool MCP devolve `isError: true` e o agente não sabe se a
operação rodou.

**Causa.** `isError` aparece quando o exit code do CLI não é zero ou quando a
tool recusa a chamada. `doctor` com achado fail devolve 3, `check` com item fora
da versão devolve 10, `install` sem `init` devolve 3, e `remove` e `migrate` sem
`confirm` devolvem 2 sem rodar nada.

**Comando.** Leia `exitCode` e `data` antes de `isError`, confira o log da
execução e use o CLI quando a correção exige confirmação no terminal:

```bash
{{bin}} mcp --list
{{bin}} doctor
{{bin}} logs
```

**Exit code.** O mesmo da operação: 2 na recusa local, 3 em configuração ou
`doctor` com fail, 10 em falha parcial e 13 quando o `sudo` pede senha. A tool
não altera o code.

## Sem terminal

**Sintoma.** Um script roda `{{bin}}` sem argumentos e recebe a ajuda com exit
code 2. O `tui` num pipe devolve 8.

**Causa.** Sem argumentos, o binário abre a TUI apenas num terminal
interativo. Num pipe, ele imprime a ajuda e sai com 2 para não travar. O
command `tui` exige stdin e stdout em TTY e devolve 8 fora disso.

**Comando.** Use o CLI com `--json`, que é o caminho para scripts e agentes:

```bash
{{bin}} system --json
{{bin}} list --json
```

**Exit code.** 2 (`USAGE`) para o binário sem argumentos num pipe; 8
(`NO_TTY`) para `tui`.

## Duas edições na mesma máquina

**Sintoma.** `✗ the desktop edition is already set up on this machine`, ou o
`doctor` avisa que as duas edições estão instaladas.

**Causa.** `setupvibe` e `setupvibe-server` compartilham `~/.setupvibe/` e o
prefixo `SETUPVIBE_`. Só uma edição pode ficar instalada por máquina.

**Comando.** Remova a edição que não vai ficar, mantendo os dados se precisar:

```bash
setupvibe self uninstall --yes --keep-data
setupvibe-server init
```

**Exit code.** 2 (`USAGE`) no `init` e no `auto` da edição que não pode rodar.

## PATH e bloco do shell

**Sintoma.** `! ~/.local/bin is not in this shell's PATH yet`, ou
`! the SetupVibe shell block is missing`. Um comando instalado não é
encontrado.

**Causa.** O bloco do shell é gravado entre `# >>> setupvibe >>>` e
`# <<< setupvibe <<<` e só passa a valer num shell novo. O `doctor --fix`
converte os arquivos do SetupVibe 1 e recria o bloco e a pasta.

**Comando.** Aplique o bloco e abra um shell novo:

```bash
{{bin}} doctor --fix
{{bin}} shell apply
exec $SHELL -l
```

**Exit code.** 0 quando o bloco é reaplicado; 10 (`PARTIAL`) quando algum passo
do plano falha.

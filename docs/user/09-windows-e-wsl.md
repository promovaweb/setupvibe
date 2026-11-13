# Windows e WSL

O Windows não aceita o mesmo preparo de um Linux. O gerenciador de pacotes é
outro, o shell é PowerShell, e boa parte das ferramentas que um projeto espera
roda dentro do WSL. O SetupVibe trata os dois como alvos separados: o binário
nativo prepara o Windows, e o WSL recebe o binário Linux quando você entra na
distribuição.

## Instalar no Windows

O installer do Windows é um script PowerShell servido pelo branch `v2`. Ele lê a
versão do canal, baixa `setupvibe-windows-x64.exe`, confere o `SHA256SUMS`,
instala em `%LOCALAPPDATA%\Programs\SetupVibe` e acrescenta a pasta ao `PATH` do
usuário.

```powershell
irm https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.ps1 | iex
```

Para passar argumentos ao binário, use a forma de scriptblock:

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.ps1))) auto
```

No lançamento, `windows.setupvibe.dev` passa a servir o mesmo arquivo. Até lá, o
endereço acima é o que está publicado no branch `v2`, e o endereço público
continua apontando para o SetupVibe 1.

O binário exige Windows x64 com build 22621 ou mais recente. Uma arquitetura
fora de x64 e uma build anterior saem com 11, `UNSUPPORTED_SYSTEM`. Como o `auto`
precisa instalar pacotes e alterar serviços, rode num PowerShell elevado; o
binário não abre o UAC sozinho.

## O que entra no Windows

O winget instala os utilitários: Git, PowerShell 7, Windows Terminal, 7-Zip,
FFmpeg, ImageMagick, Nerd Font, nmap, Speedtest, btop e Tailscale. O servidor
OpenSSH usa instalador próprio, e o Claude Code e o Antigravity entram pelo
instalador oficial de cada fornecedor.

Os runtimes e as ferramentas de terminal entram pelo mise, igual ao Linux: Node,
Python, Go, Rust, uv, Bun, pnpm, `bat`, `eza`, `jq` e `ripgrep`. O WSL entra
como configuração, não como distribuição: o item `wsl` prepara a base e deixa a
escolha da distribuição para você.

O que não existe no Windows aparece como `unavailable` na lista, e o `auto` não
tenta instalar. ZSH, Oh My Zsh, Starship, tmux e os itens gráficos de desktop
ficam de fora, porque o alvo é o shell nativo.

## O WSL

Instalar uma distribuição Linux no Windows é decisão sua. O SetupVibe não baixa
Ubuntu nem Debian sozinho: ele prepara a base do WSL 2 e o arquivo de
configuração que faz o resto funcionar.

O `auto` grava um bloco em `%USERPROFILE%\.wslconfig`, depois de uma cópia de
segurança, com rede espelhada, DNS por tunelamento, proxy automático, firewall
ligado, recuperação gradual de memória e disco virtual esparso:

```ini
[wsl2]
networkingMode=mirrored
dnsTunneling=true
autoProxy=true
firewall=true

[experimental]
autoMemoryReclaim=gradual
sparseVhd=true
```

A rede espelhada faz o WSL herdar as interfaces e a VPN do Windows, e o
tunelamento de DNS resolve o caso de VPN corporativa. O firewall do Hyper-V
continua ligado com o padrão que bloqueia conexões de entrada: um serviço que
roda dentro do WSL e responde ali não responde a partir do Windows até você abrir
a porta.

Isso é diferente do SetupVibe 1, que abria toda conexão de entrada. Para abrir
só a porta necessária, num PowerShell elevado:

```powershell
New-NetFirewallHyperVRule -Name setupvibe-3000 -DisplayName setupvibe-3000 -Direction Inbound -VMCreatorId '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -Protocol TCP -LocalPorts 3000
```

Para trabalhar por SSH ou Tailscale, prefira publicar na própria máquina e
alcançar pelo túnel, sem abrir porta no firewall.

## O binário dentro do WSL

O binário nativo do Windows cuida do Windows. Dentro de uma distribuição WSL,
instale o binário Linux com o installer normal, como no capítulo de instalação:

```bash
curl --proto '=https' --tlsv1.2 -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.sh | sh
```

O detectSystem reconhece o WSL pelo `WSL_DISTRO_NAME` ou pelo `/proc/version`, e
a lista da edição desktop já tem entradas para esse sistema. O que muda é a
origem de alguns itens: no WSL, o Docker CLI pode ser dispensado quando o Docker
Desktop do Windows já o fornece, e o `auto` respeita isso.

## Diagnóstico no Windows

`setupvibe doctor` confere o runtime, o estado, os itens e a saúde do component
store com `DISM /Online /Cleanup-Image /CheckHealth`. A reparação lenta é
explícita e demora:

```powershell
setupvibe doctor --repair-windows
```

Ela roda `DISM /RestoreHealth` e depois `sfc /scannow`, exige PowerShell elevado
e devolve 10 quando um dos dois falha. Um component store que não pode ser
reparado pede a imagem de instalação da mesma build.

Quando o sistema pede reinício, o `auto` termina com 20, `REBOOT_PENDING`. Com
`--reboot`, ele cria a tarefa `SetupVibeAutoResume`, que roda o `auto` de novo
com privilégio máximo depois do reinício e se apaga no fim.

## Se algo der errado

| Sintoma | Causa provável | O que fazer |
| --- | --- | --- |
| `init` ou `auto` param com 20 | reinício pendente do Windows | reinicie ou repita com `--reboot` |
| `doctor` avisa do component store | componentes corrompidos | rode `doctor --repair-windows` num PowerShell elevado |
| serviço no WSL não responde de fora | firewall do Hyper-V bloqueia entrada | abra só a porta necessária ou use túnel |
| item marcado como `unavailable` | aquele item não existe no Windows | confira a tabela do `docs inventory` |
| `setupvibe: command not found` | pasta fora do `PATH` do usuário | abra um terminal novo ou acrescente a pasta |

## Próximo passo

Windows e WSL têm o que precisam. O capítulo [Vindo do SetupVibe 1](10-vindo-do-setupvibe-1.md)
trata da máquina que já foi preparada pelo produto anterior e precisa migrar sem
perder configuração.

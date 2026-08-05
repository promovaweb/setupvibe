# Edição Windows do SetupVibe (Beta)

> Configuração de utilitários nativos do Windows — v0.41.11

A Edição Windows (Beta) configura utilitários nativos do Windows, Python, Node.js e CLIs de IA selecionadas, usando o WinGet como fonte principal e o Chocolatey para pacotes indisponíveis no WinGet.

## Requisitos

- Windows 11 versão 22H2 (build 22621) ou posterior
- Uma edição desktop x64 (AMD64) do Windows. Não há suporte para Windows de 32 bits, Windows em ARM, Windows 10 nem Windows Server
- Windows PowerShell 5.1 ou posterior
- Uma conta que pertença ao grupo Administradores local. O prompt do UAC deve usar a mesma conta conectada
- Acesso à internet

## O Que É Instalado

- Cliente e Servidor Microsoft Win32-OpenSSH oficiais mais recentes pelo MSI Win64 x64 assinado
- WinGet pelo fluxo oficial de reparo `Microsoft.WinGet.Client`, quando ausente
- Chocolatey pelo script oficial de bootstrap, quando ausente
- Python 3.14 diretamente pelo instalador oficial do `python.org` e Node.js 24 LTS pelo canal oficial `latest-v24.x` do `nodejs.org`, com `python`, `pip`, `node`, `npm` e `npx` no `PATH` da máquina para Claude e Codex
- Claude Code pelo instalador nativo recomendado da Anthropic, com seu pacote npm oficial como recuperação, Codex CLI pelo instalador autônomo oficial da OpenAI para Windows e Google Antigravity CLI como `agy` pelo seu instalador nativo oficial
- [Vercel Labs Skills CLI](https://github.com/vercel-labs/skills) pelo pacote npm oficial, com o lançador `skills.cmd` compatível com política de execução restrita
- Sistema base do WSL sem uma distribuição Linux, com WSL 2 como padrão
- Rede espelhada do WSL com acesso por VPN/LAN, tunelamento de DNS, integração com o proxy do Windows, entrada liberada no firewall Hyper-V, recuperação automática de memória e discos virtuais esparsos
- Git, 7-Zip, Wget, FFmpeg, ImageMagick e GitHub CLI (`gh`)
- bat, eza, zoxide, fzf, ripgrep, fd, lazygit, Neovim, Glow, tldr, Fastfetch, duf e jq
- Nmap, Speedtest CLI, Tailscale, gping, btop4win e trippy
- PowerShell 7, Windows Terminal, FiraCode Nerd Font e JetBrains Mono Nerd Font

O instalador é idempotente: pacotes WinGet instalados são detectados e ignorados, o Chocolatey verifica os pacotes sob sua gestão e os instaladores oficiais do Python e Node.js são reaplicados com segurança. Falhas são registradas por pacote para que as demais instalações continuem. Um log completo é salvo em `C:\ProgramData\SetupVibe\Logs`.

Os perfis do Windows PowerShell e PowerShell 7 permanecem originais. Starship e ZSH não são instalados, a política de execução não é alterada e o zoxide permanece somente como utilitário CLI sem inicialização automática.

Python e Node.js são os únicos runtimes de programação instalados por este script. Claude Code, Codex CLI e Antigravity CLI são suas únicas CLIs de IA. Ele não instala uma distribuição Linux, frameworks, gerenciadores de runtime, outras CLIs de IA nem outros ecossistemas de linguagens. Depois de instalar uma distribuição separadamente, use o `desktop.sh` dentro dela para configurar um ambiente completo de desenvolvimento.

Se `%USERPROFILE%\.wslconfig` já existir, o SetupVibe cria um backup antes de aplicar os padrões de desenvolvimento. O backup e os estados anteriores dos recursos e do firewall do WSL são restaurados por `-Uninstall`.

O Docker Desktop foi excluído intencionalmente. O SetupVibe prepara o WSL 2, mas não instala o Docker nem uma distribuição Linux.

**Aviso sobre a rede do WSL:** o SetupVibe libera o tráfego de entrada para o WSL em todas as portas pelo firewall Hyper-V, permitindo que serviços futuros sejam acessados pela rede local e por VPNs compatíveis. Restrinja essa política com regras específicas do firewall Hyper-V em redes não confiáveis. Um serviço Linux futuro precisa escutar em `0.0.0.0` ou na interface de rede apropriada para aceitar conexões remotas.

## Instalação Com Um Comando

Este é o equivalente no Windows ao comando `curl -sSL desktop.setupvibe.dev | bash`.

A URL canônica do instalador Windows é `https://windows.setupvibe.dev`.

1. Abra o menu Iniciar.
2. Procure por **Windows PowerShell** e abra-o. Executar como administrador é opcional, pois o script solicita elevação pelo UAC automaticamente.
3. Revise o [`desktop.ps1`](../../../desktop.ps1) do repositório antes de executar código remoto.
4. Cole o comando abaixo e pressione `Enter`:

   ```powershell
   [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; irm https://windows.setupvibe.dev | iex
   ```

5. Aceite a solicitação do UAC do Windows.
6. Mantenha as janelas do PowerShell abertas até a exibição do resumo.
7. Reinicie o Windows quando solicitado para aplicar alterações pendentes de componentes ou pacotes.

O comando baixa o `desktop.ps1` do repositório oficial do SetupVibe e o executa na sessão atual do PowerShell. Quando a elevação é necessária, o instalador baixa uma cópia temporária e continua em uma sessão de administrador.

## Instalação Local

Para baixar o script antes de executá-lo:

```powershell
$scriptPath = Join-Path $HOME 'Downloads\desktop.ps1'
Invoke-WebRequest -UseBasicParsing -Uri https://windows.setupvibe.dev -OutFile $scriptPath
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath
```

A partir de um clone existente deste repositório:

```powershell
Set-Location C:\caminho\para\setupvibe
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\desktop.ps1
```

## O Que Esperar

Durante a execução, o instalador:

1. Valida o Windows 11 22H2 ou posterior e a arquitetura x64, reiniciando o próprio script pelo Windows PowerShell x64 nativo se ele tiver sido iniciado em um processo de 32 bits, e recusa elevação UAC com credenciais de outro perfil de usuário.
2. Solicita privilégios de administrador pelo UAC.
3. Lista processos de instalação concorrentes e pergunta se deve encerrá-los. Se aceito, tenta normalmente, força os que permanecerem e executa `sfc.exe /scannow`. Se recusado, aguarda ENTER e encerra.
4. Recusa reinicializações pendentes, inicia os serviços necessários, executa `sfc.exe /scannow` caso ainda não tenha sido executado, verifica a política WSUS e valida o armazenamento de componentes do Windows.
5. Resolve o MSI x64 oficial mais recente do Microsoft Win32-OpenSSH sem usar a API de releases do GitHub, valida sua assinatura, instala e repara explicitamente Cliente e Servidor, configura o `PATH` da máquina, valida o código de saída de `ssh.exe -V`, inicia `sshd` automaticamente e libera a entrada TCP/22 salvando o estado anterior da regra de firewall.
6. Copia os scripts auxiliares Windows do SetupVibe para `%USERPROFILE%\.setupvibe\bin` e adiciona esse diretório ao `PATH` do usuário, normalizando e eliminando entradas duplicadas e notificando o Windows sobre a alteração de ambiente.
7. Instala o sistema base do WSL sem uma distribuição Linux e torna o WSL 2 o padrão.
8. Aplica ao WSL rede espelhada, acesso por VPN/LAN, DNS, proxy, firewall, recuperação de memória e discos VHD esparsos.
9. Instala WinGet e Chocolatey quando necessário.
10. Baixa Python 3.14 do `python.org` e resolve o Node.js 24 LTS diretamente pelo canal oficial `latest-v24.x` do `nodejs.org`, sem a API do índice de releases, WinGet ou Chocolatey. Usa o `curl.exe` do Windows com redirecionamentos somente HTTPS e novas tentativas, valida o Authenticode e o SHA-256 oficial do Node.js, repara recursos ausentes do Python ou do MSI do Node.js, remove os shims redundantes `npm.ps1` e `npx.ps1` que falham sob uma política de execução restrita, coloca os diretórios x64 nativos dos runtimes no início do `PATH` da máquina e valida `python`, `pip`, `node`, `npm` e `npx` exatamente como o usuário os executa.
11. Instala cada utilitário restante do Windows de forma independente, executa cada CLI previsível do WinGet e Chocolatey pelo `PATH` atualizado, valida `gh.exe` e o alias `wt.exe` do Windows Terminal e continua após falhas isoladas de pacote ou comando.
12. Instala e valida Skills CLI, Claude Code, Codex CLI e Antigravity CLI por suas fontes oficiais, preservando todos os arquivos de perfil PowerShell do usuário. Skills usa seu pacote npm oficial e um lançador CMD compatível com política de execução restrita. O Claude usa o instalador nativo recomendado independentemente do npm e recorre ao pacote npm oficial da Anthropic somente quando necessário. O Codex usa o instalador autônomo oficial da OpenAI em vez do npm.
13. Remove somente blocos legados reconhecidos do SetupVibe para Starship/zoxide sem recodificar conteúdo não relacionado, preservando os bytes originais dos perfis PowerShell, a configuração Starship do usuário e a política de execução.
14. Exibe um resumo final e o local do log completo.

O processo pode demorar porque os gerenciadores de pacotes baixam e instalam cada utilitário separadamente.

## Depois da Instalação

1. Reinicie o Windows quando solicitado para concluir alterações pendentes de componentes ou pacotes.
2. Abra o Windows Terminal ou PowerShell 7 para carregar o novo `PATH`.
3. Conclua as autenticações iniciais exigidas pelo GitHub CLI, Tailscale, Claude Code, Codex CLI ou Antigravity CLI.

Os scripts auxiliares do SetupVibe ficam em `%USERPROFILE%\.setupvibe\bin`. O núcleo instalado `ssh_copy_id_core.ps1` e seu lançador mínimo `ssh_copy_id.cmd` podem ser iniciados sem ambiguidade como `ssh_copy_id`. O Codex usa seu `codex.exe` nativo. Nenhum script PowerShell ou lançador do SetupVibe é necessário. Ambos os comandos funcionam em uma nova sessão do PowerShell, Windows Terminal ou Prompt de Comando.

Verifique os principais componentes em um novo terminal:

```powershell
winget --version
choco --version
git --version
gh --version
Get-Command wt
rg --version
fzf --version
pwsh --version
python --version
pip --version
node --version
npm --version
npx --version
skills --version
claude --version
codex --version
Get-Command agy
Get-Command ssh_copy_id
wsl --status
wsl --list --verbose
Get-Content $HOME\.wslconfig
Get-NetFirewallHyperVVMSetting -PolicyStore ActiveStore -Name '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}'
```

`wsl --list --verbose` deve informar que nenhuma distribuição está instalada, a menos que a máquina já tivesse uma. A saída do firewall deve mostrar `DefaultInboundAction` como `Allow`.

## Nova Execução e Logs

O instalador foi desenvolvido para ser executado novamente. Os scripts auxiliares do SetupVibe são atualizados, pacotes WinGet já presentes são ignorados e o Chocolatey garante que seus utilitários gerenciados permaneçam instalados.

Os logs completos da transcrição e os logs dedicados do DISM são armazenados em:

```text
C:\ProgramData\SetupVibe\Logs
```

Se um pacote falhar, revise o resumo final e o log, resolva o problema informado e execute o mesmo comando novamente.

## Segurança Do Windows Servicing

Antes de instalar ou remover componentes, o SetupVibe verifica processos ativos do `DISM`, `dismhost`, `TiWorker`, Windows Installer, instaladores do Windows Update, WinGet, Chocolatey e outros processos de instalação conhecidos. Ele lista nomes e PIDs e solicita permissão antes de encerrá-los. Quando aceito, primeiro usa `Stop-Process`, força os processos que permanecerem e depois executa `sfc.exe /scannow`. Quando recusado, aguarda ENTER e encerra sem iniciar outra operação de manutenção. Em seguida, recusa reinicializações pendentes do Component Based Servicing ou Windows Update, inicia os serviços necessários e executa `DISM /Online /Cleanup-Image /CheckHealth`.

Os detalhes do Verificador de Arquivos do Sistema são registrados em `C:\Windows\Logs\CBS\CBS.log`.

Se um processo permanecer ativo depois das tentativas de encerramento normal e forçado, o SetupVibe conclui a verificação do SFC, aguarda ENTER e encerra recomendando reiniciar o PC.

O OpenSSH não usa os Recursos sob Demanda do Windows nem a API de releases do GitHub. O SetupVibe resolve a página oficial `releases/latest` e seus assets expandidos, aceita somente o MSI x64 `OpenSSH-Win64-*.msi`, valida sua assinatura Authenticode e instala e repara explicitamente os recursos Cliente e Servidor em uma única transação MSI com `ADDLOCAL=Client,Server`, `REINSTALL=ALL` e `REINSTALLMODE=amus`. Ele resolve o diretório de instalação pelo diretório Program Files x64 nativo, pelos metadados do MSI e pelo serviço `sshd`, coloca esse diretório no início do `PATH` da máquina, configura `sshd` para inicialização automática, inicia o serviço, habilita a regra de firewall `OpenSSH-Server-In-TCP` para entrada TCP/22, salva o estado anterior da regra para a desinstalação e registra `openssh-msi-*.log` em `C:\ProgramData\SetupVibe\Logs`.

## Opções

Reinicie o Windows automaticamente depois de uma instalação totalmente bem-sucedida quando o sistema informar que uma reinicialização é necessária:

```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; & ([scriptblock]::Create((irm https://windows.setupvibe.dev))) -Restart
```

Sem `-Restart`, o instalador nunca reinicia o Windows automaticamente.

### Desinstalação

Remova todos os utilitários e configurações gerenciados pela Edição Windows a partir de um clone local:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\desktop.ps1 -Uninstall
```

Ou execute o desinstalador pela URL canônica do SetupVibe para Windows:

```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; & ([scriptblock]::Create((irm https://windows.setupvibe.dev))) -Uninstall
```

O modo de desinstalação remove o Cliente e o Servidor OpenSSH, Python e Node.js por seus desinstaladores oficiais, Skills CLI, Claude Code, Codex CLI, Antigravity CLI, os arquivos gerenciados pelo SetupVibe em `%USERPROFILE%\.setupvibe\bin` e as entradas correspondentes do `PATH` do usuário, restaura os estados anteriores dos recursos opcionais do WSL, do firewall do WSL e da regra de firewall do OpenSSH, remove a configuração do WSL aplicada pelo SetupVibe, remove todos os utilitários WinGet e Chocolatey gerenciados pelo SetupVibe e remove as entradas de pacotes e runtimes adicionadas pelo SetupVibe ao `PATH` da máquina e blocos legados reconhecidos do SetupVibe para Starship/zoxide. As skills de agentes instaladas são preservadas. Ele também remove ferramentas de frameworks, caminhos ausentes de gerenciadores de runtime e pacotes npm legados instalados por versões Beta anteriores do Windows. Diretórios ativos gerenciados pelo usuário no `PATH`, configuração Starship, distribuições Linux, configurações e credenciais de usuário das CLIs de IA, WinGet, Chocolatey, logs e arquivos não relacionados dentro de `%USERPROFILE%\.setupvibe` são preservados.

**Aviso sobre a desinstalação:** a versão Beta atual não registra se o Cliente e o Servidor OpenSSH ou um pacote gerenciado já existiam antes do SetupVibe. Portanto, `-Uninstall` remove o produto MSI do OpenSSH e todos os pacotes de suas listas gerenciadas, inclusive componentes que possam ter sido instalados separadamente antes do SetupVibe.

Combine `-Uninstall` com `-Restart` para reiniciar automaticamente quando o Windows informar que uma reinicialização é necessária.

## Escopo e Limitações

- Windows 10, Windows Server, builds do Windows 11 anteriores a 22621, Windows de 32 bits e Windows em ARM são recusados. Somente x64 é compatível.
- O WSL é instalado e configurado para WSL 2, rede espelhada por VPN/LAN e otimizações comuns de desenvolvimento, mas nenhuma distribuição Linux é instalada.
- Python 3.14 e Node.js 24 LTS são instalados para automações locais. Claude Code, Codex CLI e Antigravity CLI são as únicas CLIs de IA instaladas. Outras linguagens de programação, frameworks, gerenciadores de runtime e CLIs de IA são excluídos.
- Starship e ZSH não são instalados no Windows, os perfis do PowerShell não são personalizados e a política de execução persistente não é alterada.
- O Docker Desktop e um mecanismo Docker local não são instalados.

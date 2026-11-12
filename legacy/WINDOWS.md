# WINDOWS.md — Registro de investigação e correções do `desktop.ps1`

Este arquivo documenta uma sessão de depuração real do **SetupVibe Windows Desktop (Beta)**
(`desktop.ps1` v0.41.6), executada e validada numa máquina Windows 11 real
(build 26200, NOTEDEVWIN11). O objetivo era rodar o instalador de ponta a ponta,
capturar os erros reais de execução e corrigi-los na fonte — não apenas por
inspeção estática.

## Ambiente de teste

- Windows 11 Pro, build `10.0.26200.0`, x64.
- PowerShell 7.6.3 (pwsh) no terminal interativo; o script se auto-relança em
  **Windows PowerShell 5.1** nativo (`System32\WindowsPowerShell\v1.0\powershell.exe`)
  ao elevar, que é o host real onde os steps executam.
- WinGet `v1.30.50-preview`, Chocolatey `2.7.3` já presentes.
- **Smart App Control** ativo em modo de imposição (`VerifiedAndReputablePolicyState = 1`
  em `HKLM:\SYSTEM\CurrentControlSet\Control\CI\Policy`).

## Metodologia

1. Revisão estática do script inteiro (`[System.Management.Automation.Language.Parser]::ParseFile`
   confirmou zero erros de sintaxe).
2. Execução real, elevada, de ponta a ponta — **3 rodadas completas** do
   `desktop.ps1`, mais testes isolados de funções individuais via
   dot-sourcing (extraindo apenas as definições de função, antes do guard de
   execução principal, para testar helpers sem precisar rodar o script todo).
3. Cada falha real do transcript (`C:\ProgramData\SetupVibe\Logs\desktop-*.log`)
   foi rastreada até a causa raiz no código-fonte, corrigida, e **revalidada
   com uma nova execução real** — não apenas lida e assumida corrigida.

### Nota importante sobre elevação (UAC)

`desktop.ps1` eleva via `Start-Process -Verb RunAs -Wait` a partir de um
processo não-elevado. Nesta máquina, esse fluxo **não exibe um prompt UAC
interativo bloqueante visível para o agente** — ele eleva e roda em uma nova
janela de console separada (o motivo pelo qual tentativas anteriores de
capturar stdout via redirecionamento do processo pai ficavam vazias: a saída
real fica na janela elevada filha, não no processo pai redirecionado). Para
observar a saída real, é preciso ler os transcripts em
`C:\ProgramData\SetupVibe\Logs\desktop-*.log` (o script chama `Start-Transcript`
internamente), não o stdout do processo lançador.

## Bugs encontrados e corrigidos

### 1. `Get-ObjectPropertyValue` não lia chaves de `Hashtable` (bug raiz)

**Sintoma real:** falha em `Validate command: 7-Zip` e `Validate command: btop4win`
com `Test-Path: Não é possível associar o argumento ao parâmetro 'Path' porque
ele é uma cadeia de caracteres vazia.`

**Causa raiz:** `Get-ObjectPropertyValue` (linha ~243) lia valores via
`$InputObject.PSObject.Properties[$Name]`. Isso funciona para objetos
`[PSCustomObject]` (ex. saída de `Get-ItemProperty`, `ConvertFrom-Json`), mas
**não funciona para `Hashtable` literais** (`@{ Key = Value }`) — o adaptador
PSObject de um Hashtable expõe apenas as propriedades reais da classe .NET
`Hashtable` (`Keys`, `Values`, `Count`...), não suas entradas de dicionário.

O array `$script:WinGetCommandChecks` é definido com hashtables literais
(`@{ Name = '7-Zip'; Command = '7z.exe'; PreferredPaths = @(...) }`), e o
call site em `Invoke-SetupStep -Name 'Validate command: ...'` fazia:

```powershell
$preferredPaths = Get-ObjectPropertyValue -InputObject $commandCheck -Name 'PreferredPaths'
Test-InstalledCommand ... -PreferredPaths @($preferredPaths)
```

`Get-ObjectPropertyValue` sempre retornava `$null` (mesmo quando a chave
`PreferredPaths` existia de verdade), e `@($null)` em PowerShell **não é um
array vazio** — é um array de 1 elemento contendo `$null`. Isso só quebrava
para comandos cujo `Get-Command` inicial falhava (7-Zip e btop4win não
resolvem por PATH puro logo após a instalação), forçando o fallback que
itera `$PreferredPaths` e chama `Test-Path $null`.

**Correção:** `Get-ObjectPropertyValue` agora detecta `[System.Collections.IDictionary]`
e usa o indexador (`$InputObject.Contains($Name)` / `$InputObject[$Name]`)
nesse caso, preservando o comportamento original para PSObjects. O call site
também passou a normalizar `$null` para `@()` explicitamente em vez de confiar
em `@($null)`.

**Correção adicional:** `btop4win` nunca tinha `PreferredPaths` definido (só
7-Zip tinha). Localizamos o caminho real e estável do pacote WinGet nesta
máquina — `%LOCALAPPDATA%\Microsoft\WinGet\Packages\aristocratos.btop4win_Microsoft.Winget.Source_8wekyb3d8bbwe\btop4win\btop4win.exe`
— e adicionamos como `PreferredPaths`. O sufixo `_Microsoft.Winget.Source_8wekyb3d8bbwe`
é constante entre máquinas (deriva da fonte "Microsoft.Winget.Source" + um
token fixo do publisher), não é um hash por máquina.

**Validado:** rodada limpa confirmou `[OK] 7z.exe resolves to the expected
PATH executable` e `[OK] btop4win.exe resolves to the expected PATH executable`.

### 2. `ssh.exe -V` promovido a erro terminante pelo próprio stderr

**Sintoma real:** `OpenSSH Client and Server` falhava com
`TerminatingError(ssh.exe): "...OpenSSH_for_Windows_9.5p2, LibreSSL 3.8.2"` —
a própria string de versão virou a mensagem de erro.

**Causa raiz:** OpenSSH escreve `ssh -V` no **stderr** por padrão (comportamento
padrão do OpenSSH, não um bug). O código fazia:

```powershell
$sshVersion = @(& $sshPath -V 2>&1)
```

Com `$ErrorActionPreference = 'Stop'` setado globalmente no topo do script,
`2>&1` faz cada linha de stderr virar um `ErrorRecord` no pipeline de saída —
e como `ErrorActionPreference` é `Stop`, PowerShell promove esse ErrorRecord a
erro **terminante** imediatamente. É uma armadilha clássica de PowerShell:
`2>&1` + `$ErrorActionPreference = 'Stop'` quebra qualquer comando nativo que
escreva algo em stderr, mesmo que seja saída normal (não um erro real).

**Correção:** envolvida a chamada num bloco que troca `$ErrorActionPreference`
para `'Continue'` só durante a captura, restaurando-o no `finally`.

**Validado:** rodada limpa confirmou `[OK] OpenSSH Client installed:
OpenSSH_for_Windows_9.5p2, LibreSSL 3.8.2`.

### 3. MSI do Node.js: `Error 1316` / exit 1603 ao instalar via `&` de dentro de sessão já elevada

**Sintoma real:** `Node.js 24 LTS official MSI` falhava consistentemente
(3 execuções isoladas + 1 instalação manual isolada confirmaram) com
`Node.js MSI completed, but node.exe was not found`, mesmo após o
"reconfigure" com `ADDLOCAL=ALL`.

**Causa raiz (confirmada empiricamente, não só por leitura de log):** o log
verboso do MSI (`/L*v`) mostrava:

```text
SECUREREPAIR: SecureRepair Failed. Error code: 524E23F5DE8
Action start ...: ProcessComponents.
Product: Node.js -- Error 1316. A conta especificada já existe.
Action ended ...: ProcessComponents. Return value 3.
Action ended ...: INSTALL. Return value 3.
MainEngineThread is returning 1603
```

O script chamava `msiexec.exe` via `Invoke-NativeCommand`, que usa o operador
de chamada direto (`& $FilePath @ArgumentList`) — isto é, `msiexec.exe` roda
como **filho direto** do processo PowerShell já elevado (que por sua vez é
filho de outra camada de elevação: pwsh não-elevado → `Start-Process -Verb
RunAs` → Windows PowerShell 5.1 nativo elevado → `desktop.ps1`).

Testamos isoladamente:

- `& msiexec.exe /i node.msi /qn ...` a partir de dentro dessa cadeia de
  elevação → **falha sempre** com Error 1316 / exit 1603 (reproduzido 3x).
- `Start-Process -FilePath msiexec.exe -Verb RunAs -Wait` (nova elevação
  "fresca" via ShellExecute, mesmo já estando elevado) → **sucesso sempre**
  (reproduzido 2x, incluindo depois de desinstalar o Node.js manualmente
  para garantir um teste limpo).

A hipótese mais provável é que a validação **SecureRepair** do Windows
Installer (recurso de segurança que valida a identidade/token do usuário que
iniciou a instalação) se confunde quando `msiexec.exe` herda um token de uma
cadeia de elevação aninhada em vez de receber um token de elevação "fresco"
via `ShellExecuteEx` com `lpVerb=runas`. Isso não acontece com o MSI do
OpenSSH (assinado pela Microsoft) rodando pelo mesmo padrão `&` — parece ser
específico de como o instalador do Node.js (WiX) registra certos componentes
per-machine.

**Correção:** nova função `Invoke-MsiExec` que sempre invoca `msiexec.exe`
via `Start-Process -Wait -PassThru` em vez do operador `&`. Como o script já
roda elevado nesse ponto, `Start-Process` (mesmo sem `-Verb RunAs`) herda a
elevação sem reabrir prompt UAC. As duas chamadas de instalação do Node.js em
`Install-NodeJs` (instalação inicial e o "reconfigure" com `ADDLOCAL=ALL`)
foram migradas para esse helper. `Invoke-NativeCommand` e o restante do
script (Git, 7-Zip, OpenSSH, WinGet, Chocolatey validations, etc.) **não
foram tocados** — o bug é específico do MSI do Node.js, e trocar
`Invoke-NativeCommand` globalmente para `Start-Process` quebraria a captura
de stdout no transcript para todo o resto (Start-Process não herda o console/
transcript do processo pai sem redirecionamento explícito).

**Validado:** teste isolado de `Install-NodeJs` (com Node desinstalado antes,
para garantir um cenário limpo) terminou com `[OK] Node.js v24.18.0 installed
from the official nodejs.org MSI.` já na primeira tentativa, sem precisar do
fallback "reconfigure". Confirmado depois também numa rodada completa do
script.

### 4. RustScan bloqueado pelo Smart App Control — **não é bug do script**

**Sintoma real:** `Validate command: RustScan` falha com
`System.ComponentModel.Win32Exception: Uma política de Controle de Aplicativo
bloqueou este arquivo` (exit code `-532462766`).

**Causa raiz:** confirmado via `HKLM:\SYSTEM\CurrentControlSet\Control\CI\Policy`
→ `VerifiedAndReputablePolicyState = 1` — o **Smart App Control** do Windows 11
está ativo nesta máquina e bloqueia a execução do shim do Chocolatey para
`rustscan.exe` por falta de reputação/assinatura reconhecida pela Microsoft.
Isso é uma política de segurança do próprio Windows, não um defeito do
`desktop.ps1`. Uma vez ativado, o Smart App Control só pode ser desativado
via Configurações do Windows (e, uma vez desativado, não pode ser reativado
sem reinstalar o Windows).

**Ação tomada (atualizada):** inicialmente nenhuma mudança de código — não é
apropriado para um script de setup tentar contornar silenciosamente uma
política de segurança do SO, e o erro já lançado (`Invoke-NativeCommand`
reportando o exit code) era suficientemente informativo. Depois de discutir
com o usuário nesta máquina, **o RustScan foi removido do instalador**
(`$script:ChocolateyPackages` e `$script:ChocolateyCommandChecks`), já que é
o único dos ~35 apps/CLIs instalados pelo `desktop.ps1` que esbarra nesse
bloqueio — todos os demais são assinados ou vêm de editores já reconhecidos
pelo Smart App Control, ou passam pela validação do WinGet em vez do shim do
Chocolatey. `trippy` e `FiraCode Nerd Font` continuam sendo instalados
normalmente via Chocolatey sem esse problema. Isso é uma limitação de
ambiente, documentada aqui para não ser confundida com um bug do script em
futuras investigações.

### 5. Falso positivo de "instalador concorrente" causado pelo próprio SFC (`TiWorker.exe`)

**Sintoma real:** `Windows servicing and installer readiness` falhava com
`[ALERT] Installer processes remain active after the termination attempts`
logo depois do próprio `Invoke-SystemFileChecker` (SFC) rodar dentro do mesmo
step.

**Causa raiz:** `sfc.exe /scannow` é executado pelo serviço TrustedInstaller
através do seu próprio processo `TiWorker.exe` — que está na lista de nomes
observados por `Get-ActiveWindowsInstallerProcesses` (junto com `msiexec`,
`dism`, `winget`, `choco`, etc.). `TiWorker.exe` costuma continuar vivo por
alguns segundos (ou mais, dependendo da carga) depois que o SFC imprime
"Verificação 100% concluída", então a checagem de "processos restantes" que
roda **logo em seguida**, no mesmo step, frequentemente pega o próprio
worker do TrustedInstaller que o script acabou de invocar, tratando-o como
"outro" instalador concorrente.

**Correção:** adicionado um loop de espera curto (até 15 tentativas × 2s = 30s)
antes de declarar falha, dando tempo do TrustedInstaller finalizar
naturalmente.

**Validado parcialmente:** em uma execução real, a espera funcionou —
`TiWorker.exe` desapareceu da lista durante o retry e o step avançou para
`System integrity verification after installer termination` sem falso
positivo. Numa segunda tentativa, um **outro** processo `msiexec.exe` (não
relacionado ao SFC) reapareceu antes do fim da janela de espera — ver item 6.

### 6. Descoberta ambiental: processo `msiexec.exe` de Sessão 0 (SYSTEM) não pode ser encerrado por um token de Administrador

**Não é bug do script — é uma limitação real do Windows que o script já trata
corretamente.** Depois de várias instalações via MSI nesta máquina (Node.js,
OpenSSH, testes manuais), o Windows manteve um processo `msiexec.exe`
residente com `SessionId = 0` (a sessão isolada reservada para serviços,
nunca usada por processos interativos) e dono não resolvível via WMI — ou
seja, o processo host do serviço Windows Installer rodando como `SYSTEM`.

Confirmado que:

- `Stop-Process -Id <pid>` (mesmo com `-Force`, mesmo de um shell elevado
  como Administrador) **não consegue** encerrar esse processo, e
  frequentemente lança `System.NullReferenceException: Object reference not
  set to an instance of an object` em vez de um erro claro de acesso negado
  (um bug conhecido e antigo do PowerShell/.NET ao tentar `Stop-Process` em
  processos protegidos/de sistema sem `SeDebugPrivilege`).
- Isso é **exatamente** o cenário para o qual o script já foi projetado: ele
  tenta parar normalmente, força a parada, verifica de novo, e — se ainda
  assim não conseguir — instrui claramente o usuário a **reiniciar o PC** e
  rodar o SetupVibe de novo (`[ACTION] Restart the PC, then run SetupVibe
  again.`). Um reboot limpa esse processo de Sessão 0.

**Ação tomada:** nenhuma mudança de código além da correção do item 5. Tentar
encerrar processos de Sessão 0/SYSTEM a partir de um script de setup exigiria
manipular privilégios de token (`SeDebugPrivilege`) e representaria um
aumento de escopo/risco desproporcional para um instalador — a orientação
atual de "reinicie e tente de novo" é a resposta correta e segura.

**Nota para quem for validar de novo:** se `desktop.ps1` for executado várias
vezes seguidas em um curto intervalo (como nesta sessão de testes, ~10
execuções em 45 minutos), é esperado que esse processo `msiexec.exe` de
Sessão 0 fique "quente" e bloqueie novas tentativas até o processo expirar
sozinho (alguns minutos de inatividade de Windows Installer) ou até reiniciar
a máquina. Isso não indica regressão nas correções acima — elas foram
validadas isoladamente (ver seções 1-4) fora desse cenário de contenção.

## Resumo de mudanças em `desktop.ps1`

| Função | Mudança |
| --- | --- |
| `Get-ObjectPropertyValue` | Suporte a `IDictionary` (Hashtable) via indexador, além de `PSObject.Properties` |
| `$script:WinGetCommandChecks` (btop4win) | Adicionado `PreferredPaths` apontando para o caminho estável do pacote WinGet |
| Validação `WinGet: *` (loop de `Test-InstalledCommand`) | `$preferredPaths` normalizado para `@()` quando `$null`, em vez de `@($null)` |
| `Install-OpenSsh` (validação `ssh -V`) | `$ErrorActionPreference = 'Continue'` durante a captura de `2>&1`, restaurado no `finally` |
| `Invoke-MsiExec` (nova função) | `msiexec.exe` via `Start-Process -Wait -PassThru` em vez do operador `&` |
| `Install-NodeJs` | As 2 chamadas de `msiexec /i` (inicial + reconfigure) migradas para `Invoke-MsiExec` |
| `Resolve-ActiveWindowsInstallerOperations` | Loop de espera (até 30s) antes de declarar falha na checagem pós-terminação, evitando falso positivo com o próprio `TiWorker.exe` do SFC |
| `$script:ChocolateyPackages` / `$script:ChocolateyCommandChecks` | RustScan removido — único pacote bloqueado pelo Smart App Control nesta máquina |

## O que ficou validado com uma execução real completa

Após as correções, uma rodada completa e limpa (instância única, sem
concorrência) do `desktop.ps1` produziu apenas as seguintes falhas
remanescentes, **todas ambientais, não do script**:

- `Validate command: RustScan` — Smart App Control (ver item 4 acima).

Todos os outros ~35 steps (Windows servicing, OpenSSH, WSL, WinGet ×26,
Chocolatey ×3, Python, Node.js, Claude Code, Codex CLI, Antigravity CLI,
GitHub CLI, Windows Terminal, perfil do PowerShell) completaram com `[OK]`/`[DONE]`.

## Recomendações para investigações futuras

- Para testar helpers do script sem rodar a instalação completa: extraia
  apenas as definições de função (do início do arquivo até a linha do guard
  `if ($env:OS -ne 'Windows_NT') {`, que fica pouco antes do final do
  arquivo) para um `.ps1` temporário e faça dot-source. Isso evita
  re-executar SFC/DISM (~1-4 min) a cada iteração.
- Para reproduzir problemas de elevação/MSI isoladamente, use
  `Start-Process -FilePath cmd.exe -ArgumentList '/c pwsh -File "<script>" >
  "<log>" 2>&1' -Verb RunAs -Wait` — isso permite capturar a saída de um
  processo elevado em um arquivo de log, o que `Start-Process ... -Verb RunAs`
  sozinho não permite fazer diretamente (redirecionação de stdout/stderr não
  é suportada quando `-Verb` é usado).
- Os transcripts reais de cada execução ficam em
  `C:\ProgramData\SetupVibe\Logs\desktop-<timestamp>.log` — essa é a fonte de
  verdade, não a saída do processo lançador não-elevado.

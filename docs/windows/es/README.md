# Edición Windows de SetupVibe (Beta)

> Configuración de utilidades nativas de Windows — v0.41.11

La Edición Windows (Beta) configura utilidades nativas de Windows, Python, Node.js y CLIs de IA seleccionadas, con WinGet como fuente principal y Chocolatey para los paquetes que no están disponibles mediante WinGet.

## Requisitos

- Windows 11 versión 22H2 (build 22621) o posterior
- Una edición de escritorio de Windows x64 (AMD64); Windows de 32 bits, Windows en ARM, Windows 10 y Windows Server no son compatibles
- Windows PowerShell 5.1 o posterior
- Una cuenta que pertenezca al grupo local Administradores; la solicitud de UAC debe usar la misma cuenta que inició sesión
- Acceso a Internet

## Qué Instala

- Cliente y Servidor Microsoft Win32-OpenSSH oficiales más recientes mediante el MSI Win64 x64 firmado
- WinGet mediante el proceso oficial de reparación `Microsoft.WinGet.Client` cuando no está disponible
- Chocolatey mediante su script oficial de arranque cuando no está disponible
- Python 3.14 directamente mediante el instalador oficial de `python.org` y Node.js 24 LTS mediante el canal oficial `latest-v24.x` de `nodejs.org`, con `python`, `pip`, `node`, `npm` y `npx` en el `PATH` de la máquina para Claude y Codex
- Claude Code mediante el instalador nativo recomendado de Anthropic, con su paquete npm oficial como vía de recuperación, Codex CLI mediante el instalador independiente oficial de OpenAI para Windows y Google Antigravity CLI como `agy` mediante su instalador nativo oficial
- [CLI Skills de Vercel Labs](https://github.com/vercel-labs/skills) mediante su paquete npm oficial, con un lanzador `skills.cmd` compatible con directivas de ejecución restringidas
- Sistema base de WSL sin una distribución Linux, con WSL 2 como valor predeterminado
- Red reflejada de WSL con acceso por VPN/LAN, túnel DNS, integración con el proxy de Windows, entrada permitida en el firewall de Hyper-V, recuperación automática de memoria y discos virtuales dispersos
- Git, 7-Zip, Wget, FFmpeg, ImageMagick y GitHub CLI (`gh`)
- bat, eza, zoxide, fzf, ripgrep, fd, lazygit, Neovim, Glow, tldr, Fastfetch, duf y jq
- Nmap, Speedtest CLI, Tailscale, gping, btop4win y trippy
- PowerShell 7, Windows Terminal, FiraCode Nerd Font y JetBrains Mono Nerd Font

El instalador es idempotente: detecta y omite los paquetes WinGet instalados, Chocolatey garantiza la presencia de sus paquetes y los instaladores oficiales de Python y Node.js se vuelven a aplicar de forma segura. Los errores se registran por paquete para que las demás instalaciones puedan continuar. Se guarda un registro completo en `C:\ProgramData\SetupVibe\Logs`.

Los perfiles originales de Windows PowerShell y PowerShell 7, así como sus directivas de ejecución persistentes, se conservan. Starship y ZSH no se instalan; zoxide queda disponible únicamente como utilidad CLI, sin inicialización automática.

Python y Node.js son los únicos runtimes de programación instalados por este script. Claude Code, Codex CLI y Antigravity CLI son sus únicas CLIs de IA. No instala una distribución Linux, frameworks, administradores de runtimes, otras CLIs de IA ni otros ecosistemas de lenguajes. Después de instalar una distribución por separado, use `desktop.sh` dentro de ella para configurar un entorno de desarrollo completo.

Si `%USERPROFILE%\.wslconfig` ya existe, SetupVibe crea una copia de seguridad antes de aplicar los valores predeterminados de desarrollo. `-Uninstall` restaura la copia de seguridad y los estados anteriores de las características y el firewall de WSL.

Docker Desktop se excluye intencionalmente. SetupVibe prepara WSL 2, pero no instala Docker ni una distribución Linux.

**Advertencia sobre la red de WSL:** SetupVibe permite el tráfico entrante a WSL en todos los puertos mediante el firewall de Hyper-V para que los servicios futuros sean accesibles desde la red local y las VPN compatibles. Restrinja esta directiva con reglas específicas del firewall de Hyper-V en redes no confiables. Un servicio Linux futuro debe escuchar en `0.0.0.0` o en la interfaz de red adecuada para aceptar conexiones remotas.

## Instalación Con Un Comando

Este es el equivalente en Windows de `curl -sSL desktop.setupvibe.dev | bash`.

La URL canónica del instalador de Windows es `https://windows.setupvibe.dev`.

1. Abra el menú Inicio.
2. Busque **Windows PowerShell** y ábralo. Ejecutarlo como administrador es opcional, ya que el script solicita elevación mediante UAC automáticamente.
3. Revise el archivo [`desktop.ps1`](../../../desktop.ps1) del repositorio antes de ejecutar código remoto.
4. Pegue el siguiente comando y presione `Entrar`:

   ```powershell
   [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; irm https://windows.setupvibe.dev | iex
   ```

5. Acepte la solicitud de UAC de Windows.
6. Mantenga abiertas las ventanas de PowerShell hasta que aparezca el resumen.
7. Reinicie Windows cuando se solicite para aplicar cambios pendientes de componentes o paquetes.

El comando descarga `desktop.ps1` desde el repositorio oficial de SetupVibe y lo ejecuta en la sesión actual de PowerShell. Cuando se necesita elevación, el instalador descarga una copia temporal y continúa en una sesión de administrador.

## Instalación Local

Para descargar el script antes de ejecutarlo:

```powershell
$scriptPath = Join-Path $HOME 'Downloads\desktop.ps1'
Invoke-WebRequest -UseBasicParsing -Uri https://windows.setupvibe.dev -OutFile $scriptPath
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath
```

Desde un clon existente de este repositorio:

```powershell
Set-Location C:\ruta\a\setupvibe
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\desktop.ps1
```

## Qué Esperar

Durante la ejecución, el instalador:

1. Valida Windows 11 22H2 o posterior y la arquitectura x64, reiniciándose mediante Windows PowerShell x64 nativo si comenzó en un proceso de 32 bits, y rechaza la elevación UAC con credenciales de otro perfil de usuario.
2. Solicita privilegios de administrador mediante UAC.
3. Enumera los procesos de instalación concurrentes y pregunta si debe finalizarlos. Si se acepta, lo intenta normalmente, fuerza los que permanezcan y ejecuta `sfc.exe /scannow`; si se rechaza, espera ENTER y se cierra.
4. Rechaza reinicios pendientes, inicia los servicios necesarios, ejecuta `sfc.exe /scannow` si aún no se ejecutó, comprueba la directiva WSUS y valida el almacén de componentes de Windows.
5. Resuelve el MSI x64 oficial más reciente de Microsoft Win32-OpenSSH sin usar la API de releases de GitHub, valida su firma, instala y repara explícitamente Cliente y Servidor, configura el `PATH` de la máquina, valida el código de salida de `ssh.exe -V`, inicia `sshd` automáticamente y habilita la entrada TCP/22 guardando el estado anterior de la regla de firewall.
6. Copia los scripts auxiliares de Windows de SetupVibe a `%USERPROFILE%\.setupvibe\bin` y agrega ese directorio al `PATH` del usuario, normaliza y elimina entradas duplicadas y notifica a Windows del cambio de entorno.
7. Instala el sistema base de WSL sin una distribución Linux y establece WSL 2 como valor predeterminado.
8. Aplica a WSL red reflejada, acceso por VPN/LAN, DNS, proxy, firewall, recuperación de memoria y discos VHD dispersos.
9. Instala WinGet y Chocolatey cuando sea necesario.
10. Descarga Python 3.14 desde `python.org` y resuelve Node.js 24 LTS directamente mediante el canal oficial `latest-v24.x` de `nodejs.org`, sin la API del índice de releases, WinGet ni Chocolatey. Usa `curl.exe` de Windows con redirecciones solo HTTPS y reintentos, valida Authenticode y el SHA-256 oficial de Node.js, repara características ausentes de Python o del MSI de Node.js, elimina los shims redundantes `npm.ps1` y `npx.ps1` que fallan con una directiva de ejecución restringida, antepone los directorios x64 nativos de los runtimes al `PATH` de la máquina y valida `python`, `pip`, `node`, `npm` y `npx` exactamente como los invoca el usuario.
11. Instala cada utilidad restante de Windows de forma independiente, ejecuta cada CLI predecible de WinGet y Chocolatey desde el `PATH` actualizado, valida `gh.exe` y el alias `wt.exe` de Windows Terminal y continúa después de errores aislados de paquetes o comandos.
12. Instala y valida Skills CLI, Claude Code, Codex CLI y Antigravity CLI desde sus fuentes oficiales, preservando todos los archivos de perfil PowerShell del usuario. Skills usa su paquete npm oficial y un lanzador CMD compatible con directivas de ejecución restringidas; Claude usa el instalador nativo recomendado independientemente de npm y recurre al paquete npm oficial de Anthropic solo cuando es necesario; Codex usa el instalador independiente oficial de OpenAI en lugar de npm.
13. Elimina únicamente bloques heredados reconocidos de SetupVibe para Starship y zoxide sin recodificar contenido no relacionado, y conserva los bytes originales de los perfiles PowerShell, la configuración Starship del usuario y la directiva de ejecución.
14. Muestra un resumen final y la ubicación del registro completo.

El proceso puede tardar porque los administradores de paquetes descargan e instalan cada utilidad por separado.

## Después De La Instalación

1. Reinicie Windows cuando se solicite para completar cambios pendientes de componentes o paquetes.
2. Abra Windows Terminal o PowerShell 7 para cargar el nuevo `PATH`.
3. Complete las autenticaciones iniciales requeridas por GitHub CLI, Tailscale, Claude Code, Codex CLI o Antigravity CLI.

Los scripts auxiliares de SetupVibe se almacenan en `%USERPROFILE%\.setupvibe\bin`. El núcleo instalado `ssh_copy_id_core.ps1` y su lanzador mínimo `ssh_copy_id.cmd` pueden iniciarse sin ambigüedad como `ssh_copy_id`. Codex usa su `codex.exe` nativo; no necesita un script PowerShell ni un lanzador de SetupVibe. Ambos comandos funcionan desde una nueva sesión de PowerShell, Windows Terminal o Símbolo del sistema.

Verifique los componentes principales en una terminal nueva:

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

`wsl --list --verbose` debe indicar que no hay distribuciones instaladas, salvo que el equipo ya tuviera alguna. La salida del firewall debe mostrar `DefaultInboundAction` como `Allow`.

## Nueva Ejecución Y Registros

El instalador está diseñado para ejecutarse nuevamente. Los scripts auxiliares de SetupVibe se actualizan, los paquetes WinGet existentes se omiten y Chocolatey garantiza la presencia de sus utilidades administradas.

Los registros completos de la transcripción y los registros dedicados de DISM se almacenan en:

```text
C:\ProgramData\SetupVibe\Logs
```

Si un paquete falla, revise el resumen final y el registro, resuelva el problema informado y ejecute nuevamente el mismo comando.

## Seguridad De Windows Servicing

Antes de instalar o eliminar componentes, SetupVibe comprueba los procesos activos de `DISM`, `dismhost`, `TiWorker`, Windows Installer, instaladores de Windows Update, WinGet, Chocolatey y otros procesos de instalación conocidos. Enumera sus nombres y PID y solicita permiso antes de finalizarlos. Cuando se acepta, primero utiliza `Stop-Process`, fuerza los procesos que permanezcan y después ejecuta `sfc.exe /scannow`. Cuando se rechaza, espera ENTER y se cierra sin iniciar otra operación de mantenimiento. Después rechaza reinicios pendientes de Component Based Servicing o Windows Update, inicia los servicios necesarios y ejecuta `DISM /Online /Cleanup-Image /CheckHealth`.

Los detalles del Comprobador de archivos de sistema se registran en `C:\Windows\Logs\CBS\CBS.log`.

Si un proceso permanece activo después de los intentos de finalización normal y forzada, SetupVibe completa la comprobación de SFC, espera ENTER y se cierra recomendando reiniciar el PC.

OpenSSH no utiliza Características bajo demanda de Windows ni la API de releases de GitHub. SetupVibe resuelve la página oficial `releases/latest` y sus assets expandidos, acepta únicamente el MSI x64 `OpenSSH-Win64-*.msi`, valida su firma Authenticode e instala y repara explícitamente las características Cliente y Servidor en una única transacción MSI con `ADDLOCAL=Client,Server`, `REINSTALL=ALL` y `REINSTALLMODE=amus`. Resuelve el directorio de instalación mediante el directorio Program Files x64 nativo, los metadatos del MSI y el servicio `sshd`, antepone ese directorio al `PATH` de la máquina, configura `sshd` para el inicio automático, inicia el servicio, habilita la regla de firewall `OpenSSH-Server-In-TCP` para la entrada TCP/22, guarda el estado anterior de la regla para la desinstalación y registra `openssh-msi-*.log` en `C:\ProgramData\SetupVibe\Logs`.

## Opciones

Reinicie Windows automáticamente después de una instalación completamente exitosa cuando el sistema indique que se necesita un reinicio:

```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; & ([scriptblock]::Create((irm https://windows.setupvibe.dev))) -Restart
```

Sin `-Restart`, el instalador nunca reinicia Windows automáticamente.

### Desinstalación

Elimine todas las utilidades y configuraciones administradas por la Edición Windows desde un clon local:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\desktop.ps1 -Uninstall
```

O ejecute el desinstalador desde la URL canónica de SetupVibe para Windows:

```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; & ([scriptblock]::Create((irm https://windows.setupvibe.dev))) -Uninstall
```

El modo de desinstalación elimina el Cliente y el Servidor OpenSSH, Python y Node.js mediante sus desinstaladores oficiales, Skills CLI, Claude Code, Codex CLI, Antigravity CLI, los archivos administrados por SetupVibe de `%USERPROFILE%\.setupvibe\bin` y sus entradas del `PATH` del usuario, restaura los estados anteriores de las características opcionales de WSL, el firewall de WSL y la regla de firewall de OpenSSH, elimina la configuración de WSL aplicada por SetupVibe, elimina todas las utilidades WinGet y Chocolatey administradas por SetupVibe y elimina las entradas de paquetes y runtimes agregadas por SetupVibe al `PATH` de la máquina y los bloques heredados reconocidos de SetupVibe para Starship y zoxide. Se conservan las skills de agentes instaladas. También elimina herramientas de frameworks, rutas ausentes de administradores de runtimes y paquetes npm heredados instalados por versiones Beta anteriores de Windows. Se conservan los directorios activos administrados por el usuario en el `PATH`, la configuración Starship, las distribuciones Linux, las configuraciones y credenciales de usuario de las CLIs de IA, WinGet, Chocolatey, los registros y los archivos no relacionados dentro de `%USERPROFILE%\.setupvibe`.

**Advertencia de desinstalación:** la versión Beta actual no registra si el Cliente y el Servidor OpenSSH o un paquete administrado ya existían antes de SetupVibe. Por lo tanto, `-Uninstall` elimina el producto MSI de OpenSSH y todos los paquetes de sus listas administradas, incluidos los componentes que puedan haber sido instalados por separado antes de SetupVibe.

Combine `-Uninstall` con `-Restart` para reiniciar automáticamente cuando Windows indique que se requiere un reinicio.

## Alcance Y Limitaciones

- Windows 10, Windows Server, las compilaciones de Windows 11 anteriores a 22621, Windows de 32 bits y Windows en ARM se rechazan; solo x64 es compatible.
- WSL se instala y configura para WSL 2, red reflejada por VPN/LAN y optimizaciones comunes de desarrollo, pero no se instala ninguna distribución Linux.
- Starship y ZSH no se instalan, los perfiles de PowerShell no se personalizan y no se realizan cambios persistentes en la directiva de ejecución; zoxide permanece disponible solo como utilidad CLI.
- Python 3.14 y Node.js 24 LTS se instalan para automatización local; Claude Code, Codex CLI y Antigravity CLI son las únicas CLIs de IA instaladas. Se excluyen otros lenguajes de programación, frameworks, administradores de runtimes y CLIs de IA.
- Docker Desktop y un motor Docker local no se instalan.

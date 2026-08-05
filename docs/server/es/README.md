# SetupVibe — Edición Servidor

> Configuración de servidor Linux — v0.41.11

Un script de configuración ligero y enfocado para servidores Linux. Sin Homebrew, sin ecosistemas de lenguajes, sin herramientas de escritorio. Instala solo lo que un servidor de producción necesita: Docker, Ansible, redes, shell, tmux y herramientas AI CLI.

## Requisitos del Sistema

|                   | Soportado                       |
| ----------------- | ------------------------------- |
| **Ubuntu**        | 24.04+                          |
| **Debian**        | 12+                             |
| **Zorin OS**      | 18+                             |
| **Arquitecturas** | x86_64 (amd64), ARM64 (aarch64) |

> Solo Linux. El script finaliza inmediatamente si se ejecuta en macOS.

## Instalación

```bash
curl -sSL server.setupvibe.dev | bash
```

O localmente:

```bash
bash server.sh
```

Para inicializar Docker Swarm automáticamente tras el setup, pasa `--manager`:

```bash
curl -sSL server.setupvibe.dev | bash -s -- --manager
```

```bash
bash server.sh --manager
```

Para una instalación sin interacción, añade `--yes`. Para seleccionar explícitamente la dirección o interfaz de Swarm, usa `--advertise-addr DIRECCION`; esta opción implica `--manager`.

El script valida el sistema operativo, la versión, la arquitectura, el usuario de destino y los argumentos antes de modificar el sistema. Después muestra una hoja de ruta interactiva, solicita confirmación, espera hasta cinco minutos a que se liberen los bloqueos de APT y reintenta los comandos APT que fallen. Los pasos se detienen en el primer error, el resumen identifica los que no se ejecutaron y el script devuelve un estado distinto de cero. Si no se pasó `--manager`, las instalaciones interactivas preguntan al final si se debe configurar Docker Swarm.

---

## Qué se instala

**9 pasos totalmente automatizados (Pasos 0–8), más un Paso 9 opcional para la configuración del Docker Swarm Manager.**

### Paso 0 — Requisitos Previos y Verificación de Arquitectura

Informa del sistema operativo validado, la base de repositorios de la distribución, la arquitectura de la CPU, el usuario de destino y su directorio personal antes de iniciar la instalación.

### Paso 1 — Herramientas del sistema base

Instala mediante APT:

- Utilidades principales: `curl`, `file`, `figlet`, `fontconfig`, `fzf`, `git`, `gnupg`, `iproute2`, `jq`, `nano`, `procps`, `psmisc`, `sshpass`, `tmux`, `unzip`, `wget`
- Servicios del sistema: `cron`, `logrotate`, `rsyslog`
- **zoxide** mediante su instalador oficial
- Habilita `cron` sin crear tareas y elimina únicamente las tareas de demostración antiguas añadidas por SetupVibe v0.41.4-v0.41.6

### Paso 2 — Docker, Ansible y GitHub CLI

**Docker** — instalado desde el repositorio APT oficial de Docker:

- `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-compose-plugin`, `docker-buildx-plugin`
- El usuario se añade al grupo `docker`

**Ansible:**

- Ubuntu → vía PPA `ansible/ansible`
- Debian → `ansible-core` desde APT

**GitHub CLI (`gh`)** — vía el repositorio APT oficial de GitHub

**Portainer CE** — usa el canal de imagen `lts` y expone HTTPS en el puerto `9443`; no abre el puerto HTTP heredado `9000` ni el puerto opcional `8000` para Edge Agent

### Paso 3 — Red, Monitoreo y Tailscale

Paquetes APT:
`rsync`, `net-tools`, `dnsutils`, `mtr-tiny`, `nmap`, `tcpdump`, `iftop`, `nload`, `iotop`, `sysstat`, `whois`, `iputils-ping`, `speedtest-cli`, `glances`, `htop`, `btop`

- **ctop** — binario descargado en `~/.local/bin/ctop` (v0.7.7, detecta la arquitectura, SHA-256 verificado)
- **Tailscale** — vía script oficial de instalación (`https://tailscale.com/install.sh`)

### Paso 4 — Servidor SSH

- Instala `openssh-server` y `openssh-client`
- Habilita e inicia el servicio systemd `ssh`
- Valida la configuración efectiva con `sshd -t`
- Conserva la política de autenticación existente; no habilita el inicio de sesión de root ni la autenticación por contraseña

### Paso 5 — Shell (ZSH y Starship)

- Instala ZSH vía APT
- Instala Oh My Zsh (sin intervención)
- Clona `zsh-autosuggestions` y `zsh-syntax-highlighting`
- Instala el prompt Starship en `~/.local/bin` y aplica el preset **Gruvbox Rainbow**
- Descarga scripts auxiliares desde [`bin/`](../../../bin) a `~/.setupvibe/bin`; consulta [Ejecutables](../../es/EXECUTABLES.md)
- Descarga [`conf/zshrc-server.zsh`](../../../conf/zshrc-server.zsh) a `~/.zshrc`
- Conserva una vez los archivos `.zshrc`, `.bashrc` y `.tmux.conf` existentes con el sufijo `.pre-setupvibe` antes de sustituirlos o añadir contenido
- Establece ZSH como shell por defecto mediante `chsh`

#### Aliases del Shell

| Alias          | Comando                                                        |
| -------------- | -------------------------------------------------------------- |
| `reload`       | `source ~/.zshrc`                                              |
| `zconfig`      | `nano ~/.zshrc`                                                |
| `ssh_copy_id`   | `ssh_copy_id --host HOST --user USUARIO [--pass PASS]`          |
| `update`       | `sudo apt update && sudo apt upgrade`                          |
| `cc`           | `claude --permission-mode=auto --dangerously-skip-permissions` |
| `skl`          | `skills list`                                                  |
| `skf`          | `skills find`                                                  |
| `ska`          | `skills add`                                                   |
| `sku`          | `skills update`                                                |
| `skun`         | `skills remove`                                                |
| `d`            | `docker`                                                       |
| `dc`           | `docker compose`                                               |
| `syslog`       | `sudo journalctl -f`                                           |
| `ports`        | `ss -tulnp`                                                    |
| `meminfo`      | `free -h`                                                      |
| `diskinfo`     | `df -h`                                                        |
| `cpuinfo`      | `lscpu`                                                        |
| `wholistening` | `ss -tulnp`                                                    |

#### Plugins Oh My Zsh

`git rsync nmap cp extract zoxide fzf zsh-autosuggestions zsh-syntax-highlighting tmux gh ansible docker docker-compose`

### Paso 6 — Tmux y Plugins

- Clona [TPM](https://github.com/tmux-plugins/tpm) en `~/.tmux/plugins/tpm`
- Descarga [`conf/tmux-server.conf`](../../../conf/tmux-server.conf) a `~/.tmux.conf`
- Si se ejecuta como root con un `REAL_HOME` que no es root, también instala en `/root/.tmux.conf`
- Conserva las sesiones tmux en ejecución; la nueva configuración se aplica a las sesiones nuevas

Presiona `prefix + I` dentro de tmux para instalar todos los plugins. Consulta la [Guía de Tmux](../../desktop/es/tmux.md) para la referencia completa de plugins y atajos.

### Paso 7 — Herramientas de IA CLI

Instala **Node.js 24** desde el repositorio APT de NodeSource, instala los paquetes npm globalmente y obtiene Herdr desde su manifiesto oficial de releases:

| Herramienta        | Instalación                      |
| ------------------ | -------------------------------- |
| Claude Code        | `@anthropic-ai/claude-code`      |
| OpenAI Codex       | `@openai/codex`                  |
| GitHub Copilot CLI | `@github/copilot`                |
| OpenCode CLI       | `opencode-ai`                    |
| Skills CLI         | `skills`                         |
| Herdr              | Binario del manifiesto oficial   |

La [CLI Skills de Vercel Labs](https://github.com/vercel-labs/skills), [Herdr](https://github.com/herdrdev/herdr) y cada comando de CLI de IA se validan después de la instalación. Herdr se instala en `~/.local/bin` según la arquitectura detectada; consulta la [guía de Herdr](../../es/HERDR.md) para conocer las sesiones, los atajos, las actualizaciones y el diagnóstico. Se elimina el paquete obsoleto `@githubnext/github-copilot-cli`. Los paquetes globales de npm se instalan en `~/.npm-global` siempre que el usuario de destino no sea root, incluso cuando el instalador se ejecute mediante `sudo`.

### Paso 8 — Finalización y Limpieza

- Ejecuta `autoclean` y `clean` de APT
- Elimina las listas de paquetes descargadas por APT
- Conserva los paquetes instalados, los registros del sistema y las cachés del usuario

### Paso 9 — Docker Swarm Manager (opcional)

Se activa pasando `--manager` o respondiendo **sí** al prompt interactivo que se muestra al final del setup.

1. **Detecta la dirección IPv4 enrutable principal** en la tabla de rutas local, sin consultar servicios IP externos. Usa `--advertise-addr DIRECCION` para indicar una dirección o interfaz concreta.
2. **Inicializa Docker Swarm** con `docker swarm init --advertise-addr <DIRECCION>`. Idempotente — omite la inicialización si la máquina ya es manager y falla claramente si ya es worker.
3. **Crea la red overlay** `network_swarm_public` con `--driver overlay --attachable`. Idempotente — omite si la red ya existe.
4. **Muestra los tokens de unión** para los roles worker y manager, permitiendo agregar nuevos nodos de inmediato.

## Contribución

¡Todas as contribuições de todos os tamanhos são bem-vindas! Por favor, leia nosso [Guia de Contribuição](../../../CONTRIBUTING.md) para começar.

---

## Licencia

Bajo la licencia **GNU General Public License v3.0** — ver [LICENSE](../../../LICENSE) para detalles.

Mantenido por [promovaweb.com](https://promovaweb.com) · <contato@promovaweb.com>

---

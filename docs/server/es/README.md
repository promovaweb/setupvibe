# SetupVibe — Edición Servidor

> Configuración de servidor Linux — v0.41.5

Un script de configuración ligero y enfocado para servidores Linux. Sin Homebrew, sin ecosistemas de lenguajes, sin herramientas de escritorio. Instala solo lo que un servidor de producción necesita: Docker, Ansible, redes, shell, tmux y herramientas AI CLI.

## Requisitos del Sistema

|                   | Soportado                       |
| ----------------- | ------------------------------- |
| **Ubuntu**         | 24.04+                          |
| **Debian**         | 12+                             |
| **Zorin OS**       | 18+                             |
| **Linux Mint**     | 21+                             |
| **Arquitecturas**  | x86_64 (amd64), ARM64 (aarch64) |

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

El script espera a que se libere cualquier bloqueo de APT (útil en máquinas virtuales recién creadas donde `unattended-upgrades` se ejecuta al arrancar), muestra una hoja de ruta interactiva y luego solicita confirmación. También propone configurar la identidad de Git si aún no está definida. Al final de la instalación, si no se pasó `--manager`, el script preguntará interactivamente si se desea configurar la máquina como Manager de Docker Swarm.

---

## Qué se instala

**9 pasos totalmente automatizados, más un Paso 9 opcional para la configuración del Docker Swarm Manager.**

### Paso 1 — Sistema base y herramientas de compilación

Instala mediante APT:

- `build-essential`, `git`, `wget`, `unzip`, `curl`, `tmux`, `fontconfig`, `sshpass`
- Librerías SSL/compresión: `libssl-dev`, `zlib1g-dev`, `libbz2-dev`, `libreadline-dev`, `libsqlite3-dev`, `libncurses5-dev`, `xz-utils`, `libffi-dev`, `liblzma-dev`, `libyaml-dev`
- Python: `python3`, `python3-pip`, `python3-venv`, `python-is-python3`
- Demonios del sistema: `cron`, `logrotate`, `rsyslog`
- Administrador de paquetes Python [uv](https://github.com/astral-sh/uv) (instalado en `~/.local/bin`)

### Paso 2 — Docker, Ansible y GitHub CLI

**Docker** — instalado desde el repositorio APT oficial de Docker:

- `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-compose-plugin`, `docker-buildx-plugin`
- El usuario se añade al grupo `docker`

**Ansible:**

- Ubuntu → vía PPA `ansible/ansible`
- Debian → `ansible-core` desde APT

**GitHub CLI (`gh`)** — vía el repositorio APT oficial de GitHub

### Paso 3 — Red, Monitoreo y Tailscale

Paquetes APT:
`rsync`, `net-tools`, `dnsutils`, `mtr-tiny`, `nmap`, `tcpdump`, `iftop`, `nload`, `iotop`, `sysstat`, `whois`, `iputils-ping`, `speedtest-cli`, `glances`, `htop`, `btop`

- **ctop** — binario descargado en `~/.local/bin/ctop` (v0.7.7, detecta la arquitectura)
- **Tailscale** — vía script oficial de instalación (`https://tailscale.com/install.sh`)

### Paso 4 — Servidor SSH

- Instala `openssh-server` y `openssh-client`
- Habilita e inicia el servicio systemd `ssh`
- Realiza copia de seguridad del `/etc/ssh/sshd_config` original
- Configura `PermitRootLogin yes` y `PasswordAuthentication yes`
- Valida la configuración con `sshd -t` antes de reiniciar; restaura la copia de seguridad si falla

### Paso 5 — Shell (ZSH y Starship)

- Instala ZSH vía APT
- Instala Oh My Zsh (sin intervención)
- Clona `zsh-autosuggestions` y `zsh-syntax-highlighting`
- Instala el prompt Starship en `~/.local/bin` y aplica el preset **Gruvbox Rainbow**
- Descarga [`conf/zshrc-server.zsh`](../../../conf/zshrc-server.zsh) a `~/.zshrc`
- Establece ZSH como shell por defecto mediante `chsh`

#### Aliases del Shell

| Alias          | Comando                               |
| -------------- | ------------------------------------- |
| `reload`       | `source ~/.zshrc`                     |
| `zconfig`      | `nano ~/.zshrc`                       |
| `update`       | `sudo apt update && sudo apt upgrade` |
| `ge`           | `gemini --approval-mode=yolo`                                  |
| `cc`           | `claude --permission-mode=auto --dangerously-skip-permissions` |
| `skl`          | `npx skills list`                                              |
| `skf`          | `npx skills find`                                              |
| `ska`          | `npx skills add`                                               |
| `sku`          | `npx skills update`                                            |
| `d`            | `docker`                                                       |

| `dc`           | `docker compose`                      |
| `syslog`       | `sudo journalctl -f`                  |
| `ports`        | `ss -tulnp`                           |
| `meminfo`      | `free -h`                             |
| `diskinfo`     | `df -h`                               |
| `cpuinfo`      | `lscpu`                               |
| `wholistening` | `ss -tulnp`                           |

#### Plugins Oh My Zsh

`git rsync nmap cp extract zoxide fzf zsh-autosuggestions zsh-syntax-highlighting tmux brew gh ansible docker docker-compose`

### Paso 6 — Tmux y Plugins

- Clona [TPM](https://github.com/tmux-plugins/tpm) en `~/.tmux/plugins/tpm`
- Descarga [`conf/tmux-server.conf`](../../../conf/tmux-server.conf) a `~/.tmux.conf`
- Si se ejecuta como root con un `REAL_HOME` que no es root, también instala en `/root/.tmux.conf`
- Finaliza cualquier sesión de tmux en ejecución para aplicar la nueva configuración

Presiona `prefix + I` dentro de tmux para instalar todos los plugins. Consulta la [Guía de Tmux](../../desktop/es/tmux.md) para la referencia completa de plugins y atajos.

### Paso 7 — Herramientas de IA CLI

Instala **Node.js 24** a través del repositorio APT de NodeSource, luego instala globalmente mediante `npm install -g`:

| Herramienta        | Paquete                          |
| ------------------ | -------------------------------- |
| Claude Code        | `@anthropic-ai/claude-code`      |
| Gemini CLI         | `@google/gemini-cli`             |
| GSD 2              | `@gsd-build/cli`                 |
| OpenAI Codex       | `@openai/codex`                  |
| GitHub Copilot CLI | `@githubnext/github-copilot-cli` |

Los paquetes globales de npm se instalan en `~/.npm-global` (configurado con `npm config set prefix`) cuando no se ejecuta como root.

### Paso 8 — Finalización y Limpieza

- APT: `autoremove`, `autoclean`, `clean`, elimina `/var/lib/apt/lists/*`
- Elimina archivos temporales: `/tmp/ctop`, `/tmp/starship`
- Limpia los registros del journal de más de 7 días
- Limpia las cachés de usuario: `~/.cache/pip`, `~/.npm/_npx`, `~/.bundle/cache`, `~/.cache/composer`

### Paso 9 — Docker Swarm Manager (opcional)

Se activa pasando `--manager` o respondiendo **sí** al prompt interactivo que se muestra al final del setup.

1. **Detecta la IP pública** del servidor consultando servicios externos (`api.ipify.org`, `ifconfig.me`, `icanhazip.com`, `checkip.amazonaws.com`, `ipecho.net/plain`) en secuencia hasta obtener un IPv4 válido.
2. **Inicializa Docker Swarm** con `docker swarm init --advertise-addr <IP_PUBLICA>`. Idempotente — omite si Swarm ya está activo.
3. **Crea la red overlay** `network_swarm_public` con `--driver overlay --attachable`. Idempotente — omite si la red ya existe.
4. **Muestra los tokens de unión** para los roles worker y manager, permitiendo agregar nuevos nodos de inmediato.

---

## Licencia

Bajo la licencia **GNU General Public License v3.0** — ver [LICENSE](../../LICENSE) para detalles.

Mantenido por [promovaweb.com](https://promovaweb.com) · <contato@promovaweb.com>

---
> Follow the formatting guide: [Markdown Format Guide](.claude/commands/markdown-format.md)

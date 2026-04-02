# SetupVibe — Edición Escritorio

> Configuración de entorno de desarrollo multiplataforma — v0.41.5

Instala y configura un stack de desarrollo completo en un solo comando. Soporta macOS y las principales distribuciones de Linux.

## Requisitos del Sistema

|                   | Soportado                       |
| ----------------- | ------------------------------- |
| **macOS**          | 12 Monterey y más reciente      |
| **Ubuntu**         | 24.04+                          |
| **Debian**         | 12+                             |
| **Zorin OS**       | 18+                             |
| **Linux Mint**     | 21+                             |
| **Arquitecturas**  | x86_64 (amd64), ARM64 (aarch64) |

> **No** ejecutar con `sudo` en macOS — Homebrew rechazará la instalación como root. Ejecuta normalmente y el script solicitará tu contraseña cuando sea necesario.

## Instalación

```bash
curl -sSL desktop.setupvibe.dev | bash
```

O localmente:

```bash
bash desktop.sh
```

El script muestra una hoja de ruta interactiva y solicita confirmación antes de comenzar. También propone configurar la identidad de Git si aún no está definida.

---

## Qué se instala

**14 pasos, totalmente automatizados.**

### Paso 1 — Sistema Base y Herramientas de Construcción

**Linux:** se instala mediante APT — `build-essential`, `git`, `wget`, `unzip`, `curl`, `tmux`, `ffmpeg`, `imagemagick`, bibliotecas SSL/compresión y el repositorio APT de Charmbracelet (para `glow`).

**macOS:** depende de Xcode Command Line Tools (verifica y sale si no están presentes). Las herramientas base se instalan mediante Homebrew en el siguiente paso.

### Paso 2 — Homebrew

- **macOS:** instala Homebrew si no está presente, luego instala herramientas base (`wget`, `curl`, `tmux`, `ffmpeg`, `imagemagick`, `openssl`, `readline`, etc.)
- **Linux:** instala Linuxbrew bajo `/home/linuxbrew/.linuxbrew`; agrega entradas PATH a `~/.bashrc`, `~/.profile`, `~/.zshrc`; ejecuta `brew upgrade` si ya está presente

### Paso 3 — Ecosistema PHP 8.4

| Componente         | macOS                                       | Linux                                                                                               |
| ------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| PHP 8.4            | vía Homebrew                                | vía PPA ondrej/php (Ubuntu) o sury.org (Debian)                                                    |
| Extensiones        | redis, xdebug, imagick vía PECL             | php8.4-{curl,mbstring,xml,zip,bcmath,intl,mysql,pgsql,sqlite3,gd,imagick,redis,mongodb,yaml,xdebug} |
| Composer          | vía Homebrew                                | binario en `~/.local/bin/composer`                                                                 |
| Instalador Laravel | `composer global require laravel/installer` | igual                                                                                               |

### Paso 4 — Ecosistema Ruby

| Componente      | macOS                       | Linux                                   |
| --------------- | --------------------------- | --------------------------------------- |
| rbenv           | vía Homebrew                | clonado de GitHub en `~/.rbenv`         |
| ruby-build      | vía Homebrew                | clonado en `~/.rbenv/plugins/ruby-build` |
| Ruby            | 3.3.0 compilado vía rbenv   | igual                                   |
| Bundler + Rails | `gem install bundler rails` | igual                                   |

### Paso 5 — Lenguajes

| Lenguaje | macOS                      | Linux                                              |
| -------- | -------------------------- | -------------------------------------------------- |
| Python 3 | `python@3.12` vía Homebrew | vía APT (`python3`, `python3-pip`, `python3-venv`) |
| uv       | vía script de instalación  | igual                                              |
| Go       | vía Homebrew               | binario 1.22.2 en `~/.local/go`                    |
| Rust     | vía rustup                 | igual                                              |

### Paso 6 — JavaScript

| Herramienta | macOS                     | Linux                   |
| ----------- | ------------------------- | ----------------------- |
| Node.js 24  | `node@24` vía Homebrew    | vía repositorio APT NodeSource |
| PNPM        | `npm install -g pnpm`     | igual                   |
| PM2         | `npm install -g pm2`      | igual                   |
| n8n         | `npm install -g @n8n/cli` | igual                   |
| Bun         | vía script de instalación | igual                   |

### Paso 7 — DevOps

| Herramienta       | macOS                            | Linux                                                                        |
| ----------------- | -------------------------------- | ---------------------------------------------------------------------------- |
| Docker            | Docker Desktop vía Homebrew Cask | docker-ce + docker-compose-plugin + docker-buildx-plugin vía repositorio APT de Docker |
| Ansible           | vía Homebrew                     | vía PPA ansible/ansible (Ubuntu) o ansible-core (Debian)                    |
| GitHub CLI (`gh`) | vía Homebrew                     | vía repositorio APT de GitHub                                                |

### Paso 8 — Herramientas Unix Modernas

Instaladas mediante Homebrew en ambas plataformas.

| Herramienta  | Descripción                              |
| ------------ | ---------------------------------------- |
| `bat`        | `cat` con resaltado de sintaxis          |
| `eza`        | Reemplazo moderno de `ls`                |
| `zoxide`     | `cd` más inteligente                     |
| `fzf`        | Buscador fuzzy (con atajos de shell)     |
| `ripgrep`    | Reemplazo rápido de `grep`               |
| `fd`         | Reemplazo rápido de `find`               |
| `lazygit`    | Interfaz de terminal para git            |
| `lazydocker` | Interfaz de terminal para Docker         |
| `neovim`     | Vim moderno                              |
| `glow`       | Renderizador de Markdown                 |
| `jq`         | Procesador JSON                          |
| `tldr`       | Páginas de manual simplificadas          |
| `fastfetch`  | Herramienta de información del sistema   |
| `duf`        | `df` moderno                             |
| `mise`       | Administrador de versiones de runtime    |

### Paso 9 — Red, Monitoreo y Tailscale

**macOS:** `wget`, `nmap`, `mtr`, `htop`, `btop`, `glances`, `speedtest-cli` vía Homebrew; `bandwhich`, `gping`, `trippy`, `rustscan` vía Cargo; `ctop` vía Homebrew; Tailscale vía Cask.

**Linux:** mismas herramientas vía APT + Cargo + binario ctop en `~/.local/bin`; Tailscale vía script oficial de instalación.

### Paso 10 — Servidor SSH *(Solo Linux)*

- Instala `openssh-server`
- Habilita e inicia el servicio systemd `ssh`
- Configura `PermitRootLogin yes` y `PasswordAuthentication yes`
- Realiza copia de seguridad del `sshd_config` original antes de modificar

### Paso 11 — Shell (ZSH y Starship)

- Instala ZSH (Linux vía APT; ya por defecto en macOS)
- Instala Oh My Zsh (sin intervención)
- Clona los plugins `zsh-autosuggestions` y `zsh-syntax-highlighting`
- Instala Nerd Fonts: **FiraCode** y **JetBrains Mono** (Homebrew Cask en macOS; descarga a `~/.local/share/fonts` en Linux)
- Instala el prompt Starship y aplica el preset **Gruvbox Rainbow**
- Descarga el `.zshrc` adecuado:
  - macOS → [`conf/zshrc-macos.zsh`](../../../conf/zshrc-macos.zsh)
  - Linux → [`conf/zshrc-linux.zsh`](../../../conf/zshrc-linux.zsh)

### Paso 12 — Tmux y Plugins

- Clona [TPM](https://github.com/tmux-plugins/tpm) en `~/.tmux/plugins/tpm`
- Descarga [`conf/tmux-desktop.conf`](../../../conf/tmux-desktop.conf) a `~/.tmux.conf`
- Finaliza cualquier sesión de tmux en ejecución para aplicar la nueva configuración

Presiona `prefix + I` dentro de tmux para instalar todos los plugins. Consulta [tmux.md](tmux.md) para la referencia completa de plugins y atajos.

### Paso 13 — Herramientas IA CLI

Instaladas globalmente vía `npm install -g`:

| Herramienta        | Paquete                          |
| ------------------ | -------------------------------- |
| Agentlytics        | `agentlytics`                    |
| Claude Code        | `@anthropic-ai/claude-code`      |
| Gemini CLI         | `@google/gemini-cli`             |
| GSD 2              | `@gsd-build/cli`                 |
| OpenAI Codex       | `@openai/codex`                  |
| GitHub Copilot CLI | `@githubnext/github-copilot-cli` |

### Paso 14 — Finalización y Limpieza

**macOS:** `brew cleanup --prune=all`, `brew autoremove`, limpia `~/Library/Caches` y `~/.Trash`.

**Linux:** `apt autoremove`, `apt clean`, elimina archivos temporales y limpia logs del journal; limpia `~/.cache/pip`, `~/.cache/composer`, `~/.npm/_npx`, `~/.bundle/cache`.

**Ambos:** configura el inicio automático de PM2 (launchd en macOS, systemd en Linux), ejecuta `pm2 save`, establece `pm2:autodump true`, descarga `ecosystem.config.js` a `~/ecosystem.config.js`.

Consulta [pm2.md](pm2.md) para la referencia completa de PM2.

---

## Configuración del Shell

Cada plataforma recibe un `.zshrc` dedicado:

| Archivo                                               | Plataforma | Rutas clave                                  |
| ----------------------------------------------------- | ---------- | -------------------------------------------- |
| [`zshrc-macos.zsh`](../../../conf/zshrc-macos.zsh)    | macOS      | Homebrew, Cargo, Composer, Go, Bun           |
| [`zshrc-linux.zsh`](../../../conf/zshrc-linux.zsh)    | Linux      | Linuxbrew, npm-global, Cargo, Go, Bun, rbenv |

### Aliases

| Alias      | Comando                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------- |
| `reload`   | `source ~/.zshrc`                                                                         |
| `zconfig`  | `nano ~/.zshrc`                                                                           |
| `update`   | `brew update && brew upgrade` (macOS) / `sudo apt update && sudo apt upgrade` (Linux)      |
| `brewup`   | `brew update && brew upgrade && brew cleanup`                                             |
| `ge`       | `gemini --approval-mode=yolo`                                                         |
| `cc`       | `claude --permission-mode=auto --dangerously-skip-permissions`                        |
| `gsdn`     | `gsd new`                                                                             |
| `gsds`     | `gsd status`                                                                          |
| `gsdm`     | `gsd map`                                                                             |
| `skl`      | `npx skills list`                                                                     |
| `skf`      | `npx skills find`                                                                     |
| `ska`      | `npx skills add`                                                                      |
| `sku`      | `npx skills update`                                                                   |
| `d`        | `docker`                                                                              |

| `dc`       | `docker compose`                                                                          |
| `art`      | `php artisan`                                                                             |
| `syslog`   | `sudo journalctl -f` *(Solo Linux)*                                                       |
| `ports`    | `ss -tulnp` *(Solo Linux)*                                                                |
| `meminfo`  | `free -h` *(Solo Linux)*                                                                  |
| `diskinfo` | `df -h` *(Solo Linux)*                                                                    |
| `cpuinfo`  | `lscpu` *(Solo Linux)*                                                                    |

### Plugins Oh My Zsh

`git rsync cp extract zoxide fzf zsh-autosuggestions zsh-syntax-highlighting brew gh ansible docker docker-compose laravel composer rails ruby python pip node npm bun golang rust` + `macos` (solo macOS) / `nmap tmux` (solo Linux)

---

## Licencia

Bajo la licencia **GNU General Public License v3.0** — ver [LICENSE](../../LICENSE) para detalles.

Mantenido por [promovaweb.com](https://promovaweb.com) · <contato@promovaweb.com>

---
> Follow the formatting guide: [Markdown Format Guide](.claude/commands/markdown-format.md)

# Aliases de SetupVibe

Esta es la lista exhaustiva de todos los aliases configurados por SetupVibe en todas las plataformas.

**Leyenda de Disponibilidad:**
- 🖥️ **Desktop**: Disponible en la edición Desktop (macOS y Linux Desktop).
- ☁️ **Server**: Disponible en la edición Server (Linux).
- 🌐 **Ambos**: Disponible en todas las ediciones.

---

## SetupVibe

- **`setupvibe`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `curl -sSL desktop.setupvibe.dev | bash` (Desktop) / `curl -sSL server.setupvibe.dev | bash` (Server)
  - Descripción: Reinstala o actualiza SetupVibe.
  - Ejemplo: `setupvibe`

## AI CLIs

- **`ge`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `gemini --approval-mode=yolo`
  - Descripción: Gemini CLI sin confirmaciones.
  - Ejemplo: `ge`

- **`cc`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `claude --permission-mode=auto --dangerously-skip-permissions`
  - Descripción: Claude CLI sin confirmaciones.
  - Ejemplo: `cc`

## Skills CLI

- **`skl`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `npx skills list`
  - Descripción: Lista todas las skills instaladas.
  - Ejemplo: `skl`

- **`skf`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `npx skills find`
  - Descripción: Busca skills en el registro.
  - Ejemplo: `skf react`

- **`ska`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `npx skills add`
  - Descripción: Instala una nueva skill.
  - Ejemplo: `ska owner/repo`

- **`sku`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `npx skills update`
  - Descripción: Actualiza todas las skills instaladas.
  - Ejemplo: `sku`

- **`skun`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `npx skills remove`
  - Descripción: Elimina una skill instalada.
  - Ejemplo: `skun nombre`

- **`skc`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `npx skills check`
  - Descripción: Verifica actualizaciones disponibles.
  - Ejemplo: `skc`

## Shell y Utilidades

- **`zconfig`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `nano ~/.zshrc`
  - Descripción: Edita el archivo de configuración de ZSH.
  - Ejemplo: `zconfig`

- **`reload`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `source ~/.zshrc`
  - Descripción: Recarga la configuración de ZSH sin reiniciar la terminal.
  - Ejemplo: `reload`

- **`path`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `echo -e ${PATH//:/\\n}`
  - Descripción: Muestra cada entrada del PATH en una línea separada.
  - Ejemplo: `path`

- **`h`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `history | grep`
  - Descripción: Busca en el historial de comandos.
  - Ejemplo: `h docker`

- **`cls`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `clear`
  - Descripción: Limpia la terminal.
  - Ejemplo: `cls`

- **`please`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `sudo`
  - Descripción: Atajo amigable para sudo.
  - Ejemplo: `please apt update`

- **`week`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `date +%V`
  - Descripción: Muestra el número de la semana actual.
  - Ejemplo: `week`

## Navegación y Sistema de Archivos

- **`..`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `cd ..`
  - Descripción: Sube un nivel de directorio.
  - Ejemplo: `..`

- **`...`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `cd ../..`
  - Descripción: Sube dos niveles de directorio.
  - Ejemplo: `...`

- **`....`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `cd ../../../..`
  - Descripción: Sube tres niveles de directorio.
  - Ejemplo: `....`

- **`ll`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `ls -lhA` (macOS) / `ls -lhA --color=auto` (Linux)
  - Descripción: Lista archivos con detalles y tamaño legible.
  - Ejemplo: `ll`

- **`la`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `ls -A` (macOS) / `ls -A --color=auto` (Linux)
  - Descripción: Lista todos los archivos, incluidos los ocultos.
  - Ejemplo: `la`

- **`lsd`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `ls -d */ 2>/dev/null`
  - Descripción: Lista solo directorios.
  - Ejemplo: `lsd`

- **`md`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `mkdir -p`
  - Descripción: Crea directorios y subdirectorios automáticamente.
  - Ejemplo: `md proyecto/src/css`

- **`rmf`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `rm -rf`
  - Descripción: Elimina archivos y directorios recursivamente sin confirmación.
  - Ejemplo: `rmf carpeta_vieja`

- **`du1`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `du -h -d 1` (macOS) / `du -h --max-depth=1` (Linux)
  - Descripción: Uso de disco del directorio actual, un nivel de profundidad.
  - Ejemplo: `du1`

## Tmux

- **`t`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `tmux`
  - Descripción: Atajo para tmux.
  - Ejemplo: `t`

- **`tn`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `tmux new -s`
  - Descripción: Crea una nueva sesión de tmux.
  - Ejemplo: `tn mi-proyecto`

- **`ta`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `tmux attach -t`
  - Descripción: Se reconecta a una sesión existente.
  - Ejemplo: `ta mi-proyecto`

- **`tl`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `tmux ls`
  - Descripción: Lista todas las sesiones activas de tmux.
  - Ejemplo: `tl`

- **`tk`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `tmux kill-session -t`
  - Descripción: Finaliza una sesión de tmux.
  - Ejemplo: `tk mi-proyecto`

- **`tka`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `tmux kill-server`
  - Descripción: Finaliza todas las sesiones de tmux.
  - Ejemplo: `tka`

- **`td`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `tmux detach`
  - Descripción: Se desconecta de la sesión sin finalizarla.
  - Ejemplo: `td`

- **`tw`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `tmux new-window`
  - Descripción: Crea una nueva ventana en la sesión actual.
  - Ejemplo: `tw`

- **`ts`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `tmux split-window -v`
  - Descripción: Divide el panel horizontalmente (nuevo panel abajo).
  - Ejemplo: `ts`

- **`tsh`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `tmux split-window -h`
  - Descripción: Divide el panel verticalmente (nuevo panel a la derecha).
  - Ejemplo: `tsh`

- **`trename`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `tmux rename-session`
  - Descripción: Renombra la sesión actual.
  - Ejemplo: `trename nuevo-nombre`

- **`twrename`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `tmux rename-window`
  - Descripción: Renombra la ventana actual.
  - Ejemplo: `twrename editor`

- **`treload`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `tmux source ~/.tmux.conf`
  - Descripción: Recarga la configuración de tmux.
  - Ejemplo: `treload`

- **`tconfig`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `nano ~/.tmux.conf`
  - Descripción: Edita el archivo de configuración de tmux.
  - Ejemplo: `tconfig`

## Git

- **`gs`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git status`
  - Descripción: Muestra el estado actual del repositorio.
  - Ejemplo: `gs`

- **`ga`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git add`
  - Descripción: Añade archivos al área de preparación (staging).
  - Ejemplo: `ga archivo.txt`

- **`gaa`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git add .`
  - Descripción: Añade todos los archivos modificados al área de preparación.
  - Ejemplo: `gaa`

- **`gc`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git commit`
  - Descripción: Abre el editor para escribir el mensaje del commit.
  - Ejemplo: `gc`

- **`gcm`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git commit -m`
  - Descripción: Commit con mensaje en línea.
  - Ejemplo: `gcm 'fix: typo'`

- **`gco`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git checkout`
  - Descripción: Cambia de rama o restaura archivos.
  - Ejemplo: `gco main`

- **`gcb`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git checkout -b`
  - Descripción: Crea y cambia a una nueva rama.
  - Ejemplo: `gcb feature/nueva-funcion`

- **`gp`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git push`
  - Descripción: Envía los commits al repositorio remoto.
  - Ejemplo: `gp`

- **`gpl`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git pull`
  - Descripción: Descarga e integra cambios del repositorio remoto.
  - Ejemplo: `gpl`

- **`gf`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git fetch`
  - Descripción: Obtiene actualizaciones del remoto sin aplicarlas.
  - Ejemplo: `gf`

- **`gfa`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git fetch --all --prune`
  - Descripción: Obtiene actualizaciones de todos los remotos y elimina ramas borradas.
  - Ejemplo: `gfa`

- **`gm`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git merge`
  - Descripción: Fusiona una rama.
  - Ejemplo: `gm feature/x`

- **`grb`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git rebase`
  - Descripción: Reaplica commits sobre otra base.
  - Ejemplo: `grb main`

- **`gcp`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git cherry-pick`
  - Descripción: Aplica un commit específico en la rama actual.
  - Ejemplo: `gcp abc123`

- **`gl`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git log --oneline --graph --decorate`
  - Descripción: Log compacto con grafo de ramas.
  - Ejemplo: `gl`

- **`glamelog`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git log --pretty=format:"%h %ad %s" --date=short`
  - Descripción: Log compacto con fechas.
  - Ejemplo: `glamelog`

- **`gd`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git diff`
  - Descripción: Muestra diferencias no preparadas (unstaged).
  - Ejemplo: `gd`

- **`gds`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git diff --staged`
  - Descripción: Muestra diferencias ya preparadas.
  - Ejemplo: `gds`

- **`gb`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git branch`
  - Descripción: Lista las ramas locales.
  - Ejemplo: `gb`

- **`gba`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git branch -a`
  - Descripción: Lista todas las ramas, incluidas las remotas.
  - Ejemplo: `gba`

- **`gbd`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git branch -d`
  - Descripción: Elimina una rama local.
  - Ejemplo: `gbd feature/x`

- **`gtag`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git tag`
  - Descripción: Crea o lista etiquetas.
  - Ejemplo: `gtag v1.0.0`

- **`gclone`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git clone`
  - Descripción: Clona un repositorio.
  - Ejemplo: `gclone https://github.com/usuario/repo.git`

- **`gst`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git stash`
  - Descripción: Guarda los cambios temporalmente en un stash.
  - Ejemplo: `gst`

- **`gstp`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git stash pop`
  - Descripción: Restaura los últimos cambios del stash.
  - Ejemplo: `gstp`

- **`grh`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git reset HEAD~1`
  - Descripción: Deshace el último commit manteniendo los cambios.
  - Ejemplo: `grh`

- **`gundo`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git restore .`
  - Descripción: Descarta todos los cambios no preparados.
  - Ejemplo: `gundo`

- **`gwip`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `git add -A && git commit -m "WIP"`
  - Descripción: Guarda rápidamente el trabajo en curso.
  - Ejemplo: `gwip`

## GitHub CLI

- **`ghpr`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `gh pr create`
  - Descripción: Abre un asistente para crear un Pull Request.
  - Ejemplo: `ghpr`

- **`ghprl`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `gh pr list`
  - Descripción: Lista Pull Requests abiertos.
  - Ejemplo: `ghprl`

- **`ghprv`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `gh pr view`
  - Descripción: Muestra detalles del PR actual.
  - Ejemplo: `ghprv`

- **`ghprc`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `gh pr checkout`
  - Descripción: Realiza el checkout de un PR por número.
  - Ejemplo: `ghprc 42`

- **`ghprs`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `gh pr status`
  - Descripción: Estado de los PRs relacionados con la rama actual.
  - Ejemplo: `ghprs`

- **`ghrl`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `gh repo list`
  - Descripción: Lista los repositorios del usuario autenticado.
  - Ejemplo: `ghrl`

- **`ghrc`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `gh repo clone`
  - Descripción: Clona un repositorio.
  - Ejemplo: `ghrc owner/repo`

- **`ghiss`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `gh issue list`
  - Descripción: Lista las issues abiertas del repositorio.
  - Ejemplo: `ghiss`

- **`ghissn`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `gh issue create`
  - Descripción: Abre un asistente para crear una nueva issue.
  - Ejemplo: `ghissn`

- **`ghrun`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `gh run list`
  - Descripción: Lista ejecuciones de CI/CD de GitHub Actions.
  - Ejemplo: `ghrun`

- **`ghrunw`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `gh run watch`
  - Descripción: Sigue la ejecución del flujo de trabajo en tiempo real.
  - Ejemplo: `ghrunw`

- **`ghwf`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `gh workflow list`
  - Descripción: Lista los flujos de trabajo de GitHub Actions.
  - Ejemplo: `ghwf`

- **`ghwfr`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `gh workflow run`
  - Descripción: Dispara un flujo de trabajo manualmente.
  - Ejemplo: `ghwfr deploy.yml`

- **`ghrel`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `gh release list`
  - Descripción: Lista los releases del repositorio.
  - Ejemplo: `ghrel`

- **`ghrelc`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `gh release create`
  - Descripción: Crea un nuevo release.
  - Ejemplo: `ghrelc v1.0.0`

- **`ghgist`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `gh gist create`
  - Descripción: Crea un Gist a partir de un archivo.
  - Ejemplo: `ghgist archivo.sh`

- **`ghssh`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `gh ssh-key list`
  - Descripción: Lista las llaves SSH registradas en la cuenta de GitHub.
  - Ejemplo: `ghssh`

## SSH

- **`ssha`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `ssh-add`
  - Descripción: Añade una llave SSH al agente.
  - Ejemplo: `ssha ~/.ssh/id_ed25519`

- **`sshal`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `ssh-add -l`
  - Descripción: Lista las llaves cargadas en el agente SSH.
  - Ejemplo: `sshal`

- **`sshkeys`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `ls -la ~/.ssh/`
  - Descripción: Lista todos los archivos de llaves SSH.
  - Ejemplo: `sshkeys`

- **`sshconfig`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `nano ~/.ssh/config`
  - Descripción: Edita el archivo de configuración de SSH.
  - Ejemplo: `sshconfig`

- **`keygen`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `ssh-keygen -t ed25519 -C`
  - Descripción: Genera una nueva llave SSH Ed25519.
  - Ejemplo: `keygen 'email@x.com'`

## Docker

- **`d`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker`
  - Descripción: Atajo para el comando docker.
  - Ejemplo: `d ps`

- **`dc`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker compose`
  - Descripción: Atajo para docker compose.
  - Ejemplo: `dc up -d`

- **`dps`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker ps`
  - Descripción: Lista contenedores en ejecución.
  - Ejemplo: `dps`

- **`dpsa`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker ps -a`
  - Descripción: Lista todos los contenedores, incluidos los detenidos.
  - Ejemplo: `dpsa`

- **`dimg`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker images`
  - Descripción: Lista imágenes de Docker disponibles localmente.
  - Ejemplo: `dimg`

- **`dlog`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker logs -f`
  - Descripción: Sigue los logs de un contenedor.
  - Ejemplo: `dlog mi-contenedor`

- **`dex`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker exec -it`
  - Descripción: Ejecuta un comando interactivo en un contenedor.
  - Ejemplo: `dex app bash`

- **`dstart`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker start`
  - Descripción: Inicia un contenedor detenido.
  - Ejemplo: `dstart mi-contenedor`

- **`dstop`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker stop`
  - Descripción: Detiene un contenedor en ejecución.
  - Ejemplo: `dstop mi-contenedor`

- **`drm`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker rm`
  - Descripción: Elimina un contenedor.
  - Ejemplo: `drm mi-contenedor`

- **`drmi`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker rmi`
  - Descripción: Elimina una imagen.
  - Ejemplo: `drmi mi-imagen`

- **`dpull`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker pull`
  - Descripción: Descarga una imagen del registro.
  - Ejemplo: `dpull nginx:alpine`

- **`dbuild`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker build -t`
  - Descripción: Construye una imagen con una etiqueta.
  - Ejemplo: `dbuild app:latest .`

- **`dstats`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker stats`
  - Descripción: Monitoriza el uso de CPU/memoria de los contenedores en tiempo real.
  - Ejemplo: `dstats`

- **`dins`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker inspect`
  - Descripción: Inspecciona detalles de un contenedor o imagen.
  - Ejemplo: `dins app`

- **`dip`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}'`
  - Descripción: Obtiene la IP del contenedor.
  - Ejemplo: `dip app`

- **`dnet`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker network ls`
  - Descripción: Lista las redes de Docker disponibles.
  - Ejemplo: `dnet`

- **`dvol`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker volume ls`
  - Descripción: Lista los volúmenes de Docker creados.
  - Ejemplo: `dvol`

- **`dprune`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker system prune -af --volumes`
  - Descripción: Elimina todos los recursos de Docker no utilizados.
  - Ejemplo: `dprune`

- **`dcup`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker compose up -d`
  - Descripción: Levanta los servicios en segundo plano.
  - Ejemplo: `dcup`

- **`dcdown`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker compose down`
  - Descripción: Detiene y elimina los contenedores del compose.
  - Ejemplo: `dcdown`

- **`dcstop`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker compose stop`
  - Descripción: Detiene los servicios sin eliminar los contenedores.
  - Ejemplo: `dcstop`

- **`dcrestart`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker compose restart`
  - Descripción: Reinicia todos los servicios del compose.
  - Ejemplo: `dcrestart`

- **`dcps`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker compose ps`
  - Descripción: Lista los servicios del compose y sus estados.
  - Ejemplo: `dcps`

- **`dclog`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker compose logs -f`
  - Descripción: Sigue los logs de todos los servicios del compose.
  - Ejemplo: `dclog`

- **`dclogs`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker compose logs --tail=100`
  - Descripción: Muestra las últimas 100 líneas de los logs del compose.
  - Ejemplo: `dclogs`

- **`dcbuild`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker compose build --no-cache`
  - Descripción: Reconstruye las imágenes sin caché.
  - Ejemplo: `dcbuild`

- **`dcpull`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker compose pull`
  - Descripción: Actualiza las imágenes de los servicios del compose.
  - Ejemplo: `dcpull`

- **`dcexec`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker compose exec`
  - Descripción: Ejecuta un comando en un servicio.
  - Ejemplo: `dcexec app bash`

## Portainer

- **`portainer-start`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker compose -f ~/.setupvibe/portainer-compose.yml up -d`
  - Descripción: Inicia el contenedor de Portainer.
  - Ejemplo: `portainer-start`

- **`portainer-stop`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker compose -f ~/.setupvibe/portainer-compose.yml stop`
  - Descripción: Detiene el contenedor de Portainer.
  - Ejemplo: `portainer-stop`

- **`portainer-restart`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker compose -f ~/.setupvibe/portainer-compose.yml restart`
  - Descripción: Reinicia el contenedor de Portainer.
  - Ejemplo: `portainer-restart`

- **`portainer-update`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `docker compose -f ~/.setupvibe/portainer-compose.yml pull && docker compose -f ~/.setupvibe/portainer-compose.yml up -d`
  - Descripción: Actualiza la imagen y reinicia Portainer.
  - Ejemplo: `portainer-update`

## PM2

- **`p`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `pm2`
  - Descripción: Atajo para o comando PM2.
  - Ejemplo: `p list`

- **`p-start`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `pm2 start ~/ecosystem.config.js`
  - Descripción: Inicia todas las aplicaciones definidas en el archivo ecosystem global.
  - Ejemplo: `p-start`

- **`p-stop`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `pm2 stop ~/ecosystem.config.js`
  - Descripción: Detiene todas las aplicaciones definidas en el archivo ecosystem.
  - Ejemplo: `p-stop`

- **`p-restart`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `pm2 restart ~/ecosystem.config.js`
  - Descripción: Reinicia todas las aplicaciones definidas en el archivo ecosystem.
  - Ejemplo: `p-restart`

- **`pl`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `pm2 list`
  - Descripción: Lista todos los procesos gestionados por PM2.
  - Ejemplo: `pl`

- **`psave`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `pm2 save`
  - Descripción: Guarda la lista de procesos para restauración en el arranque.
  - Ejemplo: `psave`

- **`plog`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `pm2 logs`
  - Descripción: Sigue los logs de todos los procesos en tiempo real.
  - Ejemplo: `plog`

## Agentlytics

- **`agl-start`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `pm2 start agentlytics`
  - Descripción: Inicia el proceso de Agentlytics en PM2.
  - Ejemplo: `agl-start`

- **`agl-stop`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `pm2 stop agentlytics`
  - Descripción: Detiene el proceso de Agentlytics.
  - Ejemplo: `agl-stop`

- **`agl-restart`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `pm2 restart agentlytics`
  - Descripción: Reinicia el proceso de Agentlytics.
  - Ejemplo: `agl-restart`

- **`agl-logs`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `pm2 logs agentlytics`
  - Descripción: Muestra logs específicos de Agentlytics.
  - Ejemplo: `agl-logs`

## Gestores de Paquetes

- **`update`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `brew update && brew upgrade` (macOS) / `sudo apt update...` (Linux)
  - Descripción: Actualiza el sistema y los gestores de paquetes.
  - Ejemplo: `update`

- **`apti`**
  - Disponibilidad: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `sudo apt install`
  - Descripción: Instala un paquete mediante APT.
  - Ejemplo: `apti htop`

- **`aptr`**
  - Disponibilidad: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `sudo apt remove`
  - Descripción: Elimina un paquete mediante APT.
  - Ejemplo: `aptr htop`

- **`apts`**
  - Disponibilidad: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `apt search`
  - Descripción: Busca paquetes en los repositorios de APT.
  - Ejemplo: `apts nginx`

- **`aptshow`**
  - Disponibilidad: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `apt show`
  - Descripción: Muestra detalles de un paquete de APT.
  - Ejemplo: `aptshow git`

- **`aptls`**
  - Disponibilidad: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `dpkg -l | grep`
  - Descripción: Filtra los paquetes instalados.
  - Ejemplo: `aptls nginx`

- **`brewup`**
  - Disponibilidad: 🖥️ Desktop / ☁️ Server si está instalado
  - Comando: `brew update && brew upgrade && brew cleanup`
  - Descripción: Actualiza Homebrew y elimina versiones antiguas.
  - Ejemplo: `brewup`

- **`brewls`**
  - Disponibilidad: 🖥️ Desktop / ☁️ Server si está instalado
  - Comando: `brew list`
  - Descripción: Lista todos los paquetes instalados mediante Homebrew.
  - Ejemplo: `brewls`

- **`brewinfo`**
  - Disponibilidad: 🖥️ Desktop / ☁️ Server si está instalado
  - Comando: `brew info`
  - Descripción: Muestra información sobre un paquete.
  - Ejemplo: `brewinfo git`

- **`brewsearch`**
  - Disponibilidad: 🖥️ Desktop / ☁️ Server si está instalado
  - Comando: `brew search`
  - Descripción: Busca paquetes en Homebrew.
  - Ejemplo: `brewsearch ripgrep`

## Lenguajes y Frameworks (🖥️ Desktop)

### Laravel / PHP
- **`art`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `php artisan`
  - Descripción: Atajo para el PHP Artisan.
  - Ejemplo: `art list`

- **`artm`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `php artisan migrate`
  - Descripción: Ejecuta las migraciones pendientes.
  - Ejemplo: `artm`

- **`artmf`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `php artisan migrate:fresh`
  - Descripción: Recrea todas las tablas desde cero.
  - Ejemplo: `artmf`

- **`artmfs`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `php artisan migrate:fresh --seed`
  - Descripción: Recrea las tablas y las puebla con seeders.
  - Ejemplo: `artmfs`

- **`arts`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `php artisan serve`
  - Descripción: Inicia el servidor de desarrollo de Laravel.
  - Ejemplo: `arts`

- **`artq`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `php artisan queue:work`
  - Descripción: Inicia el worker de colas.
  - Ejemplo: `artq`

- **`artc`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `php artisan cache:clear && php artisan config:clear && php artisan route:clear && php artisan view:clear`
  - Descripción: Limpia todos los cachés de Laravel.
  - Ejemplo: `artc`

- **`artt`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `php artisan test`
  - Descripción: Ejecuta la suite de pruebas de Laravel.
  - Ejemplo: `artt`

- **`artmake`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `php artisan make`
  - Descripción: Atajo para la generación de código.
  - Ejemplo: `artmake:controller UserController`

- **`artr`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `php artisan route:list`
  - Descripción: Lista todas las rutas de la aplicación.
  - Ejemplo: `artr`

- **`arttink`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `php artisan tinker`
  - Descripción: Abre el REPL interactivo de Laravel.
  - Ejemplo: `arttink`

- **`artkey`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `php artisan key:generate`
  - Descripción: Genera una nueva clave de aplicación.
  - Ejemplo: `artkey`

- **`artopt`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `php artisan optimize:clear`
  - Descripción: Limpia todos los cachés y optimizaciones.
  - Ejemplo: `artopt`

- **`artschedule`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `php artisan schedule:work`
  - Descripción: Inicia el worker de tareas programadas.
  - Ejemplo: `artschedule`

- **`artdb`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `php artisan db`
  - Descripción: Abre una conexión interactiva con la base de datos.
  - Ejemplo: `artdb`

- **`artmodel`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `php artisan make:model`
  - Descripción: Crea un Modelo.
  - Ejemplo: `artmodel Post -m`

- **`artjob`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `php artisan make:job`
  - Descripción: Crea un Job para colas.
  - Ejemplo: `artjob ProcessPayment`

- **`artevent`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `php artisan event:list`
  - Descripción: Lista todos los eventos y listeners registrados.
  - Ejemplo: `artevent`

- **`ci`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `composer install`
  - Descripción: Instala las dependencias del composer.json.
  - Ejemplo: `ci`

- **`cu`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `composer update`
  - Descripción: Actualiza las dependencias según las versiones permitidas.
  - Ejemplo: `cu`

- **`creq`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `composer require`
  - Descripción: Añade un paquete.
  - Ejemplo: `creq vendor/paquete`

- **`creqd`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `composer require --dev`
  - Descripción: Añade un paquete como dev-dependency.
  - Ejemplo: `creqd phpunit/phpunit`

- **`cdump`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `composer dump-autoload`
  - Descripción: Regenera el autoload de Composer.
  - Ejemplo: `cdump`

- **`crun`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `composer run`
  - Descripción: Ejecuta un script del composer.json.
  - Ejemplo: `crun dev`

### Node / JavaScript
- **`ni`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `npm install`
  - Descripción: Instala todas las dependencias del package.json.
  - Ejemplo: `ni`

- **`nid`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `npm install --save-dev`
  - Descripción: Instala un paquete como dependencia de desarrollo.
  - Ejemplo: `nid typescript`

- **`nr`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `npm run`
  - Descripción: Ejecuta un script del package.json.
  - Ejemplo: `nr build`

- **`nrd`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `npm run dev`
  - Descripción: Inicia el servidor de desarrollo.
  - Ejemplo: `nrd`

- **`nrb`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `npm run build`
  - Descripción: Ejecuta el build de producción.
  - Ejemplo: `nrb`

- **`nrt`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `npm run test`
  - Descripción: Ejecuta las pruebas.
  - Ejemplo: `nrt`

- **`nx`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `npx`
  - Descripción: Ejecuta un paquete de Node sin instalarlo globalmente.
  - Ejemplo: `nx create-react-app my-app`

- **`bi`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `bun install`
  - Descripción: Instala dependencias con Bun.
  - Ejemplo: `bi`

- **`br`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `bun run`
  - Descripción: Ejecuta un script con Bun.
  - Ejemplo: `br dev`

- **`brd`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `bun run dev`
  - Descripción: Inicia el servidor de desarrollo con Bun.
  - Ejemplo: `brd`

- **`brb`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `bun run build`
  - Descripción: Build de producción con Bun.
  - Ejemplo: `brb`

- **`bx`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `bunx`
  - Descripción: Ejecuta un paquete sin instalar, vía Bun.
  - Ejemplo: `bx cowsay hola`

- **`pn`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `pnpm`
  - Descripción: Atajo para pnpm.
  - Ejemplo: `pn add axios`

- **`pni`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `pnpm install`
  - Descripción: Instala dependencias con pnpm.
  - Ejemplo: `pni`

- **`pnr`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `pnpm run`
  - Descripción: Ejecuta un script del package.json vía pnpm.
  - Ejemplo: `pnr build`

- **`pnd`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `pnpm run dev`
  - Descripción: Inicia el servidor de desarrollo con pnpm.
  - Ejemplo: `pnd`

- **`pnb`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `pnpm run build`
  - Descripción: Build de producción con pnpm.
  - Ejemplo: `pnb`

- **`pnt`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `pnpm run test`
  - Descripción: Ejecuta las pruebas con pnpm.
  - Ejemplo: `pnt`

- **`pnx`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `pnpm dlx`
  - Descripción: Ejecuta un paquete sin instalar vía pnpm.
  - Ejemplo: `pnx create-next-app`

- **`pnadd`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `pnpm add`
  - Descripción: Añade una dependencia con pnpm.
  - Ejemplo: `pnadd axios`

- **`pnaddd`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `pnpm add -D`
  - Descripción: Añade una dev-dependency con pnpm.
  - Ejemplo: `pnaddd vitest`

### Python / uv
- **`py`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `python3`
  - Descripción: Atajo para Python 3.
  - Ejemplo: `py main.py`

- **`pyv`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `python3 --version`
  - Descripción: Muestra la versión activa de Python.
  - Ejemplo: `pyv`

- **`uvi`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `uv pip install`
  - Descripción: Instala un paquete de Python con uv.
  - Ejemplo: `uvi requests`

- **`uvs`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `uv run`
  - Descripción: Ejecuta un script con uv.
  - Ejemplo: `uvs main.py`

- **`venv`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `python3 -m venv .venv && source .venv/bin/activate`
  - Descripción: Crea y activa un virtualenv local.
  - Ejemplo: `venv`

- **`activate`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `source .venv/bin/activate`
  - Descripción: Activa el virtualenv local del directorio.
  - Ejemplo: `activate`

### Ruby / rbenv
- **`rbv`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `rbenv versions`
  - Descripción: Lista las versiones de Ruby instaladas mediante rbenv.
  - Ejemplo: `rbv`

- **`rblocal`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `rbenv local`
  - Descripción: Establece la versión de Ruby para el directorio actual.
  - Ejemplo: `rblocal 3.2.0`

- **`rbglobal`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `rbenv global`
  - Descripción: Establece la versión global de Ruby.
  - Ejemplo: `rbglobal 3.2.0`

- **`be`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `bundle exec`
  - Descripción: Ejecuta un comando en el contexto de Bundler.
  - Ejemplo: `be rails s`

- **`binstall`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `bundle install`
  - Descripción: Instala las gemas del Gemfile.
  - Ejemplo: `binstall`

- **`bupdate`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `bundle update`
  - Descripción: Actualiza las gemas del Gemfile.
  - Ejemplo: `bupdate`

### Rust / Cargo
- **`cb`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `cargo build`
  - Descripción: Compila el proyecto de Rust en modo debug.
  - Ejemplo: `cb`

- **`cbr`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `cargo build --release`
  - Descripción: Compila en modo release optimizado.
  - Ejemplo: `cbr`

- **`crun2`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `cargo run`
  - Descripción: Compila y ejecuta el proyecto de Rust.
  - Ejemplo: `crun2`

- **`ct`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `cargo test`
  - Descripción: Ejecuta las pruebas del proyecto.
  - Ejemplo: `ct`

- **`ccheck`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `cargo check`
  - Descripción: Verifica errores sin generar el binario.
  - Ejemplo: `ccheck`

- **`clippy`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `cargo clippy`
  - Descripción: Ejecuta el linter de Rust.
  - Ejemplo: `clippy`

- **`cfmt`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `cargo fmt`
  - Descripción: Formatea el código con rustfmt.
  - Ejemplo: `cfmt`

- **`cadd`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `cargo add`
  - Descripción: Añade una dependencia al proyecto de Rust.
  - Ejemplo: `cadd serde`

- **`crem`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `cargo remove`
  - Descripción: Elimina una dependencia del proyecto de Rust.
  - Ejemplo: `crem serde`

- **`cupdate`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `cargo update`
  - Descripción: Actualiza todas las dependencias del Cargo.lock.
  - Ejemplo: `cupdate`

- **`cdoc`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `cargo doc --open`
  - Descripción: Genera y abre la documentación del proyecto en el navegador.
  - Ejemplo: `cdoc`

### Go
- **`gobuild`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `go build ./...`
  - Descripción: Compila todos los paquetes del proyecto Go.
  - Ejemplo: `gobuild`

- **`gorun`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `go run .`
  - Descripción: Ejecuta el paquete principal.
  - Ejemplo: `gorun`

- **`gotest`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `go test ./...`
  - Descripción: Ejecuta todas las pruebas del proyecto.
  - Ejemplo: `gotest`

- **`gomod`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `go mod tidy`
  - Descripción: Elimina las dependencias no utilizadas del go.mod.
  - Ejemplo: `gomod`

- **`govet`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `go vet ./...`
  - Descripción: Verifica problemas comunes en el código Go.
  - Ejemplo: `govet`

- **`gofmt`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `gofmt -w .`
  - Descripción: Formatea todos los archivos Go del directorio.
  - Ejemplo: `gofmt`

- **`goget`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `go get`
  - Descripción: Añade una dependencia al proyecto Go.
  - Ejemplo: `goget github.com/gin-gonic/gin`

- **`goclean`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `go clean -cache`
  - Descripción: Elimina el caché de build de Go.
  - Ejemplo: `goclean`

- **`gocover`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `go test ./... -coverprofile=coverage.out && go tool cover -html=coverage.out`
  - Descripción: Cobertura HTML.
  - Ejemplo: `gocover`

- **`gowork`**
  - Disponibilidad: 🖥️ Desktop
  - Comando: `go work`
  - Descripción: Gestiona los workspaces de Go.
  - Ejemplo: `gowork use ./pkg`

## DevOps y Sistema

- **`anp`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `ansible-playbook`
  - Descripción: Ejecuta un playbook.
  - Ejemplo: `anp site.yml -i hosts`

- **`ani`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `ansible-inventory --list`
  - Descripción: Muestra el inventario en formato JSON.
  - Ejemplo: `ani`

- **`anping`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `ansible all -m ping`
  - Descripción: Prueba la conectividad con todos los hosts.
  - Ejemplo: `anping`

- **`anv`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `ansible-vault`
  - Descripción: Gestiona archivos cifrados con Vault.
  - Ejemplo: `anv edit secrets.yml`

- **`anve`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `ansible-vault encrypt`
  - Descripción: Cifra un archivo con Vault.
  - Ejemplo: `anve secrets.yml`

- **`anvd`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `ansible-vault decrypt`
  - Descripción: Descifra un archivo con Vault.
  - Ejemplo: `anvd secrets.yml`

- **`anvr`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `ansible-vault rekey`
  - Descripción: Vuelve a cifrar con una nueva contraseña.
  - Ejemplo: `anvr secrets.yml`

- **`ancheck`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `ansible-playbook --check`
  - Descripción: Simula la ejecución del playbook sin aplicar cambios.
  - Ejemplo: `ancheck site.yml`

- **`andiff`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `ansible-playbook --check --diff`
  - Descripción: Simula y muestra el diff de los cambios que se aplicarían.
  - Ejemplo: `andiff site.yml`

- **`anfacts`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `ansible all -m setup`
  - Descripción: Recopila facts de todos los hosts del inventario.
  - Ejemplo: `anfacts`

### Monitorización y Procesos
- **`topc`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `top -o cpu` (macOS) / `top -bn1 | head -20` (Linux)
  - Descripción: Monitoriza procesos ordenados por uso de CPU.
  - Ejemplo: `topc`

- **`topm`**
  - Disponibilidad: 🖥️ Desktop macOS
  - Comando: `top -o mem`
  - Descripción: Monitoriza procesos ordenados por uso de memoria.
  - Ejemplo: `topm`

- **`psg`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `ps aux | grep`
  - Descripción: Busca procesos por nombre.
  - Ejemplo: `psg nginx`

- **`df`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `df -h`
  - Descripción: Uso de disco con tamaños legibles.
  - Ejemplo: `df`

- **`meminfo`**
  - Disponibilidad: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `free -h`
  - Descripción: Muestra el uso de memoria RAM y swap.
  - Ejemplo: `meminfo`

- **`diskinfo`**
  - Disponibilidad: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `df -h`
  - Descripción: Muestra el uso de disco de todas las particiones.
  - Ejemplo: `diskinfo`

- **`cpuinfo`**
  - Disponibilidad: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `lscpu`
  - Descripción: Muestra información detallada sobre la CPU.
  - Ejemplo: `cpuinfo`

- **`sysinfo`**
  - Disponibilidad: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `hostnamectl`
  - Descripción: Muestra información del sistema operativo y hostname.
  - Ejemplo: `sysinfo`

### Systemd (Linux)
- **`sstatus`**
  - Disponibilidad: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `sudo systemctl status`
  - Descripción: Muestra el estado de un servicio.
  - Ejemplo: `sstatus nginx`

- **`sstart`**
  - Disponibilidad: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `sudo systemctl start`
  - Descripción: Inicia un servicio.
  - Ejemplo: `sstart nginx`

- **`sstop`**
  - Disponibilidad: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `sudo systemctl stop`
  - Descripción: Detiene un servicio.
  - Ejemplo: `sstop nginx`

- **`srestart`**
  - Disponibilidad: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `sudo systemctl restart`
  - Descripción: Reinicia un servicio.
  - Ejemplo: `srestart nginx`

- **`senable`**
  - Disponibilidad: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `sudo systemctl enable`
  - Descripción: Habilita un servicio para iniciarse en el arranque.
  - Ejemplo: `senable nginx`

- **`sdisable`**
  - Disponibilidad: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `sudo systemctl disable`
  - Descripción: Deshabilita un servicio en el arranque.
  - Ejemplo: `sdisable nginx`

- **`slogs`**
  - Disponibilidad: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `sudo journalctl -u`
  - Descripción: Muestra los logs de un servicio específico.
  - Ejemplo: `slogs nginx`

- **`syslog`**
  - Disponibilidad: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `sudo journalctl -f`
  - Descripción: Sigue el log del sistema en tiempo real.
  - Ejemplo: `syslog`

## Red y Web

- **`myip`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `curl -s ifconfig.me`
  - Descripción: Muestra la IP pública de la máquina.
  - Ejemplo: `myip`

- **`localip`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `ipconfig getifaddr en0` (macOS) / `hostname -I...` (Linux)
  - Descripción: Muestra la IP local principal de la máquina.
  - Ejemplo: `localip`

- **`ports`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `lsof -iTCP -sTCP:LISTEN -n -P` (macOS) / `ss -tulnp` (Linux)
  - Descripción: Lista todos los puertos en escucha.
  - Ejemplo: `ports`

- **`wholistening`**
  - Disponibilidad: ☁️ Server / 🖥️ Desktop Linux
  - Comando: `ss -tulnp`
  - Descripción: Atajo alternativo para listar puertos en escucha.
  - Ejemplo: `wholistening`

- **`flush`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `dscacheutil...` (macOS) / `sudo systemd-resolve...` (Linux)
  - Descripción: Limpia el caché de DNS.
  - Ejemplo: `flush`

### cURL / HTTP
- **`get`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `curl -s`
  - Descripción: Petición GET simple.
  - Ejemplo: `get https://api.github.com`

- **`post`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `curl -s -X POST -H 'Content-Type: application/json'`
  - Descripción: Petición POST JSON simple.
  - Ejemplo: `post url -d '{"key":"val"}'`

- **`headers`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `curl -sI`
  - Descripción: Muestra solo las cabeceras HTTP de la respuesta.
  - Ejemplo: `headers google.com`

- **`httpcode`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `curl -o /dev/null -s -w '%{http_code}\n'`
  - Descripción: Muestra solamente el código HTTP de la respuesta.
  - Ejemplo: `httpcode google.com`

- **`timing`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `curl -o /dev/null -s -w 'dns:%{time_namelookup}s...'`
  - Descripción: Latencia detallada.
  - Ejemplo: `timing google.com`

### JSON / YAML
- **`jpp`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `python3 -m json.tool`
  - Descripción: Formatea y valida JSON.
  - Ejemplo: `cat datos.json | jpp`

- **`jsonf`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `jq .`
  - Descripción: Formatea JSON con colores mediante jq.
  - Ejemplo: `cat datos.json | jsonf`

### Seguridad y Certificados
- **`certinfo`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `openssl x509 -text -noout -in`
  - Descripción: Muestra detalles de un certificado .pem.
  - Ejemplo: `certinfo cert.pem`

- **`certexpiry`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `openssl x509 -enddate -noout -in`
  - Descripción: Muestra la fecha de expiración de un certificado.
  - Ejemplo: `certexpiry cert.pem`

- **`sslcheck`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `openssl s_client -connect`
  - Descripción: Inspecciona el TLS de un host.
  - Ejemplo: `sslcheck google.com:443`

- **`genpass`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `openssl rand -base64 32`
  - Descripción: Genera una contraseña aleatoria segura de 32 bytes.
  - Ejemplo: `genpass`

### Entorno
- **`envls`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `env | sort`
  - Descripción: Lista todas las variables de entorno ordenadas.
  - Ejemplo: `envls`

- **`envg`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `env | grep`
  - Descripción: Filtra variables de entorno.
  - Ejemplo: `envg PATH`

- **`dotenv`**
  - Disponibilidad: 🌐 Ambos
  - Comando: `export $(cat .env | grep -v '^#' | xargs)`
  - Descripción: Carga las variables del archivo .env actual.
  - Ejemplo: `dotenv`

---
> Follow the formatting guide: [Markdown Format Guide](.claude/commands/markdown-format.md)

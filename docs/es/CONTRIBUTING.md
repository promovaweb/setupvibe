# Guía de Contribución (ES)

¡Bienvenido a la guía de contribución de **SetupVibe**! Estamos emocionados de tenerte aquí. Este documento describe los estándares y flujos de trabajo necesarios para contribuir a este proyecto.

## 🚀 Cómo Empezar

1. **Haz un Fork** del repositorio.
2. **Clona** tu fork localmente.
3. **Crea una rama** para tu funcionalidad o corrección (ej: `feat/nueva-herramienta` o `fix/enlace-roto`).
4. **Implementa** tus cambios siguiendo los estándares a continuación.
5. **Envía un Pull Request** con una descripción clara de tus cambios.

---

## 🛠 Estándares de Código (Bash)

SetupVibe utiliza dos scripts principales: `desktop.sh` y `server.sh`. Todo el código Shell debe seguir estos patrones:

### 1. Elevación Inteligente de Privilegios

Nunca uses `sudo` directamente dentro de las funciones, a menos que sea estrictamente necesario por razones específicas. Utiliza nuestras funciones auxiliares:

- **`user_do`**: Ejecuta un comando como el usuario real (incluso si el script se inició con `sudo`). Úsalo para instalar herramientas en `$HOME`, configurar Git o gestionar dotfiles del usuario.
- **`sys_do`**: Ejecuta un comando con privilegios elevados. Úsalo para la gestión de paquetes del sistema (`apt`), modificar `/etc` o gestionar servicios del sistema.

### 2. Arquitectura Modular

Los scripts están organizados en funciones modulares llamadas `step_N`. Si añades una nueva funcionalidad:

1. Añade el título al array `STEPS`.
2. Crea una función `step_N` correspondiente.
3. Asegúrate de que la lógica soporte tanto **macOS (`$IS_MACOS`)** como **Linux (`$IS_LINUX`)** donde sea aplicable.

### 3. Idempotencia

Los scripts deben ser seguros para ejecutarse varias veces. Siempre verifica si una herramienta ya está instalada o si una configuración ya existe antes de aplicar los cambios.

### 4. Gestión de Llaveros (Linux)

No uses `apt-key` (depreciado). Siempre almacena las llaves GPG de APT en `/etc/apt/keyrings/` utilizando los auxiliares `install_key` o `sys_do`.

---

## 📝 Estándares de Documentación (Markdown)

Todos los archivos `.md` deben seguir estas reglas estrictamente:

1. **Jerarquía**: Usa encabezados jerárquicos (H1 → H2 → H3). Nunca saltes niveles.
2. **Tablas**: Alinea las columnas con pipes `|` e incluye una fila separadora `|---|`.
3. **Bloques de Código**: Siempre especifica el lenguaje (ej: ` ```bash `).
4. **Enlaces**: Usa el formato `[texto](url)`. No uses URLs desnudas.
5. **Listas**: Usa guiones `-` para listas no ordenadas.
6. **Espaciado**: Una línea en blanco antes y después de encabezados, bloques de código y tablas.
7. **Sin HTML**: Evita `<br>`, `<b>`, `<i>` u otras etiquetas HTML.

---

## 🔢 Proceso de Versionado

Al actualizar la versión (ej: de `0.41.8` a `0.42.0`), **debes** actualizar la cadena de versión en todas las siguientes ubicaciones:

- `desktop.sh` (variable `VERSION`)
- `server.sh` (variable `VERSION`)
- `CHANGELOG.md` (añadir una nueva entrada)
- `README.md` (visión general del proyecto en la raíz)
- `GEMINI.md` (visão geral do projeto para o agente)
- `CLAUDE.md` (visão geral do projeto para o agente)
- Todos los archivos `README.md` en `docs/` y sus subdirectorios.

---

## 🤖 Automatización y Skills

Este proyecto utiliza **Agent Skills** (ubicadas en `.gemini/skills` y `.claude/skills`) para automatizar tareas.

- Si eres un agente de IA, **debes** activar las skills relevantes (ej: `markdown-format`, `make-changelog`) antes de realizar tareas.
- Si eres un humano, ten en cuenta que estas skills refuerzan los estándares mencionados anteriormente.

---

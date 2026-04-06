# Guía de Spec-Kit

SetupVibe instala [Spec-Kit](https://github.com/github/spec-kit) en la edición Desktop (macOS y Linux escritorio) a través de `uv tool install specify-cli`.

> Guía de herramientas — v0.41.6

- **Comando:** `specify`
- **Paquete:** `specify-cli` (PyPI)
- **Requisitos:** Python 3.11+, `uv`, Git y un agente de IA

---

## ¿Qué es Spec-Kit?

Spec-Kit es un **conjunto de herramientas de código abierto para el Spec-Driven Development (SDD)** — una metodología que invierte el enfoque tradicional del desarrollo de software al hacer que las especificaciones sean ejecutables antes de escribir cualquier código.

En lugar de saltar directamente al código ("vibe coding"), SDD lo guía a través de tres fases:

| Fase | Comando | Propósito |
|---|---|---|
| **Specify** | `/speckit.specify` | Define *qué* construir y *por qué* |
| **Plan** | `/speckit.plan` | Define *cómo* construirlo (arquitectura, stack tecnológico) |
| **Tasks** | `/speckit.tasks` | Divide el plan en partes de implementación accionables |

---

## Primeros Pasos

```bash
# Verifica que todas las dependencias estén instaladas
spcheck

# Inicializa un nuevo proyecto en una nueva carpeta
spinit mi-proyecto

# Inicializa en el directorio actual con Claude
spci

# Inicializa en el directorio actual con Gemini
spgi

# Inicializa en el directorio actual con Copilot
spkpi
```

---

## Instalación y Actualización

```bash
# Instala Spec-Kit manualmente (si es necesario)
uv tool install specify-cli

# Actualiza a la última versión
spup
```

---

## Referencia de la CLI

### `specify init`

Prepara un proyecto para Spec-Driven Development.

```bash
specify init <NOMBRE_DEL_PROYECTO> [opciones]
```

| Opción | Descripción |
|---|---|
| `--ai <agente>` | Agente de IA a usar: `claude`, `copilot`, `gemini`, `codebuddy`, `pi` |
| `--script <tipo>` | Tipo de script: `sh` (Bash) o `ps` (PowerShell) |
| `--here` | Inicializa en el directorio actual en lugar de una nueva carpeta |
| `--offline` | Usa activos integrados sin buscarlos en la red |
| `--ignore-agent-tools` | Omite la validación de herramientas del agente de IA |

### `specify check`

Verifica que todas las dependencias requeridas (Python, uv, Git, agente de IA) estén instaladas y accesibles.

```bash
specify check
```

---

## Aliases de SetupVibe

Estos aliases están disponibles después de ejecutar SetupVibe Desktop en macOS o Linux.

| Alias | Comando | Descripción |
|---|---|---|
| `sp` | `specify` | Acceso directo al comando principal |
| `spinit` | `specify init` | Inicializa SDD en un nuevo directorio |
| `spcheck` | `specify check` | Verifica las dependencias instaladas |
| `sphere` | `specify init --here` | Inicializa SDD en el directorio actual |
| `spci` | `specify init --here --ai claude` | Inicia un proyecto SDD con Claude Code |
| `spgi` | `specify init --here --ai gemini` | Inicia un proyecto SDD con Gemini CLI |
| `spkpi` | `specify init --here --ai copilot` | Inicia un proyecto SDD con GitHub Copilot |
| `spup` | `uv tool upgrade specify-cli` | Actualiza Spec-Kit |

---

## Flujo de Trabajo Típico

### 1. Preparar el proyecto

```bash
mkdir mi-app && cd mi-app
spci
```

Esto crea la estructura de Spec-Kit con Claude Code como agente de IA.

### 2. Escribir la especificación

Abra su agente de IA y ejecute el comando `/speckit.specify`. Responda a las preguntas para definir:

- ¿Qué problema está resolviendo?
- ¿Quiénes son los usuarios?
- ¿Cuáles son los escenarios principales y los resultados esperados?

### 3. Crear el plan técnico

Ejecute `/speckit.plan` en su agente de IA para producir:

- Decisiones de arquitectura
- Elecciones de stack tecnológico
- Puntos de integración y restricciones

### 4. Dividir en tareas

Ejecute `/speckit.tasks` para generar una lista numerada y ordenada de tareas de implementación a partir del plan.

### 5. Implementar

Use `/speckit.implement` o trabaje tarea por tarea con su agente de IA, haciendo referencia a la especificación y al plan en cada paso.

---

## Agentes de IA Soportados

| Agente | Flag | Notas |
|---|---|---|
| Claude Code | `--ai claude` | Recomendación predeterminada para usuarios de SetupVibe |
| GitHub Copilot | `--ai copilot` | Requiere suscripción a Copilot |
| Gemini CLI | `--ai gemini` | Nivel gratuito disponible |
| CodeBuddy | `--ai codebuddy` | Asistente de IA de Tencent Cloud |
| Pi | `--ai pi` | Asistente de IA de Inflection |

---

## Consejos

- Ejecute `spcheck` antes de comenzar cualquier proyecto para confirmar que su entorno esté listo.
- Use `--offline` en entornos aislados o cuando la red no sea confiable.
- La flag `--here` (alias `sphere`) es útil cuando la carpeta del proyecto ya existe.
- Realice el commit de los archivos de especificación generados junto con su código; sirven como documentación viva.
- Ejecute `spup` periódicamente para mantenerse en la última versión de Spec-Kit.

---

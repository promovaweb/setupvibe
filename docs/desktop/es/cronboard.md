# Guía de Cronboard
>
> Panel de monitoreo Cron TUI — v0.41.8

SetupVibe instala [Cronboard](https://github.com/antoniorodr/cronboard) para proporcionar una interfaz de usuario de terminal (TUI) para gestionar tareas de cron.

---

## ¿Qué es Cronboard?

Cronboard es un panel de control basado en terminal para gestionar trabajos de cron de forma local y en servidores remotos. Permite visualizar, crear, editar, pausar y eliminar tareas de forma intuitiva, sin necesidad de editar archivos de texto manualmente.

**Características principales:**

- **Interfaz Visual (TUI):** Gestión amigable mediante teclado.
- **Validación:** Comprobación en tiempo real de la validez de la expresión cron.
- **Lenguaje Natural:** Convierte expresiones cron en descripciones legibles (ej: "Todos los días a las 00:00").
- **Soporte Remoto:** Conexión vía SSH para gestionar crontabs en otros servidores.
- **Búsqueda:** Filtro rápido de tareas por palabras clave.

---

## Uso Básico

```bash
# Abrir el panel de Cronboard
cronboard

# O usar el atalho de SetupVibe
cronb
```

### Comandos de Teclado en el Panel

| Tecla | Acción |
|---|---|
| `j` / `k` o `↑` / `↓` | Navegar entre tareas |
| `n` | Crear una nueva tarea |
| `e` | Editar la tarea seleccionada |
| `p` | Pausar/Reanudar tarea (comenta/descomenta en el crontab) |
| `d` | Eliminar tarea |
| `s` | Guardar cambios |
| `f` | Filtrar tareas |
| `q` | Salir de Cronboard |

---

## Gestión Remota

Cronboard permite gestionar servidores a través de SSH. Puedes configurar conexiones en el archivo de configuración de Cronboard.

Para más detalles sobre configuraciones avanzadas, visita la [documentación oficial](https://antoniorodr.github.io/cronboard/configuration/).

---

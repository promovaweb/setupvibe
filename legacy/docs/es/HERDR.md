# Herdr en SetupVibe

> Multiplexor de agentes instalado por las ediciones Desktop y Server.

[Herdr](https://github.com/herdrdev/herdr) organiza agentes de código en workspaces persistentes dentro del terminal. Cada workspace puede contener pestañas y paneles, mientras la barra lateral muestra si un agente detectado está trabajando, esperando una respuesta, finalizado o inactivo.

## Disponibilidad

| Edición | Sistemas | Estado |
| --- | --- | --- |
| Desktop | macOS, Linux y WSL | Instalado |
| Server | Distribuciones Linux compatibles | Instalado |
| Windows (Beta) | Windows nativo | No instalado |

La edición Windows de SetupVibe no instala Herdr porque el soporte nativo del proyecto para esa plataforma sigue en preview. En Windows, la edición Desktop se puede ejecutar dentro de WSL para usar el binario Linux estable.

## Cómo Instala Herdr SetupVibe

Los instaladores Desktop y Server leen el manifiesto oficial en `https://herdr.dev/latest.json`, seleccionan el binario correspondiente al sistema operativo y la arquitectura detectados y aceptan solamente assets publicados en la ruta oficial de releases del proyecto original en GitHub.

El binario seleccionado pasa por las verificaciones de descarga de SetupVibe y se instala en:

```text
~/.local/bin/herdr
```

Después de la instalación, SetupVibe ejecuta `herdr --version` con el `PATH` del usuario de destino. El paso falla si la descarga no termina, la arquitectura no es compatible, el manifiesto apunta a un origen inesperado o el comando instalado no se puede ejecutar.

Una nueva ejecución de SetupVibe consulta el manifiesto actual y reemplaza el binario administrado por la release estable disponible para la máquina.

## Primera Sesión

Abre el directorio de un proyecto e inicia Herdr:

```bash
cd ~/proyectos/mi-proyecto
herdr
```

Herdr crea o conecta el cliente a la sesión predeterminada ejecutada en background. Dentro de un panel, inicia el agente de código con su comando habitual:

```bash
codex
```

También puedes ejecutar `claude`, `copilot` u otro agente compatible con Herdr. La autenticación, los permisos y las instrucciones del proyecto siguen bajo la responsabilidad de cada CLI y repositorio.

## Comandos Esenciales

| Comando | Función |
| --- | --- |
| `herdr` | Crea o conecta el cliente a la sesión predeterminada. |
| `herdr --version` | Muestra la versión instalada. |
| `herdr --help` | Lista los comandos y las opciones disponibles. |
| `herdr config check` | Valida la configuración de Herdr. |
| `herdr update` | Actualiza una instalación administrada por el instalador de Herdr. |
| `herdr server stop` | Detiene el servidor predeterminado y los procesos de sus paneles. |

Ejecutar SetupVibe nuevamente es la forma recomendada de actualizar el binario administrado por SetupVibe. Usa `herdr update` solamente cuando quieras que Herdr administre sus propias actualizaciones.

## Atajos Iniciales

Herdr usa `Ctrl+B` como prefijo predeterminado. Presiona el prefijo, suelta las teclas y después presiona la tecla de la acción.

| Acción | Atajo |
| --- | --- |
| Dividir a la derecha | `prefix` y después `v` |
| Dividir abajo | `prefix` y después `-` |
| Crear pestaña | `prefix` y después `c` |
| Pestaña siguiente o anterior | `prefix` y después `n` o `p` |
| Navegar entre workspaces | `prefix` y después `w` |
| Desconectar el cliente | `prefix` y después `q` |
| Mostrar atajos activos | `prefix` y después `?` |

Desconectar el cliente o cerrar el terminal mantiene el servidor de Herdr y los procesos de los paneles en ejecución. Ejecuta `herdr` otra vez para volver a la misma sesión.

## Herdr y Tmux

SetupVibe continúa instalando tmux en las ediciones Desktop y Server. Herdr prioriza los workspaces y la visualización del estado de los agentes de código, mientras tmux sigue siendo adecuado para sesiones generales de shell, rutinas remotas ya establecidas y la configuración de plugins ofrecida por SetupVibe.

Usa un solo multiplexor como sesión externa en cada rutina. Ejecutar Herdr dentro de tmux, o tmux dentro de Herdr, añade otra capa de prefijos y captura de input que dificulta diagnosticar conflictos de teclado y ratón.

## Actualizaciones y Sesiones Activas

Una actualización que cambie el protocolo entre el cliente y el servidor de Herdr puede requerir el reinicio de la sesión. Lee el mensaje de actualización antes de ejecutar:

```bash
herdr server stop
```

Este comando también detiene los procesos ejecutados en los paneles. Si solo quieres salir de la interfaz y mantener los agentes activos, usa `prefix` y después `q`.

## Solución de Problemas

| Síntoma | Verificación |
| --- | --- |
| `herdr: command not found` | Abre otro shell y confirma que `~/.local/bin` aparece en `PATH`. |
| SetupVibe no encuentra un asset | Confirma que la máquina usa x86_64 o ARM64 y puede acceder a `herdr.dev` y GitHub. |
| Un agente de código no se detecta | Confirma que el agente se ejecuta directamente dentro de un panel de Herdr y consulta la lista de agentes compatibles. |
| Los atajos llegan al programa equivocado | Busca otro multiplexor anidado o atajos del terminal configurados con el mismo prefijo. |
| El cliente informa incompatibilidad de protocolo | Termina el trabajo actual, detén el servidor afectado e inicia Herdr otra vez con el binario actualizado. |

## Lectura Adicional

- [Repositorio de Herdr](https://github.com/herdrdev/herdr)
- [Documentación de Herdr](https://herdr.dev/docs/)
- [Índice de documentación de SetupVibe](../README.md)

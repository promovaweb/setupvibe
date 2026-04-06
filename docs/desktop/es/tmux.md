# Guía de Tmux
> Configuración del multiplexor de terminal — v0.41.6

SetupVibe instala y configura tmux con [TPM](https://github.com/tmux-plugins/tpm) y un conjunto de plugins seleccionados. La edición Desktop usa [`conf/tmux-desktop.conf`](../../../conf/tmux-desktop.conf), descargada automáticamente durante la instalación.

La edición Server usa una [`conf/tmux-server.conf`](../../../conf/tmux-server.conf) más liviana — mismos atajos de teclado, pero sin los plugins `docker`, `mise` y `tmux-open`, y con una barra de estado simplificada (`git · cwd` a la izquierda).

---

## ¿Qué es tmux?

tmux es un **multiplexor de terminales**: permite ejecutar múltiples sesiones de terminal dentro de una sola ventana, mantener las sesiones activas después de desconectarse y dividir la pantalla en paneles. Es esencial para servidores remotos y usuarios avanzados.

**Conceptos clave:**

| Concepto    | Descripción                                                       |
| ----------- | ----------------------------------------------------------------- |
| **Sesión**  | Una colección de ventanas. Sobrevive a la desconexión.            |
| **Ventana** | Como una pestaña del navegador: vista de pantalla completa.        |
| **Panel**   | Una división dentro de una ventana. Múltiples paneles por ventana. |
| **Prefijo** | `Ctrl + b`: se presiona antes de cada atajo de tmux.              |

---

## Primeros Pasos

```bash
# Iniciar una nueva sesión
tmux

# Iniciar una sesión con nombre
tmux new -s mi-proyecto

# Listar sesiones
tmux ls

# Conectar a la última sesión
tmux attach

# Conectar a una sesión con nombre
tmux attach -t mi-proyecto

# Matar una sesión
tmux kill-session -t mi-proyecto
```

Después de abrir tmux, presiona `prefix + I` (i mayúscula) para instalar todos los plugins.

---

## Atajos de Teclado por Defecto

> Todos los atajos requieren presionar **`Ctrl + b`** primero, y luego la tecla.

### Sesiones

| Atajo        | Acción                                              |
| ------------ | --------------------------------------------------- |
| `prefix + s` | Listar y cambiar sesiones (interactivo)             |
| `prefix + $` | Renombrar sesión actual                             |
| `prefix + d` | Desconectarse de la sesión (la sesión sigue activa) |
| `prefix + (` | Cambiar a la sesión anterior                        |
| `prefix + )` | Cambiar a la sesión siguiente                       |
| `prefix + L` | Cambiar a la última sesión utilizada                |

### Ventanas

| Atajo          | Acción                                    |
| -------------- | ----------------------------------------- |
| `prefix + c`   | Crear nueva ventana                       |
| `prefix + ,`   | Renombrar ventana actual                  |
| `prefix + &`   | Matar ventana actual                      |
| `prefix + n`   | Siguiente ventana                         |
| `prefix + p`   | Ventana anterior                          |
| `prefix + l`   | Última ventana (alternar)                 |
| `prefix + w`   | Listar y cambiar ventanas (interactivo)   |
| `prefix + 0–9` | Cambiar a ventana por número              |
| `prefix + '`   | Solicitar número de ventana para cambiar  |
| `prefix + .`   | Mover ventana a un índice diferente       |
| `prefix + f`   | Buscar ventana por nombre                 |

### Paneles

| Atajo                  | Acción                                                                |
| ---------------------- | --------------------------------------------------------------------- |
| `prefix + %`           | Dividir verticalmente (izquierda/derecha)                             |
| `prefix + "`           | Dividir horizontalmente (arriba/abajo)                                |
| `prefix + o`           | Rotar al siguiente panel                                              |
| `prefix + ;`           | Alternar al último panel activo                                       |
| `prefix + x`           | Matar panel actual                                                    |
| `prefix + z`           | Zoom del panel (alternar pantalla completa)                           |
| `prefix + q`           | Mostrar números de paneles (presiona número para ir)                  |
| `prefix + {`           | Intercambiar panel con el anterior                                    |
| `prefix + }`           | Intercambiar panel con el siguiente                                   |
| `prefix + Alt+1–5`     | Cambiar a diseños preestablecidos (even-h, even-v, main-h, etc.)      |
| `prefix + !`           | Convertir panel en su propia ventana                                  |
| `prefix + m`           | Marcar panel                                                          |
| `prefix + M`           | Limpiar panel marcado                                                 |
| `↑ ↓ ← →`              | Navegar por los paneles por dirección                                 |
| `prefix + Ctrl + ↑↓←→` | Redimensionar panel (1 celda)                                         |
| `prefix + Alt + ↑↓←→`  | Redimensionar panel (5 celdas)                                        |

### Modo Copia

| Atajo                   | Acción                                    |
| ----------------------- | ----------------------------------------- |
| `prefix + [`            | Entrar en modo copia                      |
| `prefix + ]`            | Pegar el último búfer copiado             |
| `prefix + #`            | Listar búferes de pegado                  |
| `prefix + =`            | Elegir búfer para pegar de la lista       |
| `prefix + -`            | Eliminar el búfer más reciente            |
| `q` (en modo copia)     | Salir del modo copia                      |
| `Space` (en modo copia) | Iniciar selección                         |
| `Enter` (en modo copia) | Copiar selección y salir                  |
| `/` (en modo copia)     | Buscar hacia adelante                     |
| `?` (en modo copia)     | Buscar hacia atrás                        |

### Varios

| Atajo             | Acción                            |
| ----------------- | --------------------------------- |
| `prefix + :`      | Abrir línea de comandos de tmux   |
| `prefix + ?`      | Listar todos los atajos           |
| `prefix + r`      | Recargar configuración de tmux    |
| `prefix + t`      | Mostrar reloj                     |
| `prefix + i`      | Mostrar información de la ventana |
| `prefix + ~`      | Mostrar mensajes de tmux          |
| `prefix + D`      | Elegir un cliente para desconectar|
| `prefix + E`      | Distribuir paneles uniformemente  |
| `prefix + Ctrl+z` | Suspender cliente de tmux         |

---

## Plugins

### Núcleo

| Plugin                                                                      | Descripción         |
| --------------------------------------------------------------------------- | ------------------- |
| [tmux-plugins/tpm](https://github.com/tmux-plugins/tpm)                     | Gestor de plugins   |
| [tmux-plugins/tmux-sensible](https://github.com/tmux-plugins/tmux-sensible) | Ajustes sensatos    |

**Atajos de TPM:**

| Atajo            | Acción                       |
| ---------------- | ---------------------------- |
| `prefix + I`     | Instalar plugins             |
| `prefix + U`     | Actualizar plugins           |
| `prefix + Alt+u` | Eliminar plugins no utilizados|

---

### Navegación y Control de Paneles

#### [tmux-pain-control](https://github.com/tmux-plugins/tmux-pain-control)

Atajos consistentes e intuitivos para dividir y redimensionar paneles.

| Atajo              | Acción                            | Reemplaza por defecto                        |
| ------------------ | --------------------------------- | -------------------------------------------- |
| `prefix + \|`      | Dividir verticalmente (izq/der)   | `prefix + %` sigue funcionando               |
| `prefix + -`       | Dividir horizontalmente (arr/aba) | Reemplaza `delete-buffer` (raramente usado)  |
| `prefix + \`       | División vertical de ancho total  | —                                            |
| `prefix + _`       | División horizontal de alto total | —                                            |
| `prefix + h`       | Seleccionar panel izquierdo       | —                                            |
| `prefix + j`       | Seleccionar panel abajo           | —                                            |
| `prefix + k`       | Seleccionar panel arriba          | —                                            |
| `prefix + l`       | Seleccionar panel derecho         | `last-window` restaurado tras cargar plugin  |
| `prefix + H/J/K/L` | Redimensionar panel (5 celdas)    | —                                            |

#### [christoomey/vim-tmux-navigator](https://github.com/christoomey/vim-tmux-navigator)

Navega entre paneles de tmux y divisiones de vim con las mismas teclas.

| Atajo      | Acción                    |
| ---------- | ------------------------- |
| `Ctrl + h` | Mover a la izquierda      |
| `Ctrl + j` | Mover abajo               |
| `Ctrl + k` | Mover arriba              |
| `Ctrl + l` | Mover a la derecha        |
| `Ctrl + \` | Mover al panel anterior   |

> No requiere prefijo. Funciona de forma transparente dentro de vim/neovim.

---

### Ratón

#### [NHDaly/tmux-better-mouse-mode](https://github.com/NHDaly/tmux-better-mouse-mode)

| Característica                  | Comportamiento                                            |
| ------------------------------- | --------------------------------------------------------- |
| Scroll abajo en modo copia      | Sale del modo copia automáticamente                       |
| Scroll sobre panel              | No cambia el panel activo                                 |
| Scroll en vim/less/man          | Envía eventos de scroll a la app (búfer alternativo)      |

---

### Copia y Portapapeles

#### [tmux-plugins/tmux-yank](https://github.com/tmux-plugins/tmux-yank)

| Atajo        | Contexto   | Acción                                         |
| ------------ | ---------- | ---------------------------------------------- |
| `prefix + y` | Normal     | Copiar texto en la línea de comandos           |
| `prefix + Y` | Normal     | Copiar directorio de trabajo actual            |
| `y`          | Modo copia | Copiar selección al portapapeles               |
| `Y`          | Modo copia | Copiar selección y pegar en la línea de comando|

#### [CrispyConductor/tmux-copy-toolkit](https://github.com/CrispyConductor/tmux-copy-toolkit)

| Atajo        | Acción                     |
| ------------ | -------------------------- |
| `prefix + e` | Activar el copy toolkit    |

#### [abhinav/tmux-fastcopy](https://github.com/abhinav/tmux-fastcopy)

Copia basada en pistas (estilo vimium). Resalta patrones de texto en pantalla y permite copiarlos escribiendo letras cortas.

| Atajo        | Acción                         |
| ------------ | ------------------------------ |
| `prefix + F` | Activar pistas de fastcopy     |

Reconoce: URLs, IPs, hashes de Git, rutas de archivos, UUIDs, colores hex, números y más.

> Usa `prefix + F` (mayúscula); `prefix + f` se reserva para el `find-window` integrado de tmux.

---

### Apertura de URLs y Archivos

#### [tmux-plugins/tmux-open](https://github.com/tmux-plugins/tmux-open)

| Atajo       | Contexto   | Acción                                      |
| ----------- | ---------- | ------------------------------------------- |
| `o`         | Modo copia | Abrir con aplicación por defecto del sistema|
| `Ctrl + o`  | Modo copia | Abrir con `$EDITOR`                         |
| `Shift + s` | Modo copia | Buscar selección en el navegador            |

#### [wfxr/tmux-fzf-url](https://github.com/wfxr/tmux-fzf-url)

| Atajo        | Acción                   |
| ------------ | ------------------------ |
| `prefix + u` | Abrir selector de URLs   |

---

### Gestión de Sesiones

#### [tmux-plugins/tmux-resurrect](https://github.com/tmux-plugins/tmux-resurrect)

Guarda y restaura todo el entorno de tmux tras reiniciar el sistema.

| Atajo             | Acción            |
| ----------------- | ----------------- |
| `prefix + Ctrl+s` | Guardar sesión    |
| `prefix + Ctrl+r` | Restaurar sesión  |

Guarda: ventanas, paneles, directorios, contenidos de paneles, programas en ejecución.

#### [tmux-plugins/tmux-continuum](https://github.com/tmux-plugins/tmux-continuum)

| Característica             | Valor               |
| -------------------------- | ------------------- |
| Intervalo de guardado auto | Cada 10 minutos     |
| Restauración auto al inicio| Habilitado          |

Sin atajos: funciona automáticamente en segundo plano.

#### [omerxx/tmux-sessionx](https://github.com/omerxx/tmux-sessionx)

Gestor de sesiones completo con vista previa de fzf.

| Atajo        | Acción                       |
| ------------ | ---------------------------- |
| `prefix + S` | Abrir gestor de sesiones     |

Dentro de sessionx: `Ctrl+d` borrar sesión, `Ctrl+r` renombrar, `Tab` alternar vista previa.

> Usa `prefix + S` (mayúscula); `prefix + o` se reserva para el `rotate-pane` integrado de tmux.

---

### Buscador Fuzzy

#### [sainnhe/tmux-fzf](https://github.com/sainnhe/tmux-fzf)

Gestiona sesiones, ventanas, paneles y ejecuta comandos vía fzf.

| Atajo                    | Acción                  |
| ------------------------ | ----------------------- |
| `prefix + F` (mayúscula) | Abrir menú de tmux-fzf  |

---

### Ayudas de UI

#### [Freed-Wu/tmux-digit](https://github.com/Freed-Wu/tmux-digit)

| Atajo          | Acción                               |
| -------------- | ------------------------------------ |
| `prefix + 0–9` | Saltar directo a ventana por índice  |

#### [anghootys/tmux-ip-address](https://github.com/anghootys/tmux-ip-address)

Muestra la dirección IP actual de la máquina en la barra de estado. Sin atajos.

#### [tmux-plugins/tmux-prefix-highlight](https://github.com/tmux-plugins/tmux-prefix-highlight)

Resalta la barra de estado cuando la tecla prefijo está activa, en modo copia o en sincronización.

#### [alexwforsythe/tmux-which-key](https://github.com/alexwforsythe/tmux-which-key)

| Atajo            | Acción                    |
| ---------------- | ------------------------- |
| `prefix + Space` | Abrir menú de which-key   |

> `prefix + Space` se asigna a which-key. El cambio de diseño sigue disponible vía `prefix + Alt+1–5`.

#### [jaclu/tmux-menus](https://github.com/jaclu/tmux-menus)

| Atajo        | Acción                    |
| ------------ | ------------------------- |
| `prefix + g` | Abrir menú de contexto    |

---

### Tema

#### [2KAbhishek/tmux2k](https://github.com/2KAbhishek/tmux2k)

**Desktop** (`tmux-desktop.conf`):

| Posición  | Widgets                            |
| --------- | ---------------------------------- |
| Izquierda | `git` · `cwd` · `docker` · `mise`  |
| Derecha   | `cpu` · `ram` · `network` · `time` |

**Server** (`tmux-server.conf`):

| Posición  | Widgets                            |
| --------- | ---------------------------------- |
| Izquierda | `git` · `cwd`                      |
| Derecha   | `cpu` · `ram` · `network` · `time` |

**Tema:** `onedark` con separadores powerline en ambas ediciones.

---

## Resolución de Conflictos de Teclas

| Tecla            | Tmux por defecto              | Plugin            | Resolución                                                                  |
| ---------------- | ----------------------------- | ----------------- | --------------------------------------------------------------------------- |
| `prefix + f`     | `find-window`                 | tmux-fastcopy     | Fastcopy movido a `prefix + F`; por defecto preservado                      |
| `prefix + o`     | `rotate-pane`                 | tmux-sessionx     | Sessionx movido a `prefix + S`; por defecto preservado                      |
| `prefix + l`     | `last-window`                 | tmux-pain-control | Por defecto restaurado con `bind-key l last-window` tras TPM                |
| `prefix + -`     | `delete-buffer`               | tmux-pain-control | Pain-control sobrescribe con división horizontal; aceptado (raro uso)       |
| `prefix + \`     | *(pain-control split)*        | tmux-menus        | Menus movido a `prefix + g`; división de pain-control preservada            |
| `prefix + M`     | `select-pane -M` (limpiar)    | tmux-menus        | Menus movido a `prefix + g`; por defecto preservado                         |
| `prefix + Space` | `next-layout`                 | tmux-which-key    | which-key toma Space; next-layout disponible vía `prefix + Alt+1–5`         |

---

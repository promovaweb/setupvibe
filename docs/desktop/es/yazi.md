# Gestor de Archivos Yazi

> Comandos nativos y uso esencial de Yazi — v0.41.9

[Yazi](https://github.com/sxyazi/yazi) es un gestor de archivos asíncrono para
terminal con vistas previas, múltiples pestañas, operaciones por lotes e
integración con herramientas que SetupVibe ya instala.

## Disponibilidad

SetupVibe instala Yazi en ambas ediciones Desktop:

- macOS, Linux y WSL mediante Homebrew en el Paso 8 de `desktop.sh`
- Windows mediante el paquete oficial `sxyazi.yazi` de WinGet

La instalación valida los dos ejecutables nativos:

- `yazi` abre el gestor de archivos.
- `ya` administra paquetes, plugins y temas de Yazi.

SetupVibe no crea un alias `y` ni un wrapper de shell. Usa directamente el
comando nativo `yazi`.

## Iniciar Yazi

Abre el directorio actual o indica una ruta:

```bash
yazi
yazi ~/proyectos
```

Comprueba los comandos instalados:

```bash
yazi --version
ya --version
```

## Teclas Esenciales

| Tecla                        | Acción                                                               |
| ---------------------------- | -------------------------------------------------------------------- |
| `h`, `j`, `k`, `l` o flechas | Navegar                                                              |
| `Enter`                      | Abrir el archivo o directorio seleccionado                           |
| `Space`                      | Alternar la selección                                                |
| `y`                          | Copiar los elementos seleccionados                                   |
| `x`                          | Cortar los elementos seleccionados                                   |
| `p`                          | Pegar los elementos copiados o cortados                              |
| `a`                          | Crear un archivo; termina el nombre con `/` para crear un directorio |
| `r`                          | Renombrar los elementos seleccionados                                |
| `d`                          | Mover los elementos seleccionados a la papelera                      |
| `.`                          | Alternar archivos ocultos                                            |
| `s`                          | Buscar nombres de archivos con `fd`                                  |
| `S`                          | Buscar contenido de archivos con `ripgrep`                           |
| `z`                          | Navegar con `fzf`                                                    |
| `Z`                          | Navegar con `zoxide`                                                 |
| `F1` o `~`                   | Abrir la ayuda integrada                                             |
| `q`                          | Salir                                                                |

## Integraciones de SetupVibe

SetupVibe también instala `file`, `ffmpeg`, ImageMagick, `jq`, `fd`,
`ripgrep`, `fzf`, `zoxide` y Nerd Fonts donde sean compatibles. Yazi usa estas
herramientas para detectar archivos, generar vistas previas, buscar, navegar y
mostrar iconos.

En Windows, SetupVibe define la variable de entorno de usuario
`YAZI_FILE_ONE` con la ruta de `usr\bin\file.exe` de Git for Windows, como se
requiere para detectar tipos MIME de forma fiable. El modo de desinstalación
restaura el valor anterior mientras siga administrado por SetupVibe.

La configuración del usuario se encuentra en:

- `~/.config/yazi/` en macOS, Linux y WSL
- `%APPDATA%\yazi\config\` en Windows

SetupVibe no modifica esos archivos de configuración del usuario.

## Referencias

- [Repositorio de Yazi](https://github.com/sxyazi/yazi)
- [Guía oficial de instalación](https://yazi-rs.github.io/docs/installation/)
- [Guía oficial de inicio rápido](https://yazi-rs.github.io/docs/quick-start/)

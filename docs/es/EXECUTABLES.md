# Ejecutables de SetupVibe

> Scripts ejecutables auxiliares — v0.41.11

SetupVibe mantiene scripts auxiliares reutilizables en el directorio [`bin/`](../../bin) del repositorio. Durante la instalación, las ediciones Desktop y Server descargan estos archivos directamente desde el repositorio a `~/.setupvibe/bin` y les aplican permisos de ejecución.

## Ubicación de Instalación

| Archivo fuente | Ruta instalada | Ediciones |
| -------------- | -------------- | --------- |
| [`bin/ssh_copy_id`](../../bin/ssh_copy_id) | `~/.setupvibe/bin/ssh_copy_id` | Desktop y Server |

El alias del shell apunta al ejecutable instalado:

```bash
alias ssh_copy_id="$HOME/.setupvibe/bin/ssh_copy_id"
```

Los instaladores descargan el archivo desde:

```text
https://raw.githubusercontent.com/promovaweb/setupvibe/main/bin/ssh_copy_id
```

## `ssh_copy_id`

Copia tu llave pública SSH local a un servidor remoto usando autenticación por contraseña. Crea `~/.ssh/authorized_keys` en el servidor remoto si es necesario, aplica permisos seguros y evita añadir la misma llave dos veces.

### Requisitos

- `ssh`
- `sshpass`
- Una llave pública SSH local, normalmente una de estas:
  - `~/.ssh/id_ed25519.pub`
  - `~/.ssh/id_rsa.pub`
  - `~/.ssh/id_ecdsa.pub`

### Uso

```bash
ssh_copy_id --host HOST --user USUARIO [--pass PASS] [--key ~/.ssh/id_ed25519.pub] [--port 22]
```

### Argumentos

| Argumento | Obligatorio | Predeterminado | Descripción |
| --------- | ----------- | -------------- | ----------- |
| `--host` | Sí | ninguno | Hostname o dirección IP del servidor remoto. |
| `--user` | Sí | ninguno | Usuario SSH remoto. |
| `--pass` | No | prompt | Contraseña SSH remota. Si se omite, el script la pide con entrada oculta. |
| `--key` | No | detección automática | Archivo de llave pública a copiar. Se acepta una ruta de llave privada sin `.pub` si existe el `.pub` correspondiente. |
| `--port` | No | `22` | Puerto SSH remoto. |
| `-h`, `--help` | No | ninguno | Muestra la ayuda de uso. |

### Ejemplos

Pedir la contraseña de forma segura:

```bash
ssh_copy_id --host 192.0.2.10 --user root
```

Pasar la contraseña inline:

```bash
ssh_copy_id --host 192.0.2.10 --user root --pass 'secreto'
```

Usar una llave pública y puerto SSH personalizados:

```bash
ssh_copy_id --host 192.0.2.10 --user deploy --key ~/.ssh/id_rsa.pub --port 2222
```

### Comportamiento

- Usa `sshpass -e` para pasar la contraseña mediante la variable de entorno `SSHPASS` en vez de un argumento directo del comando `sshpass`.
- Usa `StrictHostKeyChecking=accept-new` para aceptar una nueva llave de host en la primera conexión, pero seguir rechazando llaves modificadas.
- Desactiva la autenticación por llave pública durante la copia para garantizar el uso de la contraseña informada.
- Define permisos remotos `700` para `~/.ssh` y `600` para `authorized_keys`.
- Verifica coincidencia exacta antes de añadir la llave, por lo que ejecuciones repetidas son idempotentes.

### Notas de Seguridad

Prefiere omitir `--pass` para que el script pida la contraseña con entrada oculta. Pasar `--pass` inline es útil para automatización, pero puede exponer la contraseña en el historial del shell o en metadatos de proceso según el entorno.

### Solución de Problemas

| Mensaje | Causa | Corrección |
| ------- | ----- | ---------- |
| `sshpass não encontrado` | `sshpass` no está instalado o no está en el `PATH`. | Ejecuta SetupVibe de nuevo o instala `sshpass`. |
| `chave pública SSH não encontrada` | No se encontró ninguna llave pública compatible. | Crea una con `ssh-keygen -t ed25519 -C 'email@ejemplo.com'` o usa `--key`. |
| `informe --pass ou execute em um terminal interativo` | El comando se ejecutó sin `--pass` en un contexto no interactivo. | Pasa `--pass` o ejecútalo desde un terminal interactivo. |
| `Falha ao adicionar a chave SSH` | Falló el login SSH o el comando remoto. | Verifica host, usuario, contraseña, puerto y si la autenticación por contraseña está habilitada en el servidor. |

## Añadir Nuevos Ejecutables

Al añadir otro ejecutable auxiliar:

1. Añade el script en `bin/`.
2. Mantén el shebang en la línea 1.
3. Añade un encabezado con nombre, autor, versión, descripción y ejemplos de uso.
4. Márcalo como ejecutable con `chmod +x`.
5. Añade una referencia directa con `safe_download` en `desktop.sh` y `server.sh`.
6. Añade o actualiza aliases en `conf/zshrc-*.zsh`.
7. Documéntalo en este archivo y actualiza la referencia de aliases si es necesario.
8. Valida con `bash -n`, `zsh -n` y `markdownlint`.

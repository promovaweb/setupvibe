# Orca en un servidor SetupVibe

> Opcional. SetupVibe no instala Orca; esta guía describe una forma probada de ejecutarlo en un servidor preparado por la edición Server.

[Orca](https://www.onorca.dev) ejecuta agentes de código en worktrees y terminales que viven en un servidor. Abres la app de escritorio u Orca Mobile y te conectas a ese servidor, así que cerrar el portátil no detiene los agentes. Esta guía cubre el lado del servidor Linux y cómo llegar a él de forma privada por Tailscale.

## Disponibilidad

| Edición | Sistemas | Estado |
| --- | --- | --- |
| Desktop | macOS, Linux y WSL | No instalado |
| Server | Distribuciones Linux compatibles | No instalado |
| Windows (Beta) | Windows nativo | No instalado |

Los pasos siguientes se probaron en Debian 13 (amd64) con Orca 1.4.247. Otras distribuciones, ARM y el servidor dentro de un contenedor no se probaron. Los servidores remotos de Orca son una función beta, así que consulta la [documentación de Orca](https://www.onorca.dev/docs/remote-servers) si algún comando se comporta de otra manera.

## Antes de empezar

- Ejecuta primero la edición Server. Instala Tailscale, Docker y las CLI de IA que usa esta guía.
- Une el servidor, tu computadora y tu teléfono a la misma red de Tailscale.
- Usa un usuario común con `sudo`, no `root`. El servidor de Orca se ejecuta como ese usuario.

## Instalar el servidor

Descarga el paquete `.deb` de tu arquitectura desde la página de [releases de Orca](https://github.com/stablyai/orca/releases). El archivo se llama `orca-ide_<versión>_amd64.deb`.

Comprueba el archivo antes de instalarlo, porque el paquete se ejecuta con `sudo`. Cada release de Orca publica el SHA-256 de sus archivos. Imprime el valor publicado y el valor del archivo que descargaste:

```bash
curl -fsSL https://api.github.com/repos/stablyai/orca/releases/tags/v<versión> \
    | jq -r '.assets[] | select(.name == "orca-ide_<versión>_amd64.deb") | .digest'
sha256sum orca-ide_<versión>_amd64.deb
```

El primer comando imprime `sha256:` seguido del hash. El hash debe ser el mismo en las dos salidas. Si son diferentes, borra el archivo y no lo instales.

```bash
sudo apt-get install -y ./orca-ide_<versión>_amd64.deb xvfb
orca-ide --version
```

`xvfb` ofrece una pantalla virtual para el servidor sin monitor. En Linux el comando es `orca-ide`, y no `orca`, para no chocar con el lector de pantalla de GNOME.

## Ejecutarlo como servicio

Activa el lingering para que el servicio del usuario siga en ejecución después de cerrar la sesión, y luego instala el servicio:

```bash
loginctl enable-linger "$USER"
orca-ide serve service install --port 6768
orca-ide serve service status
```

El servicio ejecuta `orca serve --supervise --no-pairing` y lo reinicia si se detiene. El puerto tarda unos 20 segundos en abrirse:

```bash
ss -ltn | grep 6768
```

## Mantener el puerto privado

El servidor escucha en todas las interfaces y lo avisa en su propia salida. Quien alcance el puerto 6768 puede intentar emparejar, así que permítelo solo por Tailscale.

La edición Server no instala ni activa un firewall. Una regla guardada con `ufw` inactivo no tiene efecto, y el puerto sigue abierto en internet. Instala `ufw`, permite SSH antes de activar el firewall para no perder el acceso al servidor, y después permite el puerto de Orca solo en la interfaz de Tailscale:

```bash
sudo apt-get install -y ufw
sudo ufw allow OpenSSH
sudo ufw default deny incoming
sudo ufw allow in on tailscale0 to any port 6768 proto tcp
sudo ufw enable
sudo ufw status verbose
```

El estado debe mostrar `Status: active`, el valor predeterminado `deny (incoming)` y las dos reglas. Si accedes al servidor por SSH solo por Tailscale, cambia `sudo ufw allow OpenSSH` por `sudo ufw allow in on tailscale0 to any port 22 proto tcp`.

`ufw default deny incoming` cierra todos los demás puertos que no tienen regla. Crea una regla para cada servicio que esta máquina publica en internet, como los puertos 80 y 443 de un servidor web. Los puertos publicados por contenedores Docker no pasan por `ufw`, así que este cambio no los cierra.

Compruébalo desde dos lugares. Por la dirección de Tailscale el servidor debe responder, y por la dirección pública no:

```bash
curl -s -m 6 -o /dev/null -w "%{http_code}\n" http://<ip-de-tailscale>:6768/
curl -s -m 6 -o /dev/null -w "%{http_code}\n" http://<ip-publica>:6768/
```

El primer comando imprime `200`. El segundo agota el tiempo e imprime `000`. Ejecuta el segundo en una máquina que no esté en tu red de Tailscale.

## Emparejar las apps

El servicio no imprime el enlace de emparejamiento. Para crear uno, detén el servicio, ejecuta el servidor en primer plano y copia la línea `Pairing URL`:

```bash
systemctl --user stop orca-serve
orca-ide serve --port 6768 --pairing-address <ip-de-tailscale>
```

Para el teléfono, añade `--mobile-pairing`. Trata el enlace como una contraseña y no lo pegues en chats ni en issues. Caduca a los pocos minutos.

En la app de escritorio, abre Settings, después Remote Orca Servers, elige Add Server y pega el enlace. En Orca Mobile, elige Pair y pégalo, con Tailscale encendido. Un dispositivo emparejado guarda su propio token, así que no hace falta emparejar de nuevo después de un reinicio.

Detén el servidor en primer plano con `Ctrl+C` e inicia el servicio otra vez:

```bash
systemctl --user start orca-serve
```

Empareja todos los dispositivos antes de abrir terminales. Reiniciar el servidor matando todos los procesos del usuario también cierra los terminales y los agentes que se ejecutan en ellos. El historial de las conversaciones permanece en el disco.

## Organizar proyectos

Usa Add Project en una carpeta del servidor que contenga varios repositorios Git. Orca ofrece importarlos como un grupo, que funciona como un espacio con nombre en la barra lateral. Abre un terminal dentro de cada repositorio e inicia el agente ahí, para que se encuentren las instrucciones del propio proyecto.

## Solución de problemas

| Síntoma | Verificación |
| --- | --- |
| `orca: command not found` | Usa `orca-ide` en Linux. |
| `claude: command not found` en un terminal de Orca | El terminal se abrió en `bash`, y el `PATH` está definido en `.zshrc`. Define el shell del servicio como se describe abajo. |
| El puerto no se abre | Espera unos 20 segundos y lee `journalctl --user -u orca-serve -n 30`. |
| La app no conecta | Confirma que Tailscale está encendido en los dos dispositivos y que la dirección de Tailscale responde en el puerto 6768. |
| Los terminales se sienten lentos | Mide primero el `ping` hasta el servidor. Casi siempre la causa es la distancia y la ruta de red entre tú y el servidor, no Orca. |

### Elegir el shell de los terminales

Orca abre los terminales en el shell indicado por la variable `SHELL` del servicio. Si está vacía, los terminales se abren en `bash`. Para usar `zsh`:

```bash
mkdir -p ~/.config/systemd/user/orca-serve.service.d
printf '[Service]\nEnvironment=SHELL=/usr/bin/zsh\n' > ~/.config/systemd/user/orca-serve.service.d/shell.conf
systemctl --user daemon-reload
systemctl --user restart orca-serve
```

Los terminales que ya estaban abiertos mantienen el shell anterior hasta que los cierres.

## Lecturas adicionales

- [Documentación de Orca](https://www.onorca.dev/docs)
- [Servidores remotos de Orca](https://www.onorca.dev/docs/remote-servers)
- [Índice de la documentación de SetupVibe](../README.md)

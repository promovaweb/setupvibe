# Orca on a SetupVibe Server

> Optional. SetupVibe does not install Orca; this guide describes one tested way to run it on a server prepared by the Server edition.

[Orca](https://www.onorca.dev) runs coding agents in worktrees and terminals that live on a server. You open the Orca desktop app or the Orca Mobile app and connect to that server, so closing your laptop does not stop the agents. This guide covers the Linux server side and how to reach it privately through Tailscale.

## Availability

| Edition | Systems | Status |
| --- | --- | --- |
| Desktop | macOS, Linux, and WSL | Not installed |
| Server | Supported Linux distributions | Not installed |
| Windows (Beta) | Native Windows | Not installed |

The steps below were tested on Debian 13 (amd64) with Orca 1.4.247. Other distributions, ARM, and running the server inside a container were not tested. Orca's remote servers are a beta feature, so check the [Orca documentation](https://www.onorca.dev/docs/remote-servers) if a command behaves differently.

## Before You Start

- Run the Server edition first. It installs Tailscale, Docker, and the AI CLIs this guide relies on.
- Join the server, your computer, and your phone to the same Tailscale network.
- Use a regular user with `sudo`, not `root`. The Orca server runs as that user.

## Install the Server

Download the `.deb` package for your architecture from the [Orca releases](https://github.com/stablyai/orca/releases) page. The file is named `orca-ide_<version>_amd64.deb`.

```bash
sudo apt-get install -y ./orca-ide_<version>_amd64.deb xvfb
orca-ide --version
```

`xvfb` provides a virtual display for the headless server. On Linux the command is `orca-ide`, not `orca`, so it does not clash with the GNOME screen reader.

## Run It as a Service

Turn on lingering so the user service keeps running after you log out, then install the service:

```bash
loginctl enable-linger "$USER"
orca-ide serve service install --port 6768
orca-ide serve service status
```

The service starts `orca serve --supervise --no-pairing` and restarts it if it stops. It takes about 20 seconds to open the port:

```bash
ss -ltn | grep 6768
```

## Keep the Port Private

The server listens on all interfaces and warns about it in its own output. Anyone who can reach port 6768 can try to pair, so allow it only through Tailscale. With `ufw`:

```bash
sudo ufw allow in on tailscale0 to any port 6768 proto tcp
```

Check it from two places. Through the Tailscale address the server must answer, and through the public address it must not:

```bash
curl -s -m 6 -o /dev/null -w "%{http_code}\n" http://<tailscale-ip>:6768/
curl -s -m 6 -o /dev/null -w "%{http_code}\n" http://<public-ip>:6768/
```

The first command prints `200`. The second times out and prints `000`. Run the second one from a machine that is not on your Tailscale network.

## Pair the Apps

The service does not print a pairing link. To create one, stop the service, run the server in the foreground, and copy the `Pairing URL` line:

```bash
systemctl --user stop orca-serve
orca-ide serve --port 6768 --pairing-address <tailscale-ip>
```

For the phone, add `--mobile-pairing`. Treat the link like a password and do not paste it into chats or issues. It expires after a few minutes.

In the desktop app, open Settings, then Remote Orca Servers, choose Add Server, and paste the link. In Orca Mobile, choose Pair and paste it, with Tailscale turned on. A paired device keeps its own token, so pairing again is not needed after a restart.

Stop the foreground server with `Ctrl+C` and start the service again:

```bash
systemctl --user start orca-serve
```

Pair every device before you open terminals. Restarting the server by killing all of the user's processes also closes the terminals and the agents running in them. The conversation history stays on disk.

## Organize Projects

Use Add Project on a server folder that contains several Git repositories. Orca offers to import them as a group, which works like a named space in the sidebar. Open a terminal inside each repository and start your agent there, so the project's own instructions are found.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `orca: command not found` | Use `orca-ide` on Linux. |
| `claude: command not found` in an Orca terminal | The terminal opened in `bash`, and the `PATH` is set in `.zshrc`. Set the shell for the service as described below. |
| The port does not open | Wait about 20 seconds, then read `journalctl --user -u orca-serve -n 30`. |
| The app cannot connect | Confirm Tailscale is on for both devices and that the Tailscale address answers on port 6768. |
| Terminals feel slow | Measure `ping` to the server first. Distance and the network path between you and the server usually cause it, not Orca. |

### Choose the Shell for Terminals

Orca opens terminals in the shell named by the `SHELL` variable of the service. If it is empty, terminals open in `bash`. To use `zsh`:

```bash
mkdir -p ~/.config/systemd/user/orca-serve.service.d
printf '[Service]\nEnvironment=SHELL=/usr/bin/zsh\n' > ~/.config/systemd/user/orca-serve.service.d/shell.conf
systemctl --user daemon-reload
systemctl --user restart orca-serve
```

Terminals that were already open keep their old shell until you close them.

## Further Reading

- [Orca documentation](https://www.onorca.dev/docs)
- [Remote Orca Servers](https://www.onorca.dev/docs/remote-servers)
- [SetupVibe documentation index](../README.md)

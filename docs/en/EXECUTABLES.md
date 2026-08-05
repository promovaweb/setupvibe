# SetupVibe Executables

> Helper executable scripts — v0.41.11

SetupVibe keeps reusable helper scripts in the repository [`bin/`](../../bin) directory. During installation, Desktop and Server editions download these files directly from the repository into `~/.setupvibe/bin` and make them executable.

## Install Location

| Source file | Installed path | Editions |
| ----------- | -------------- | -------- |
| [`bin/ssh_copy_id`](../../bin/ssh_copy_id) | `~/.setupvibe/bin/ssh_copy_id` | Desktop and Server |

The shell alias points to the installed executable:

```bash
alias ssh_copy_id="$HOME/.setupvibe/bin/ssh_copy_id"
```

The installers download the file from:

```text
https://raw.githubusercontent.com/promovaweb/setupvibe/main/bin/ssh_copy_id
```

## `ssh_copy_id`

Copies your local public SSH key to a remote server using password authentication. It creates `~/.ssh/authorized_keys` on the remote host if needed, applies secure permissions, and avoids adding the same key twice.

### Requirements

- `ssh`
- `sshpass`
- A local public SSH key, usually one of:
  - `~/.ssh/id_ed25519.pub`
  - `~/.ssh/id_rsa.pub`
  - `~/.ssh/id_ecdsa.pub`

### Usage

```bash
ssh_copy_id --host HOST --user USER [--pass PASS] [--key ~/.ssh/id_ed25519.pub] [--port 22]
```

### Arguments

| Argument | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `--host` | Yes | none | Remote server hostname or IP address. |
| `--user` | Yes | none | Remote SSH username. |
| `--pass` | No | prompt | Remote SSH password. If omitted, the script asks for it with hidden input. |
| `--key` | No | auto-detect | Public key file to copy. A private key path without `.pub` is accepted if the matching `.pub` file exists. |
| `--port` | No | `22` | Remote SSH port. |
| `-h`, `--help` | No | none | Prints usage help. |

### Examples

Prompt for the password securely:

```bash
ssh_copy_id --host 192.0.2.10 --user root
```

Pass the password inline:

```bash
ssh_copy_id --host 192.0.2.10 --user root --pass 'secret'
```

Use a custom public key and SSH port:

```bash
ssh_copy_id --host 192.0.2.10 --user deploy --key ~/.ssh/id_rsa.pub --port 2222
```

### Behavior

- Uses `sshpass -e` so the password is passed through the `SSHPASS` environment variable instead of as an `sshpass` command argument.
- Uses `StrictHostKeyChecking=accept-new` to accept a new host key on first connection while still rejecting changed host keys.
- Disables public-key authentication for the copy step so the provided password is used.
- Sets remote `~/.ssh` permissions to `700` and `authorized_keys` permissions to `600`.
- Checks for an exact key match before appending, so repeated runs are idempotent.

### Security Notes

Prefer omitting `--pass` so the script asks for the password with hidden input. Passing `--pass` inline is convenient for automation, but it can expose the password in shell history or process metadata depending on the environment.

### Troubleshooting

| Message | Cause | Fix |
| ------- | ----- | --- |
| `sshpass não encontrado` | `sshpass` is not installed or not in `PATH`. | Run SetupVibe again or install `sshpass`. |
| `chave pública SSH não encontrada` | No supported public key was found. | Create one with `ssh-keygen -t ed25519 -C 'email@example.com'` or pass `--key`. |
| `informe --pass ou execute em um terminal interativo` | The command ran without `--pass` in a non-interactive context. | Pass `--pass` or run from an interactive terminal. |
| `Falha ao adicionar a chave SSH` | SSH login failed or the remote command failed. | Check host, user, password, port, and whether password authentication is enabled on the server. |

## Adding New Executables

When adding another helper executable:

1. Add the script to `bin/`.
2. Keep the shebang on line 1.
3. Add a header with name, author, version, description, and usage examples.
4. Mark it executable with `chmod +x`.
5. Add a direct `safe_download` reference in both `desktop.sh` and `server.sh`.
6. Add or update shell aliases in `conf/zshrc-*.zsh`.
7. Document it in this file and update the alias reference if needed.
8. Validate with `bash -n`, `zsh -n`, and `markdownlint`.

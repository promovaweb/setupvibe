# Troubleshooting

`{{bin}} doctor` is the first command in any failure: it checks the runtime, the
`init`, the items, the PATH, the shell block, the Windows state and the
SetupVibe 1 leftovers, and shows the command that fixes each finding. The
sections below cover the situations the code handles, with the symptom, the
cause, the command and the exit code involved.

| Symptom | Go to |
| --- | --- |
| `sudo asks for a password` or nothing happens without a terminal | [Sudo without a password](#sudo-without-a-password) |
| `Another SetupVibe run is in progress` | [Another run in progress](#another-run-in-progress) |
| a download fails behind a proxy or a corporate CA | [Proxy and CA](#proxy-and-ca) |
| `github.com unreachable` or the clock is off | [Network and clock](#network-and-clock) |
| `5 GB needed` | [Disk](#disk) |
| a tool with status `other` and a different version | [Tool from another manager](#tool-from-another-manager) |
| `N of M steps failed` | [Partial failure](#partial-failure) |
| `SetupVibe 1 found` | [SetupVibe 1 on the machine](#setupvibe-1-on-the-machine) |
| `! Restart needed` at the end of `auto` | [Pending restart](#pending-restart) |
| `containers publish ports on every interface` | [Container published on every interface](#container-published-on-every-interface) |
| `aliases not defined because a command has the same name` | [Aliases that were not created](#aliases-that-were-not-created) |
| `settings.json does not contain valid JSON` | [Invalid settings.json](#invalid-settingsjson) |
| `Run: <bin> upgrade` when reading a state file | [Newer state version](#newer-state-version) |
| MCP tool with `isError: true` | [MCP tool returns isError](#mcp-tool-returns-iserror) |
| a command in a pipe prints the help and exits with 2 | [No terminal](#no-terminal) |

## Sudo without a password

**Symptom.** `auto` stops with `sudo asks for a password. auto needs
passwordless sudo` even in a terminal. `init`, `migrate` and `shell apply` stop
with `sudo asks for a password and there is no terminal to type it` when there
is no terminal to type the password.

**Cause.** Every privileged step runs with `sudo -n`. `auto` requires the
passwordless rule from the start and never opens a prompt. `init`, `migrate` and
`shell apply` ask for the password once in a terminal and continue with the
cached credentials; without a terminal, they stop before changing the machine.

**Command.** Create the SetupVibe rule for the working user. In a terminal,
`sudo -v` first keeps the credential cached, and the `sudo -n` of the next run
passes:

```bash
{{bin}} user nopasswd deploy
sudo -v && {{bin}} auto --user deploy
{{bin}} auto --user deploy --keep-nopasswd
```

To remove the rule later:

```bash
{{bin}} user nopasswd deploy --remove
```

**Exit code.** 13 (`SUDO_PASSWORD`). `auto --keep-nopasswd` keeps the temporary
rule it created itself.

## Another run in progress

**Symptom.** `✗ Another SetupVibe run is in progress.`

**Cause.** `auto` writes its PID to `~/.setupvibe/run.lock`, and only one run
changes the machine at a time. A lock from a process that no longer exists is
taken over automatically; a lock from a live process refuses the second run.

**Command.** Check the PID and wait, or remove the lock when the owner is gone:

```bash
cat ~/.setupvibe/run.lock
ps -p "$(cat ~/.setupvibe/run.lock)"
rm ~/.setupvibe/run.lock
```

**Exit code.** 30 (`LOCKED`).

## Proxy and CA

**Symptom.** A download, `apt`, `mise`, `npm` or `pip` fails with a TLS or
certificate error, and the same address opens in the browser.

**Cause.** The corporate network requires a proxy, its own CA or both. The
binary passes `HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` and `ALL_PROXY` to the
commands, including those that run with `sudo`, and exports `SETUPVIBE_CA_FILE`
to Node, Bun, curl, Git, Python and pip.

**Command.** Pass the CA and the proxy in the run, or store both in
`~/.setupvibe/config.json` to apply always:

```bash
{{bin}} auto --ca-file /etc/ssl/certs/corp.pem --cache-dir /srv/setupvibe-cache
HTTPS_PROXY=http://proxy.company:3128 {{bin}} install node
cat ~/.setupvibe/config.json
$EDITOR ~/.setupvibe/config.json
```

The `config.json` block looks like this:

```json
{ "network": { "caFile": "/etc/ssl/certs/corp.pem", "cacheDir": "/srv/setupvibe-cache" } }
```

**Exit code.** 5 (`NETWORK_OR_API`) when the TLS failure becomes a download
failure. A CA accepted by one tool only usually shows up as a failed step, with
10 (`PARTIAL`).

## Network and clock

**Symptom.** `✗ github.com unreachable` in `auto`, or a check warning that the
clock is more than five minutes off.

**Cause.** Every SetupVibe download comes from GitHub. Without network, `init`
and `auto` stop at the check. With the clock off, TLS and checksum verification
fail even with a good network.

**Command.** Check DNS, proxy and clock, and use the cache when the machine has
no outbound access:

```bash
{{bin}} system
{{bin}} auto --skip-network-check --cache-dir /srv/setupvibe-cache
sudo timedatectl set-ntp true
```

With a warm cache, a download pinned in the inventory installs without network.
`--skip-network-check` skips only the network and clock check, not the
downloads.

**Exit code.** 5 (`NETWORK_OR_API`) for the network, 1 (`GENERIC_ERROR`) for the
clock outside the tolerance.

## Disk

**Symptom.** `✗ 3.2 GB free, 10 GB needed`.

**Cause.** `init` and `auto` require 5 GB free in the user folder. That is the
room for the downloads, Docker and the item caches.

**Command.** Free space and run again. To see what takes the folder:

```bash
df -h ~
du -sh ~/* | sort -h | tail
{{bin}} auto --cache-dir /other/disk/setupvibe-cache
```

**Exit code.** 14 (`DISK_SPACE`). Moving the cache to another disk reduces the
space needed in the user folder.

## Tool from another manager

**Symptom.** An item shows status `other` in `list` and in the TUI, and the
installed version is not the pinned one. `doctor` shows
`the command in PATH comes from /usr/bin/... not from mise`.

**Cause.** SetupVibe installs through mise into its own folders and does not
overwrite a tool that came from APT, Homebrew, npm or the vendor installer. It
shows where the current copy comes from and installs its own next to it.

**Command.** Choose one way out: remove the other copy, or put the mise shims
first in the PATH.

```bash
{{bin}} list --check
command -v node
{{bin}} install node
{{bin}} doctor
```

**Exit code.** 0 when the side installation finishes. A failed item shows up as
10 (`PARTIAL`), and `doctor` with a fail finding returns 3 (`CONFIG`).

## Partial failure

**Symptom.** `✗ 3 of 42 steps failed. Log: ~/.setupvibe/logs/...`

**Cause.** A failing step does not stop the others. The outcome goes to the run
log and to `~/.setupvibe/last-run.json`, with a status per item.

**Command.** Read the failure in the log, fix the cause and repeat only what is
missing:

```bash
{{bin}} doctor
{{bin}} install node python --force
{{bin}} check
tail -n 40 "$(ls -t ~/.setupvibe/logs/*.log | head -1)"
```

**Exit code.** 10 (`PARTIAL`). The rest of the plan stayed applied; there is no
need to start over. The TUI shows the same events in the Logs module.

## SetupVibe 1 on the machine

**Symptom.** `doctor` shows `! SetupVibe 1 found: ~/.zshrc from SetupVibe 1;
~/.tmux.conf from SetupVibe 1; ...` and the Home suggests the migration.

**Cause.** The machine was set up by SetupVibe 1 (0.41.x). `auto`, `shell
apply` and `doctor --fix` convert the files before writing the block, but
`migrate` does the full conversion, with a backup, and handles the duplicates.

**Command.** Review the plan and then migrate; the full guide is in
[migration.md](migration.md).

```bash
{{bin}} migrate --dry-run
{{bin}} migrate
{{bin}} migrate --remove-legacy all
```

**Exit code.** 0 when the migration finishes, 10 (`PARTIAL`) when a step fails,
13 (`SUDO_PASSWORD`) without a terminal for `sudo`.

## Pending restart

**Symptom.** `auto` ends with `! Restart needed` and exit code 20.

**Cause.** Linux creates `/var/run/reboot-required` when a package requires a
restart. `auto` does not restart on its own without `--reboot`.

**Command.** Restart and run again, or ask for the automatic resume:

```bash
test -f /var/run/reboot-required && echo "restart pending"
{{bin}} auto --reboot
```

**Exit code.** 20 (`REBOOT_PENDING`). With `--reboot`, `auto` installs a
one-shot systemd unit that resumes the plan after the restart.

## Container published on every interface

**Symptom.** `doctor` warns
`containers publish ports on every interface: portainer 0.0.0.0:9443->9443/tcp`.

**Cause.** Docker writes its own iptables rules and does not go through UFW. A
`-p 9443:9443` stays open to the internet, even with the firewall on.

**Command.** Publish on the local interface and reach the service through SSH
or Tailscale:

```bash
docker ps --format '{{.Names}}  {{.Ports}}'
docker run -d --name app -p 127.0.0.1:8080:8080 my/image
```

**Exit code.** 0 in `doctor` when it is the only finding, because it is a
warning; 3 (`CONFIG`) when a fail finding comes with it.

## Aliases that were not created

**Symptom.** `doctor` warns
`aliases not defined because a command has the same name: dc (/usr/bin/dc)`.

**Cause.** Every alias goes through `_sv_alias`, which defines the name only
when no alias, function or installed command answers to it. Your configuration
and the real programs take priority.

**Command.** Check what answers to the name and choose another one in the
`.local` file:

```bash
type dc
{{bin}} doctor
echo 'alias dcx="docker compose"' >> ~/.zshrc.local
exec $SHELL -l
```

**Exit code.** 0, because the finding is a warning.

## Invalid settings.json

**Symptom.** `✗ ~/.setupvibe/settings.json does not contain valid JSON.` or
`✗ "tui.theme" accepts only: night, day; got "dusk".`

**Cause.** The file is JSON with two-space indentation, and enum and boolean
values go through the schema conversion before being written.

**Command.** Read the file, fix the value or go back to the default:

```bash
{{bin}} config list
{{bin}} config schema
{{bin}} config unset tui.theme
{{bin}} config set tui.theme night
```

**Exit code.** 3 (`CONFIG`). A permission error on the file returns 7
(`PERMISSION`).

## Newer state version

**Symptom.** `config.json uses schema 2, newer than this SetupVibe (1). Run:
{{bin}} upgrade`, with the name of the running binary.

**Cause.** A newer binary wrote the state file. The older binary refuses to read
a format it does not know, instead of corrupting the file.

**Command.** Update the binary; the state files stay valid.

```bash
{{bin}} upgrade --check
{{bin}} upgrade
```

**Exit code.** The refusal happens at the start of any command and appears on
stderr; `upgrade` returns 0 when it finishes.

## MCP tool returns isError

**Symptom.** An MCP tool returns `isError: true` and the agent cannot tell
whether the operation ran.

**Cause.** `isError` appears when the CLI exit code is not zero or when the tool
refuses the call. `doctor` with a fail finding returns 3, `check` with an item
off its version returns 10, `install` without `init` returns 3, and `remove` and
`migrate` without `confirm` return 2 without running anything.

**Command.** Read `exitCode` and `data` before `isError`, check the run log and
use the CLI when the fix requires a confirmation in the terminal:

```bash
{{bin}} mcp --list
{{bin}} doctor
{{bin}} logs
```

**Exit code.** The same as the operation: 2 for the local refusal, 3 for
configuration or `doctor` with a fail, 10 for a partial failure and 13 when
`sudo` asks for a password. The tool does not change the code.

## No terminal

**Symptom.** A script runs `{{bin}}` without arguments and receives the help with
exit code 2. `tui` in a pipe returns 8.

**Cause.** Without arguments, the binary opens the TUI only in an interactive
terminal. In a pipe, it prints the help and exits with 2 so it does not hang.
The `tui` command requires stdin and stdout in a TTY and returns 8 outside one.

**Command.** Use the CLI with `--json`, which is the path for scripts and
agents:

```bash
{{bin}} system --json
{{bin}} list --json
```

**Exit code.** 2 (`USAGE`) for the binary without arguments in a pipe; 8
(`NO_TTY`) for `tui`.

## Two editions on the same machine

**Symptom.** `✗ the desktop edition is already set up on this machine`, or
`doctor` warns that both editions are installed.

**Cause.** `setupvibe` and `setupvibe-server` share `~/.setupvibe/` and the
`SETUPVIBE_` prefix. Only one edition can stay installed on a machine.

**Command.** Remove the edition that will not stay, keeping the data if you need
it:

```bash
setupvibe self uninstall --yes --keep-data
setupvibe-server init
```

**Exit code.** 2 (`USAGE`) in the `init` and `auto` of the edition that cannot
run.

## PATH and the shell block

**Symptom.** `! ~/.local/bin is not in this shell's PATH yet`, or `! the
SetupVibe shell block is missing`. An installed command is not found.

**Cause.** The shell block is written between `# >>> setupvibe >>>` and
`# <<< setupvibe <<<` and only applies in a new shell. `doctor --fix` converts
the SetupVibe 1 files and recreates the block and the folder.

**Command.** Apply the block and open a new shell:

```bash
{{bin}} doctor --fix
{{bin}} shell apply
exec $SHELL -l
```

**Exit code.** 0 when the block is reapplied; 10 (`PARTIAL`) when a plan step
fails.

# Herdr in SetupVibe

> Agent multiplexer installed by the Desktop and Server editions.

[Herdr](https://github.com/herdrdev/herdr) organizes coding agents in persistent terminal workspaces. Each workspace can contain tabs and panes, while the sidebar shows whether a detected agent is working, waiting for input, finished, or idle.

## Availability

| Edition | Systems | Status |
| --- | --- | --- |
| Desktop | macOS, Linux, and WSL | Installed |
| Server | Supported Linux distributions | Installed |
| Windows (Beta) | Native Windows | Not installed |

The SetupVibe Windows edition does not install Herdr because native Windows support remains a preview in the upstream project. You can use the Desktop edition inside WSL when you need the stable Linux binary on Windows.

## How SetupVibe Installs Herdr

The Desktop and Server installers read the official manifest at `https://herdr.dev/latest.json`, select the binary for the detected operating system and architecture, and accept only assets published under the official upstream GitHub releases path.

The selected binary passes the existing SetupVibe download checks before it is installed at:

```text
~/.local/bin/herdr
```

SetupVibe then runs `herdr --version` with the target user's `PATH`. A failed download, an unsupported architecture, an unexpected asset URL, or an invalid command stops the current installation step.

Running SetupVibe again checks the current manifest and replaces the managed binary with the latest stable release available for the machine.

## Start Your First Session

Open a project directory and start Herdr:

```bash
cd ~/projects/my-project
herdr
```

Herdr creates or attaches to the default background session. Start a coding agent inside a pane with its normal command:

```bash
codex
```

You can also run `claude`, `copilot`, or another agent supported by Herdr. Agent authentication, permissions, and project instructions remain the responsibility of each CLI and repository.

## Essential Commands

| Command | Purpose |
| --- | --- |
| `herdr` | Creates or attaches to the default session. |
| `herdr --version` | Shows the installed version. |
| `herdr --help` | Lists the available commands and options. |
| `herdr config check` | Validates the Herdr configuration. |
| `herdr update` | Updates an installation managed by Herdr's installer. |
| `herdr server stop` | Stops the default server and the processes running in its panes. |

Rerunning SetupVibe is the preferred way to refresh the binary managed by SetupVibe. Use `herdr update` only when you intentionally want Herdr to manage its own update.

## Keyboard Basics

Herdr uses `Ctrl+B` as its default prefix. Press the prefix, release it, and then press the action key.

| Action | Shortcut |
| --- | --- |
| Split right | `prefix` then `v` |
| Split down | `prefix` then `-` |
| New tab | `prefix` then `c` |
| Next or previous tab | `prefix` then `n` or `p` |
| Workspace navigation | `prefix` then `w` |
| Detach the client | `prefix` then `q` |
| Show active bindings | `prefix` then `?` |

Detaching or closing the terminal leaves the Herdr server and pane processes running. Run `herdr` again to return to the same session.

## Herdr and Tmux

SetupVibe continues to install tmux in the Desktop and Server editions. Herdr focuses on workspaces and status visibility for coding agents, while tmux remains useful for general shell sessions, established remote workflows, and the plugin configuration already provided by SetupVibe.

Use one multiplexer as the outer session for a given workflow. Nesting Herdr inside tmux, or tmux inside Herdr, adds another prefix and input layer that can make shortcuts and mouse behavior harder to diagnose.

## Updates and Running Sessions

An update that changes the Herdr client/server protocol can require a server restart. Read the update message before stopping the server because:

```bash
herdr server stop
```

also terminates the processes running in the session panes. Detach with `prefix` then `q` when you only want to leave the interface without stopping agents.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `herdr: command not found` | Open a new shell and confirm that `~/.local/bin` is present in `PATH`. |
| SetupVibe cannot find an asset | Confirm that the machine uses x86_64 or ARM64 and can reach `herdr.dev` and GitHub. |
| A coding agent is not detected | Confirm that the agent runs directly inside a Herdr pane and consult the supported-agent documentation. |
| Shortcuts reach the wrong program | Check for a nested multiplexer or custom terminal bindings using the same prefix. |
| The client reports a protocol mismatch | Finish current work, stop the affected Herdr server, and start Herdr again with the updated binary. |

## Further Reading

- [Herdr source repository](https://github.com/herdrdev/herdr)
- [Herdr documentation](https://herdr.dev/docs/)
- [SetupVibe documentation index](../README.md)

# Environment configuration

`shared/shell/config.ts` configures the shell, prompt and tmux (spec section
7). `auto` applies it after the items; `shell apply` runs it on demand and
`shell remove` takes it out.

## Rules

- User files are edited only between `# >>> setupvibe >>>` and
  `# <<< setupvibe <<<`. An update replaces the block; removal deletes only
  the block.
- Before the first change, the original file is copied to
  `~/.setupvibe/backups/` (`<file>.first` plus a timestamped copy).
- Personal settings go in `~/.zshrc.local`, `~/.bashrc.local` and
  `~/.tmux.conf.local`, created empty and never overwritten.
- The aliases live in `~/.setupvibe/shell/aliases.sh` (valid in ZSH and
  Bash). The aliases that start agents with every permission (`cc`, `cx`,
  `oc`) live in `aliases-agents.sh`; set `shell.agentAliases` to `false`
  in config.json to leave them out.

## Per system

| System | File | Content |
| --- | --- | --- |
| Debian, Ubuntu, Mint, Zorin, Arch, macOS, server | `~/.zshrc` | PATH, `mise activate`, Oh My Zsh with plugins, zoxide, Starship, aliases, `~/.zshrc.local` |
| Omarchy | `~/.bashrc` | PATH, `STARSHIP_CONFIG` pointing at `~/.config/setupvibe/starship.toml`, aliases, `~/.bashrc.local`; Omarchy's own files stay untouched |
| All with tmux (not Omarchy) | `~/.tmux.conf` | loads `~/.setupvibe/shell/tmux.conf` (plugins, theme, keys), which loads `~/.tmux.conf.local` before TPM |

Starship gets the gruvbox-rainbow preset when no config exists. On Linux, ZSH
becomes the login shell with `chsh`.

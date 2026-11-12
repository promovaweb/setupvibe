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
  Bash). Each one goes through `_sv_alias`, which defines it only when no
  alias, shell function or installed command answers to that name, so your
  setup always wins and no alias hides a real program; `df` is the one alias
  that wraps its own command on purpose. `setupvibe doctor` lists the aliases
  skipped on the machine. Names that hid common programs were renamed:
  `gs` → `gstat` (Ghostscript), `ci` → `cin` (RCS), `ts` → `tsv`
  (moreutils), `dc` → `dco` (the dc calculator), `gofmt` → `gofmtw` (it changed
  what the real `gofmt` does). `pn` and `pnx` are skipped quietly when pnpm
  ships commands with those names, since they do the same.
- The aliases that start agents with every permission live in
  `aliases-agents.sh`: `cco` (Claude Code; `cc` is the C compiler), `cxo`
  (`codex --yolo`) and `oco` (`opencode --auto`), plus the old `cx` and `oc`.
  `setupvibe config set shell.agentAliases false` followed by
  `setupvibe shell apply` leaves them out.

## Per system

| System | File | Content |
| --- | --- | --- |
| Debian, Ubuntu, Mint, Zorin, Arch, macOS, server | `~/.zshrc` | PATH, `mise activate`, Oh My Zsh with plugins, zoxide, Starship, aliases, `~/.zshrc.local` |
| Omarchy | `~/.bashrc` | PATH, `STARSHIP_CONFIG` pointing at `~/.config/setupvibe/starship.toml`, aliases, `~/.bashrc.local`; Omarchy's own files stay untouched |
| All with tmux (not Omarchy) | `~/.tmux.conf` | loads `~/.setupvibe/shell/tmux.conf` (plugins, theme, keys), which loads `~/.tmux.conf.local` before TPM |

Starship gets the gruvbox-rainbow preset when no config exists. On Linux, ZSH
becomes the login shell with `chsh`.

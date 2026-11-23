# Documentation for {{title}}

Use `setupvibe <edition> <command>` to choose the edition for that
invocation. Without an explicit edition, the CLI uses the saved edition
and reports it on stderr. Edition commands exit with code 15
(`EDITION_REQUIRED`) if neither is available. On Windows and macOS, where only Desktop runs, a command without an edition uses Desktop. Run
`setupvibe edition set <edition>` to save a choice. In the TUI, press `E` to
open the edition menu.

Omarchy adds packages through `omarchy pkg add` and uses the Bash block for
SetupVibe aliases and completion. It keeps the shell, prompt, Tmux, Docker
and existing mise configuration managed by Omarchy. Tools supplied by
Omarchy appear as preinstalled in `{{bin}} list`.

PHP is pinned to 8.6.0 and installed by mise into a separate SetupVibe
directory. Run it explicitly to leave existing PHP installations in place.

```bash
{{bin}} init
{{bin}} install php
{{bin}} check php
MISE_DATA_DIR="$HOME/.setupvibe/omarchy/mise" mise exec php@8.6.0 -- php --version
```

## Map

- [cli.md](cli.md): commands, global options, output conventions and the reference generated from the registry.
- [tui.md](tui.md): Home, modules, keys per module, theme and how to create a module.
- [mcp.md](mcp.md): tools, resources and prompt, with input, output, effects, refusals and examples, and the client configuration.
- [configuration.md](configuration.md): settings.json, state files, credentials.json, master key and environment variables.
- [exit-codes.md](exit-codes.md): exit code table, the codes of each command and how to handle them.
- [troubleshooting.md](troubleshooting.md): symptom, cause, command and exit code for the failures the binary handles.
- [migration.md](migration.md): the guide for people coming from SetupVibe 1, with what `migrate` converts and what it asks.

## Embedded documentation

The binary embeds `README.md`, `cli.md`, `tui.md`, `mcp.md`, `configuration.md`,
`exit-codes.md`, `troubleshooting.md` and `migration.md`, in both languages. An agent reads that reference without
access to the repository:

```bash
{{bin}} --skill          # everything
{{bin}} --skill cli      # only the CLI section, with the generated reference
{{bin}} --skill mcp --json
```

`{{bin}} --skill` and `{{bin}} docs` accept `cli`, `tui`, `mcp`, `config`,
`exit-codes`, `troubleshooting`, `migration`, `inventory` and `reference`. The
`inventory` topic is generated from the embedded inventory, with the profiles
and one table per category. The `reference` topic holds only the reference
generated from the registry, with commands, options and exit codes.

## Language

The code, the command and option names, the configuration keys, the `--json`
fields and the binary messages are in English. This documentation exists in
Brazilian Portuguese and in English, with the technical terms kept in English.
`SETUPVIBE_LANG`, or `--lang` in `{{bin}} docs`, choose the embedded version.

## Coming from SetupVibe 1

See [the migration notes](migration.md) for Bash integration.

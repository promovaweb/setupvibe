# Yazi Terminal File Manager

> Native Yazi commands and essential usage — v0.41.9

[Yazi](https://github.com/sxyazi/yazi) is an asynchronous terminal file
manager with previews, multiple tabs, bulk file operations, and integrations
with tools already installed by SetupVibe.

## Availability

SetupVibe installs Yazi in both Desktop editions:

- macOS, Linux, and WSL through Homebrew in Step 8 of `desktop.sh`
- Windows through the official `sxyazi.yazi` WinGet package

The installation validates both native executables:

- `yazi` opens the file manager.
- `ya` manages Yazi packages, plugins, and flavors.

SetupVibe does not create a `y` alias or shell wrapper. Use the native `yazi`
command directly.

## Start Yazi

Open the current directory or provide a path:

```bash
yazi
yazi ~/projects
```

Check the installed commands:

```bash
yazi --version
ya --version
```

## Essential Keys

| Key                              | Action                                               |
| -------------------------------- | ---------------------------------------------------- |
| `h`, `j`, `k`, `l` or arrow keys | Navigate                                             |
| `Enter`                          | Open the selected file or directory                  |
| `Space`                          | Toggle selection                                     |
| `y`                              | Copy selected items                                  |
| `x`                              | Cut selected items                                   |
| `p`                              | Paste copied or cut items                            |
| `a`                              | Create a file; end the name with `/` for a directory |
| `r`                              | Rename selected items                                |
| `d`                              | Move selected items to the trash                     |
| `.`                              | Toggle hidden files                                  |
| `s`                              | Search filenames with `fd`                           |
| `S`                              | Search file contents with `ripgrep`                  |
| `z`                              | Navigate with `fzf`                                  |
| `Z`                              | Navigate with `zoxide`                               |
| `F1` or `~`                      | Open built-in help                                   |
| `q`                              | Quit                                                 |

## SetupVibe Integrations

SetupVibe also installs `file`, `ffmpeg`, ImageMagick, `jq`, `fd`, `ripgrep`,
`fzf`, `zoxide`, and Nerd Fonts where supported. Yazi uses these tools for
file detection, previews, search, navigation, and icons.

On Windows, SetupVibe sets the user environment variable `YAZI_FILE_ONE` to
Git for Windows' `usr\bin\file.exe`, as required for reliable MIME detection.
Uninstall mode restores the previous value when it is still managed by
SetupVibe.

User configuration belongs in:

- `~/.config/yazi/` on macOS, Linux, and WSL
- `%APPDATA%\yazi\config\` on Windows

SetupVibe leaves those user-owned configuration files unchanged.

## References

- [Yazi repository](https://github.com/sxyazi/yazi)
- [Official installation guide](https://yazi-rs.github.io/docs/installation/)
- [Official quick start](https://yazi-rs.github.io/docs/quick-start/)

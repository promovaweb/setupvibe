# Provisioning examples

`setupvibe auto` needs no answers at run time, so it fits any provisioning
tool. Every example below downloads the binary with the one-line installer,
which checks the release `SHA256SUMS` (and its Sigstore signature when
`cosign` is installed), then runs `auto`. Secrets go in environment variables,
never in the command line or in files that end up in images.

## cloud-init

A fresh VPS starts as root. `--user` creates the working user, installs the
key and continues as that user; the temporary sudo rule is removed at the end.

```yaml
#cloud-config
runcmd:
  - >-
    curl -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.sh
    | sh -s -- auto --user deploy
    --ssh-key "ssh-ed25519 AAAA... deploy@laptop"
    --timezone America/Sao_Paulo --profile remoto
```

For the server edition, add `--edition server` before `auto` and `--manager`
after it.

## Ansible

```yaml
- name: SetupVibe on the remote development machines
  hosts: dev
  become: false
  environment:
    TAILSCALE_AUTHKEY: "{{ vault_tailscale_authkey }}"
  tasks:
    - name: Install and run setupvibe auto
      ansible.builtin.shell: >-
        curl -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.sh
        | sh -s -- auto --profile remoto --git-name "{{ git_name }}" --git-email "{{ git_email }}"
      args:
        creates: "{{ ansible_env.HOME }}/.setupvibe/last-run.json"
```

The user needs passwordless sudo (`auto` exits with 13 otherwise). Remove
`creates` to rerun; `auto` is idempotent.

## Dockerfile

```dockerfile
FROM debian:13
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates sudo locales \
 && sed -i 's/^# *en_US.UTF-8/en_US.UTF-8/' /etc/locale.gen && locale-gen
ENV LANG=en_US.UTF-8
RUN useradd -m -s /bin/bash dev && echo 'dev ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/dev
USER dev
RUN curl -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.sh \
    | sh -s -- auto --profile essencial --exclude docker --skip-network-check
```

Services that need systemd (Docker, the SSH server, the security module) do
not apply to a plain image; build from a systemd image, as in
`tests/containers/`, when you need them.

## GitHub Actions

```yaml
jobs:
  setup:
    runs-on: ubuntu-24.04
    steps:
      - name: SetupVibe
        env:
          GITHUB_TOKEN: ${{ github.token }}
        run: |
          curl -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.sh \
            | sh -s -- auto --only node,python,uv,gh --profile essencial --json
```

`GITHUB_TOKEN` keeps mise below the anonymous GitHub API limit. `--json` turns
the run into NDJSON events for later steps.

## Vagrant

```ruby
Vagrant.configure("2") do |config|
  config.vm.box = "bento/ubuntu-24.04"
  config.vm.provision "shell", privileged: true, inline: <<~SHELL
    curl -fsSL https://raw.githubusercontent.com/promovaweb/setupvibe/v2/install.sh \
      | sh -s -- auto --user vagrant --profile remoto
  SHELL
end
```

The `vagrant` user already exists; `--user vagrant` only adds the temporary
sudo rule, which `auto` removes at the end unless `--keep-nopasswd` is given.

## Reusing a machine's selection

```bash
setupvibe config export setupvibe.json          # on the reference machine
setupvibe auto --config setupvibe.json          # on the new one
setupvibe config import setupvibe.json          # or apply the selection in place
```

The answers file carries the items and the Git identity, never secrets.
`profile: "none"` means an empty base, so the `only` list and its requirements
drive the plan, and `auto --config` repeats the exported selection. Passing
`--profile` on the command line overrides the file.

## Corporate networks and caches

`HTTPS_PROXY`, `HTTP_PROXY` and `NO_PROXY` are honored, including for commands
that run through sudo. `--ca-file` (or `SETUPVIBE_CA_FILE`) adds a corporate CA
bundle for Node, Bun, curl, Git and Python tools. `--cache-dir` (or
`SETUPVIBE_CACHE_DIR`) keeps mise, npm, uv, Homebrew and SetupVibe downloads in
one folder that several machines or CI runs can share; pinned downloads
already in the cache install offline.

On a machine that always sits behind the same CA or cache, save them in
`~/.setupvibe/config.json` so every command uses them without the options:

```json
{ "network": { "caFile": "/etc/ssl/certs/corp.pem", "cacheDir": "/srv/setupvibe-cache" } }
```

The order is the option, then the environment variable, then this block.

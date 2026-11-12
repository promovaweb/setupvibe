---
name: setupvibe-v2-dev
description: Develop SetupVibe 2 on the v2 branch (Bun binaries setupvibe and setupvibe-server built on Termfy), with tests, container runs, docs and pre-releases.
---

# Develop SetupVibe 2

Use this skill for any change under `shared/`, `desktop/`, `server/`,
`scripts/`, `tests/containers/`, `install.sh`, `install.ps1`, `version.json`
or the `v2*.yml` workflows on the `v2` branch.

## Before editing

1. Confirm the branch with `git branch --show-current`; SetupVibe 2 lives on
   `v2` only.
2. Read `V2.md` and the matching file in `shared/docs/`.
3. Code, identifiers, comments and CLI text are in English. The embedded docs
   in `desktop/docs` and `server/docs` have a Portuguese file and an `en/`
   copy; change both.

## Rules

- Every command that changes the machine is a list of `Step`s with argv
  arrays, run by `shared/exec/runner.ts`. Never build shell strings from
  user input; secrets go through `env`, never argv.
- Every file URL comes from `shared/repo.ts`, which points at the `v2`
  branch.
- A new state key goes into `shared/state/schemas.ts`; run
  `bun run state:schemas`.
- A new command needs examples, exit codes, a test and a line in
  `shared/docs/`.

## Validation

```bash
bun run typecheck
bun test
bun run build
bun run scripts/container-test.ts --system debian:13
bun run scripts/container-test.ts --system ubuntu:24.04 --edition server --as-root
```

Read the container output before claiming a run passed.

## Release

1. Bump `package.json` and `version.json` to the next `2.0.0-dev.N` and add a
   `CHANGELOG.md` entry.
2. Commit on `v2`, then push the branch and the tag together:
   `git push --atomic origin v2 v2.0.0-dev.N`.
3. Watch the run with `gh run watch` and confirm the release assets:
   binaries, `SHA256SUMS`, `SHA256SUMS.sigstore.json` and `sbom.cdx.json`.

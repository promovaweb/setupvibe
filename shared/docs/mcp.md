# MCP tools

The MCP server is assembled from the Termfy core in `shared/core/mcp/` and the
SetupVibe operations in `shared/mcp/tools.ts`. `setupvibe mcp` and
`setupvibe-server mcp` share the same tools, resources and prompt; the resource
URIs use the binary name, such as `setupvibe://inventory` or
`setupvibe-server://inventory`.

The interface published to agents is documented in `desktop/docs/mcp.md` and
`server/docs/mcp.md`, with input, output, effects, refusals and five examples
per tool and resource. This file describes the implementation and the contract
the two sides share.

## Assembly

`createServer()` in `shared/core/mcp/server.ts` registers, in this order:

1. `registerBaseTools`: `about`, `exit_codes`, `skill`;
2. `registerConfigTools`: `config_list`, `config_get`, `credentials_status`;
3. `registerSetupVibeTools`: `system`, `list`, `check`, `install`, `remove`,
   `update`, `health`, `doctor`, `report`, `init`, `migrate`, `logs`,
   `tailscale`, `machine`, plus the `inventory` and `selection` resources;
4. `registerResources`: `about`, `exit-codes`, `skill` and `skill/{topic}`;
5. `registerPrompts`: `operate`.

Every registration pushes the name and description into the `catalog`, which
is what `mcp --list` and `mcp --list --json` print. The same assembly feeds the
stdio transport, so the list never drifts from what the server exposes.

## The CLI envelope

Tools that operate the machine run the binary itself in a subprocess with
`--json`, through `runCliJson`:

```ts
const proc = Bun.spawn([...selfArgv(), ...args, "--json"], { stdin: "ignore", stdout: "pipe", stderr: "pipe" });
const stdout = await new Response(proc.stdout).text();
const exitCode = await proc.exited;
return { exitCode, envelope: lastEnvelope(stdout) };
```

`lastEnvelope` accepts a single JSON document or the last line with `ok` in
NDJSON output, so a command that streams events still yields the final
envelope. `reply` then returns:

```ts
{ exitCode, ok, command, data }        // success
{ exitCode, ok: false, error }         // failure
```

`isError` is `exitCode !== 0`. A command that returns data with a non-zero code,
such as `doctor` with a fail finding (3) or `check` with a failing item (10),
still carries `data` and marks `isError`. Agents read `exitCode` first.

Native tools (`about`, `exit_codes`, `skill`, `config_list`, `config_get`,
`credentials_status`, `health`, `logs`, `tailscale`, `machine`) build the object
directly and set `isError` only when the call itself failed.

## Tools

| Tool | Registered in | Input | Output | Side effects |
| --- | --- | --- | --- | --- |
| `about` | `tools/base.ts` | none | identity and runtime | read only |
| `exit_codes` | `tools/base.ts` | none | `codes` | read only |
| `skill` | `tools/base.ts` | `topic?` | Markdown | read only |
| `config_list` | `tools/config.ts` | none | file, values, schema | read only |
| `config_get` | `tools/config.ts` | `key` | key, value, exists | read only; `isError` when missing |
| `credentials_status` | `tools/config.ts` | none | file, exists, source, count, names | read only; never values |
| `system` | `mcp/tools.ts` | none | CLI envelope | runs `system --no-update-check` |
| `list` | `mcp/tools.ts` | `category?` | CLI envelope | read only |
| `check` | `mcp/tools.ts` | `items?` | CLI envelope | runs the item checks |
| `install` | `mcp/tools.ts` | `items`, `dry_run`, `force`, `external` | plan or results | writes only with `dry_run: false`; `external` installs a mise tool outside the inventory |
| `remove` | `mcp/tools.ts` | `items`, `dry_run`, `confirm`, `include_native`, `force`, `external` | plan or results | local refusal without `confirm`; `force` removes adopted or required items, `external` removes an app from `external.json` |
| `update` | `mcp/tools.ts` | `dry_run` | plan or results | writes only with `dry_run: false` |
| `health` | `mcp/tools.ts` | none | `ok`, `findings` | read only |
| `doctor` | `mcp/tools.ts` | none | CLI envelope | read only; exit 3 marks `isError` |
| `report` | `mcp/tools.ts` | none | `data.markdown` | read only |
| `init` | `mcp/tools.ts` | `dry_run` | checks and plan, or results | writes only with `dry_run: false` |
| `migrate` | `mcp/tools.ts` | `dry_run`, `confirm`, `remove_legacy` | plan or results | local refusal without `confirm` |
| `logs` | `mcp/tools.ts` | `run?` | runs, events, failed | read only |
| `tailscale` | `mcp/tools.ts` | none | snapshot of the local client | read only |
| `machine` | `mcp/tools.ts` | `processes` | info and one live reading | read only; waits one second |

Defaults live in the zod schema, so the client shows them: `dry_run` is `true`
in `install`, `remove`, `update`, `init` and `migrate`; `confirm` is `false`;
`force`, `include_native` and `external` are `false`; `processes` is `8`. With `external: true`, `items` carries one mise tool; the shared `items` schema only accepts `[a-z0-9][a-z0-9-]*`, so the exact-version form (`tool@version`) stays in the CLI.

## Resources

| URI | Registered in | Content |
| --- | --- | --- |
| `<bin>://inventory` | `mcp/tools.ts` | the edition inventory as JSON |
| `<bin>://selection` | `mcp/tools.ts` | `selection.json`, with `items: []` when missing |
| `<bin>://about` | `resources/base.ts` | identity and runtime |
| `<bin>://exit-codes` | `resources/base.ts` | exit-code table |
| `<bin>://skill` | `resources/base.ts` | the whole embedded documentation |
| `<bin>://skill/{topic}` | `resources/base.ts` | one topic, listed by the template |

## Prompt

`operate` takes a required `task` and returns one user message that tells the
agent to read `skill cli`, run commands with `--json`, handle the exit code and
never ask for a credential value in chat.

## Security rules

- No tool or resource returns a credential value. `credentials_status` returns
  names and the master key source only.
- No tool writes `settings.json` or the vault. Configuration writes stay in the
  CLI, where a person confirms them.
- `remove` and `migrate` refuse a real run without `confirm: true`, before
  running the CLI, with exit code 2.
- Secrets never travel in arguments: the Tailscale and Swarm tokens reach the
  commands through environment variables.

## Adding a tool

1. Create `shared/core/mcp/tools/<name>.ts` for a framework tool, or add the
   registration in `shared/mcp/tools.ts` for a SetupVibe operation.
2. Declare `inputSchema` with zod, `.describe()` on every field and `.default()`
   where a default applies.
3. Return `content` as text and `structuredContent` with the same object; set
   `isError` when the call failed.
4. Push the name and description into `catalog.tools` or `catalog.resources`.
5. Register the function in `registerAll` of `shared/core/mcp/server.ts`.
6. Document the item in `desktop/docs/mcp.md`, `desktop/docs/en/mcp.md`,
   `server/docs/mcp.md` and `server/docs/en/mcp.md`; the coverage test requires
   the section and five examples.
7. Run `bun test shared/tests/mcp-tools.test.ts`,
   `bun test shared/tests/docs-mcp-reference.test.ts` and `bun run typecheck`.

A tool that changes the machine defaults to a dry run and documents the effect
of `dry_run: false`. A tool that reads a credential documents that it returns
no value.

## Testing

```bash
setupvibe mcp --list
setupvibe mcp --list --json
npx @modelcontextprotocol/inspector setupvibe mcp
bun test shared/tests/mcp-tools.test.ts shared/tests/docs-mcp-reference.test.ts
```

`shared/tests/mcp-tools.test.ts` checks the registration and the tool behavior.
`shared/tests/docs-mcp-reference.test.ts` compares the catalog of each edition
with the four manuals: every tool, resource and prompt needs a section with the
required labels and five examples, and the manuals may not describe an item the
binary does not expose.

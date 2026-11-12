/**
 * `credentials` command: encrypted vault in credentials.json.
 *
 * Subcommands: `set`, `get`, `list`, `remove`, `status` and `clear`. The
 * value for `set` never comes from a command-line argument: on an interactive
 * terminal it is typed without echo; otherwise it comes from stdin. This
 * keeps it out of the shell history and the process list.
 */
import { manifest } from "../../app/manifest.ts";
import { ExitCode } from "../../app/exit-codes.ts";
import { error } from "../../app/errors.ts";
import { MASTER_KEY_VARIABLE, paths } from "../../config/paths.ts";
import {
  rotateMasterKey,
  setCredential,
  clearVault,
  listCredentials,
  mask,
  getCredential,
  removeCredential,
  vaultStatus,
  validateName,
} from "../../config/credentials.ts";
import { confirm, readSecret, readStdin } from "../input.ts";
import { blocks, color, table } from "../format.ts";
import type { Command } from "../registry.ts";

const codes = [ExitCode.CREDENTIALS, ExitCode.PERMISSION, ExitCode.INTERRUPTED] as const;

const set: Command = {
  name: "set",
  description: "Save or replace a credential. The value is read without echo or from stdin.",
  arguments: [
    {
      name: "name",
      description: "Credential identifier: lower-case letters, digits, dot, hyphen and underscore (e.g. openai.api_key).",
      required: true,
    },
  ],
  options: [{ name: "--stdin", description: "Force reading the value from the first stdin line, even on an interactive terminal." }],
  exitCodes: codes,
  interactive: true,
  examples: [`${manifest.bin} credentials set openai.api_key`, `printf '%s' "$TOKEN" | ${manifest.bin} credentials set github.token --stdin`],
  run: async (ctx) => {
    const name = validateName(ctx.args[0] as string);
    let value: string;
    if (ctx.options.stdin === true) {
      value = ((await readStdin()).split(/\r?\n/)[0] ?? "").trim();
      if (!value) throw error.usage("No value received on stdin.");
    } else {
      value = await readSecret(`Value for ${name}`);
    }
    setCredential(name, value);
    return {
      data: { name, file: paths.credentials(), saved: true },
      text: () => `${color.ok("✓")} credential "${name}" saved to ${paths.credentials()}`,
    };
  },
};

const get: Command = {
  name: "get",
  description: "Show a masked credential. Use --reveal for the full value.",
  arguments: [{ name: "name", description: "Credential identifier.", required: true }],
  options: [{ name: "--reveal", description: "Print the value in clear. In --json the field becomes `value`." }],
  exitCodes: codes,
  examples: [`${manifest.bin} credentials get openai.api_key`, `${manifest.bin} credentials get openai.api_key --reveal`],
  run: (ctx) => {
    const name = validateName(ctx.args[0] as string);
    const value = getCredential(name);
    const reveal = ctx.options.reveal === true;
    return {
      data: reveal ? { name, value } : { name, masked: mask(value), length: value.length },
      text: () => (reveal ? value : mask(value)),
    };
  },
};

const list: Command = {
  name: "list",
  aliases: ["ls"],
  description: "List saved names. Never shows values.",
  exitCodes: codes,
  examples: [`${manifest.bin} credentials list --json`],
  run: () => {
    const names = listCredentials();
    return {
      data: { count: names.length, names },
      text: () => (names.length ? names.join("\n") : color.dim("no credentials saved")),
    };
  },
};

const remove: Command = {
  name: "remove",
  aliases: ["rm"],
  description: "Remove a credential from the vault.",
  arguments: [{ name: "name", description: "Credential identifier.", required: true }],
  exitCodes: codes,
  examples: [`${manifest.bin} credentials remove github.token`],
  run: (ctx) => {
    const name = validateName(ctx.args[0] as string);
    const removed = removeCredential(name);
    return {
      data: { name, removed },
      text: () => (removed ? `${color.ok("✓")} "${name}" removed` : `${color.warn("•")} "${name}" did not exist`),
    };
  },
};

const status: Command = {
  name: "status",
  description: "Show file, master key source and number of credentials.",
  examples: [`${manifest.bin} credentials status`],
  run: () => {
    const s = vaultStatus();
    const source: Record<typeof s.masterKeySource, string> = {
      env: `variable ${MASTER_KEY_VARIABLE}`,
      file: paths.masterKey(),
      none: "none (created on first write)",
    };
    return {
      data: { ...s, masterKeyVariable: MASTER_KEY_VARIABLE, algorithm: "aes-256-gcm" },
      text: () =>
        blocks(
          table([
            ["File", `${s.file}${s.exists ? "" : color.dim(" (not created)")}`],
            ["Cipher", "AES-256-GCM"],
            ["Master key", source[s.masterKeySource]],
            ["Credentials", String(s.count)],
          ]),
          s.names.length ? s.names.map((n) => `  ${color.dim("•")} ${n}`).join("\n") : undefined,
        ),
    };
  },
};

const clear: Command = {
  name: "clear",
  description: "Delete credentials.json entirely. Keeps master.key. Asks for confirmation on a terminal.",
  options: [{ name: "--yes", aliases: ["-y"], description: "Skip the confirmation." }],
  exitCodes: codes,
  interactive: true,
  examples: [`${manifest.bin} credentials clear --yes`],
  run: async (ctx) => {
    if (ctx.options.yes !== true) {
      const ok = await confirm(`Delete ${paths.credentials()}?`, false);
      if (!ok) throw error.interrupted("Operation cancelled.");
    }
    const deleted = clearVault();
    return {
      data: { file: paths.credentials(), deleted },
      text: () => (deleted ? `${color.ok("✓")} vault deleted` : color.dim("there was no vault to delete")),
    };
  },
};

const rotateKey: Command = {
  name: "rotate-key",
  description: "Re-encrypt the existing vault with a new master key and write master.key with mode 0600.",
  longDescription: `With --from-env, master.key decrypts the vault and ${MASTER_KEY_VARIABLE} supplies the new key. Without it, a random key is generated; unset the old environment variable in your shell afterward.`,
  options: [{ name: "--from-env", description: `Use ${MASTER_KEY_VARIABLE} (64 hex characters) as the new key; read the current key from master.key.` }],
  exitCodes: codes,
  run: (ctx) => {
    const hadEnvironment = Boolean(process.env[MASTER_KEY_VARIABLE]);
    const data = rotateMasterKey(ctx.options["from-env"] === true);
    if (hadEnvironment && data.source === "file") ctx.stderr(`Unset ${MASTER_KEY_VARIABLE} in your shell before reading the vault again.`);
    return { data, text: "✓ Master key rotated; vault re-encrypted." };
  },
};

export const credentialsCommand: Command = {
  name: "credentials",
  aliases: ["cred"],
  description: `Store encrypted secrets (AES-256-GCM) in ~/.${manifest.bin}/credentials.json.`,
  longDescription:
    `Values are encrypted with a 32-byte master key. The key comes from the variable\n` +
    `${MASTER_KEY_VARIABLE} (64 hex characters) or from master.key, created with mode 0600 on\n` +
    `first write. Commands that call APIs read the value with getCredential(name) and exit\n` +
    `with code 4 when the credential does not exist.`,
  subcommands: [set, get, list, remove, status, clear, rotateKey],
  exitCodes: codes,
};

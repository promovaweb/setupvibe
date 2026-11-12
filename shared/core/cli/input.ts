/**
 * Reading secrets and confirmations from the terminal.
 *
 * `readSecret` reads a value without echo when stdin is a TTY and reads the
 * first stdin line otherwise (pipes and scripts). `confirm` asks a yes/no
 * question. Neither function logs the value it reads.
 */
import { error } from "../app/errors.ts";

/** Reads all of stdin as text, for non-interactive mode. */
export async function readStdin(): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of Bun.stdin.stream()) chunks.push(chunk as Uint8Array);
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Reads a secret. On a TTY, shows the label and hides typing. Off a TTY,
 * uses the first stdin line and raises USAGE when it is empty.
 */
export async function readSecret(label: string): Promise<string> {
  if (!process.stdin.isTTY) {
    const text = (await readStdin()).split(/\r?\n/)[0] ?? "";
    if (text.length === 0) throw error.usage("No value received on stdin. Send the secret as one line.");
    return text;
  }

  process.stderr.write(`${label}: `);
  return await new Promise<string>((resolve, reject) => {
    const stdin = process.stdin;
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const finish = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      process.stderr.write("\n");
    };

    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\u0003") {
          finish();
          reject(error.interrupted("Input cancelled."));
          return;
        }
        if (ch === "\r" || ch === "\n") {
          finish();
          resolve(value);
          return;
        }
        if (ch === "\u007f" || ch === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        if (ch >= " ") value += ch;
      }
    };

    stdin.on("data", onData);
  });
}

/** Yes/no question. Off a TTY returns `fallback`. */
export async function confirm(question: string, fallback = false): Promise<boolean> {
  if (!process.stdin.isTTY) return fallback;
  const answer = prompt(`${question} ${fallback ? "[Y/n]" : "[y/N]"}`);
  if (answer === null || answer.trim() === "") return fallback;
  return /^y/i.test(answer.trim());
}

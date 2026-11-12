/**
 * Checksums for downloads.
 *
 * Every direct download (archives, binaries, installers with a published
 * hash) is verified before use. Mismatches stop the item; they are never
 * logged as warnings and ignored. Spec section 6.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export type Algorithm = "sha256" | "sha384" | "sha512";

/** Hex digest of a buffer. */
export function digest(data: Uint8Array | string, algorithm: Algorithm = "sha256"): string {
  return createHash(algorithm).update(data).digest("hex");
}

/** Hex digest of a file. */
export function digestFile(path: string, algorithm: Algorithm = "sha256"): string {
  return digest(readFileSync(path), algorithm);
}

/** Thrown when a download does not match its expected checksum. */
export class ChecksumMismatch extends Error {
  constructor(
    readonly subject: string,
    readonly expected: string,
    readonly actual: string,
  ) {
    super(`Checksum mismatch for ${subject}: expected ${expected}, got ${actual}.`);
  }
}

/**
 * Verifies data against an expected hex digest (case-insensitive).
 *
 * @throws ChecksumMismatch when they differ
 */
export function verify(data: Uint8Array | string, expected: string, algorithm: Algorithm, subject: string): void {
  const actual = digest(data, algorithm);
  if (actual.toLowerCase() !== expected.trim().toLowerCase()) throw new ChecksumMismatch(subject, expected, actual);
}

/**
 * Finds the digest of `fileName` in a checksums file such as
 * `SHASUMS256.txt` (`<hex>  <name>` per line).
 */
export function findInChecksumList(list: string, fileName: string): string | undefined {
  for (const line of list.split("\n")) {
    const match = line.trim().match(/^([0-9a-fA-F]{64,128})\s+\*?(.+)$/);
    if (match && match[2]!.trim() === fileName) return match[1]!.toLowerCase();
  }
  return undefined;
}

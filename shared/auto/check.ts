/**
 * Item check, used by `check` and at the end of `auto`.
 *
 * Runs each item's `verify.command` and compares the output with
 * `verify.expect` (substring, `^regex` or `>=version`).
 */
import type { Item } from "../inventory.ts";
import type { Runner } from "../exec/runner.ts";
import { verifyCmd, verifyOutputMatches } from "../install/methods.ts";

export interface ItemCheck {
  id: string;
  status: "ok" | "fail";
  output: string;
  expected?: string;
}

/** Checks each item and returns one result per item. */
export async function checkItems(items: Item[], runner: Runner, home?: string): Promise<ItemCheck[]> {
  const results: ItemCheck[] = [];
  for (const item of items) {
    const r = await runner.exec(verifyCmd(item, home));
    const output = `${r.stdout}${r.stderr}`.trim().split("\n").slice(0, 2).join(" ");
    const ok = r.code === 0 && verifyOutputMatches(item, `${r.stdout}\n${r.stderr}`);
    results.push({ id: item.id, status: ok ? "ok" : "fail", output, ...(item.verify.expect ? { expected: item.verify.expect } : {}) });
  }
  return results;
}

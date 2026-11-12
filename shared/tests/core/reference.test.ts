import "../../../desktop/src/edition.ts";
/** Verifies reference-only documentation across command and global option parsing. */
import { expect, test } from "bun:test";
import { root } from "../../core/cli/commands.ts";
import { parse } from "../../core/cli/parser.ts";
import { commandReference, skillText, SKILL_TOPICS } from "../../core/skill/index.ts";

test("reference returns only generated command documentation", () => {
  expect(SKILL_TOPICS).toContain("reference");
  expect(skillText(root, "reference")).toBe(commandReference(root).trimEnd());
  expect(parse(root, ["--skill", "reference"]).options.skill).toBe("reference");
  expect(parse(root, ["skill", "reference"]).args).toEqual(["reference"]);
  expect(skillText(root).split("## Reference generated from the command registry")).toHaveLength(2);
});

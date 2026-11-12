import "../../../desktop/src/edition.ts";
/** Exit codes: uniqueness and coverage of the description table. */
import { describe, expect, test } from "bun:test";
import { ExitCode, exitCodeDescriptions, exitCodeName } from "../../core/app/exit-codes.ts";

describe("exit codes", () => {
  test("zero is success and codes are unique", () => {
    expect(ExitCode.SUCCESS).toBe(0);
    const values = Object.values(ExitCode);
    expect(new Set(values).size).toBe(values.length);
  });

  test("every constant has a description", () => {
    for (const [name, code] of Object.entries(ExitCode)) {
      expect(exitCodeName(code)).toBe(name);
    }
    expect(exitCodeDescriptions.length).toBe(Object.keys(ExitCode).length);
  });
});

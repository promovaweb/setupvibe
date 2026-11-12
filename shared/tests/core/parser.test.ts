import "../../../desktop/src/edition.ts";
/** argv parser and registry tests. */
import { describe, expect, test } from "bun:test";
import { parse } from "../../core/cli/parser.ts";
import { root } from "../../core/cli/commands.ts";
import { AppError } from "../../core/app/errors.ts";
import { ExitCode } from "../../core/app/exit-codes.ts";

describe("parser", () => {
  test("resolves nested subcommands, arguments and options", () => {
    const p = parse(root, ["config", "set", "output.format", "json", "--json"]);
    expect(p.path).toEqual(["config", "set"]);
    expect(p.args).toEqual(["output.format", "json"]);
    expect(p.options.json).toBe(true);
  });

  test("accepts --key=value and aliases", () => {
    const p = parse(root, ["tui", "--tab=about"]);
    expect(p.options.tab).toBe("about");
    const h = parse(root, ["-h"]);
    expect(h.options.help).toBe(true);
  });

  test("--skill accepts an optional value", () => {
    expect(parse(root, ["--skill"]).options.skill).toBe(true);
    expect(parse(root, ["--skill", "mcp"]).options.skill).toBe("mcp");
  });

  test("rejects an unknown option with USAGE", () => {
    try {
      parse(root, ["about", "--nothing"]);
      throw new Error("should fail");
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).code).toBe(ExitCode.USAGE);
    }
  });

  test("rejects a missing required argument", () => {
    expect(() => parse(root, ["config", "get"])).toThrow(/Missing arguments/);
  });

  test("rejects a value outside the accepted list", () => {
    expect(() => parse(root, ["tui", "--tab", "nothing"])).toThrow(/Accepted/);
    expect(() => parse(root, ["skill", "nothing"])).toThrow(/Accepted/);
  });

  test("-- ends option parsing", () => {
    const p = parse(root, ["config", "get", "--", "--json"]);
    expect(p.args).toEqual(["--json"]);
    expect(p.options.json).toBeUndefined();
  });
});

/** Windows component store health in doctor and init (spec section 14.6). */
import "../../desktop/src/edition.ts";
import { describe, expect, test } from "bun:test";
import { parseDismHealth, windowsHealth, windowsHealthFinding, windowsRepairSteps, DISM_CHECK } from "../ops/windows-health";
import { windowsHealthChecks } from "../commands/init";
import { describeCmd } from "../exec/runner";

describe("windows health", () => {
  test("DISM CheckHealth output is read", () => {
    expect(parseDismHealth("Deployment Image Servicing\nNo component store corruption detected.\nThe operation completed successfully.", 0)).toBe("healthy");
    expect(parseDismHealth("The component store is repairable.", 0)).toBe("repairable");
    expect(parseDismHealth("The component store is not repairable.", 0)).toBe("broken");
    expect(parseDismHealth("Error: 740\nElevated permissions are required to run DISM.", 740)).toBe("needs-admin");
    expect(parseDismHealth("something else", 1)).toBe("unknown");
  });

  test("the check is quick and runs only on Windows", () => {
    expect(DISM_CHECK).toEqual(["DISM.exe", "/Online", "/Cleanup-Image", "/CheckHealth"]);
    expect(windowsHealth("linux")).toBeUndefined();
  });

  test("findings: repairable points at --repair-windows, broken fails", () => {
    expect(windowsHealthFinding("healthy")!.level).toBe("ok");
    expect(windowsHealthFinding("repairable")!.fix).toContain("--repair-windows");
    expect(windowsHealthFinding("broken")!.level).toBe("fail");
    expect(windowsHealthFinding(undefined)).toBeUndefined();
  });

  test("init shows the result as a warning, never as a block", () => {
    expect(windowsHealthChecks(undefined)).toEqual([]);
    expect(windowsHealthChecks("broken")[0]!.status).toBe("warn");
    expect(windowsHealthChecks("healthy")[0]!.status).toBe("ok");
  });

  test("the repair runs DISM RestoreHealth, then sfc /scannow", () => {
    expect(windowsRepairSteps().map((s) => describeCmd(s.commands[0]!))).toEqual(["DISM.exe /Online /Cleanup-Image /RestoreHealth", "sfc.exe /scannow"]);
  });
});

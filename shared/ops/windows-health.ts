/**
 * Windows component store health (spec section 14.6).
 *
 * SetupVibe 1 ran `sfc /scannow` and DISM `CheckHealth` around every install.
 * SetupVibe 2 keeps them where they help: `doctor` and `init` on Windows run
 * the quick `DISM /Online /Cleanup-Image /CheckHealth` and report the result;
 * the slow repair (`DISM /RestoreHealth`, then `sfc /scannow`) runs only with
 * `doctor --repair-windows`, in an elevated PowerShell.
 */
import type { Step } from "../exec/runner.ts";

export type WindowsHealth = "healthy" | "repairable" | "broken" | "needs-admin" | "unknown";

/** Quick check of the component store. */
export const DISM_CHECK = ["DISM.exe", "/Online", "/Cleanup-Image", "/CheckHealth"];

/** Reads the DISM CheckHealth output and exit code. */
export function parseDismHealth(output: string, code: number): WindowsHealth {
  const text = output.toLowerCase();
  if (code === 740 || text.includes("elevated permissions") || text.includes("error: 740")) return "needs-admin";
  if (text.includes("no component store corruption detected")) return "healthy";
  if (text.includes("not repairable")) return "broken";
  if (text.includes("component store is repairable")) return "repairable";
  return "unknown";
}

/** Runs the quick check; undefined outside Windows. */
export function windowsHealth(platform = process.platform): WindowsHealth | undefined {
  if (platform !== "win32") return undefined;
  try {
    const r = Bun.spawnSync(DISM_CHECK, { stdout: "pipe", stderr: "pipe", timeout: 120_000 });
    return parseDismHealth(`${r.stdout.toString()}\n${r.stderr.toString()}`, r.exitCode ?? 1);
  } catch {
    return "unknown";
  }
}

/** Doctor finding for a health result. */
export function windowsHealthFinding(health: WindowsHealth | undefined): { id: string; level: "ok" | "warn" | "fail"; text: string; fix?: string } | undefined {
  if (!health) return undefined;
  const repair = "setupvibe doctor --repair-windows (in an elevated PowerShell)";
  switch (health) {
    case "healthy":
      return { id: "windows-health", level: "ok", text: "Windows component store has no corruption" };
    case "repairable":
      return { id: "windows-health", level: "warn", text: "Windows component store is corrupted but repairable", fix: repair };
    case "broken":
      return { id: "windows-health", level: "fail", text: "Windows component store is corrupted and DISM cannot repair it from Windows Update", fix: "DISM /Online /Cleanup-Image /RestoreHealth /Source:<install.wim> with an installation image of the same build" };
    case "needs-admin":
      return { id: "windows-health", level: "warn", text: "Windows health check needs an elevated PowerShell", fix: "run setupvibe doctor in an elevated PowerShell" };
    default:
      return { id: "windows-health", level: "warn", text: "Windows health check gave no clear result", fix: "DISM /Online /Cleanup-Image /CheckHealth" };
  }
}

/** Repair: DISM RestoreHealth, then sfc /scannow. Both take minutes; two hours each at most. */
export function windowsRepairSteps(): Step[] {
  const twoHours = 2 * 60 * 60_000;
  return [
    { id: "dism-restorehealth", description: "Repair the component store (DISM /RestoreHealth)", commands: [{ argv: ["DISM.exe", "/Online", "/Cleanup-Image", "/RestoreHealth"], timeoutMs: twoHours }] },
    { id: "sfc-scannow", description: "Check and repair system files (sfc /scannow)", commands: [{ argv: ["sfc.exe", "/scannow"], timeoutMs: twoHours }] },
  ];
}

/**
 * Unit test coverage with a minimum for the whole suite (task 16).
 *
 * Bun's own `coverageThreshold` applies to each file, and the files that run
 * real commands (covered by the container tests and the macOS and Windows
 * runners) sit lower by design. This runs `bun test --coverage`, prints the
 * report and fails when the "All files" line falls below the minimum.
 *
 * Usage: bun run coverage
 */
export const MINIMUM = { lines: 90, functions: 87 };

/** Reads the "All files | functions | lines |" row of the text report. */
export function totals(report: string): { functions: number; lines: number } | undefined {
  const row = report.split("\n").find((l) => l.trimStart().startsWith("All files"));
  if (!row) return undefined;
  const [, functions, lines] = row.split("|").map((c) => Number.parseFloat(c.trim()));
  return Number.isFinite(functions) && Number.isFinite(lines) ? { functions: functions!, lines: lines! } : undefined;
}

if (import.meta.main) {
  const proc = Bun.spawn(["bun", "test", "--coverage"], { stdout: "pipe", stderr: "pipe", env: process.env });
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  process.stdout.write(out);
  process.stderr.write(err);
  if (code !== 0) process.exit(code);
  const t = totals(`${out}\n${err}`);
  if (!t) {
    console.error("✗ No coverage totals in the report.");
    process.exit(1);
  }
  const low = (["lines", "functions"] as const).filter((k) => t[k] < MINIMUM[k]);
  if (low.length) {
    console.error(`✗ Coverage below the minimum: ${low.map((k) => `${k} ${t[k]}% < ${MINIMUM[k]}%`).join(", ")}`);
    process.exit(1);
  }
  console.error(`✓ Coverage: lines ${t.lines}% (minimum ${MINIMUM.lines}%), functions ${t.functions}% (minimum ${MINIMUM.functions}%)`);
}

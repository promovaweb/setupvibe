/**
 * Writes dist/sbom.cdx.json, a CycloneDX 1.5 bill of materials of what each
 * edition installs, for the GitHub Release (spec section 17).
 *
 * One component per inventory item and edition, with the pinned version, the
 * homepage and the install source on Linux, plus the SetupVibe binaries.
 *
 * Usage: bun run scripts/sbom.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Inventory } from "../shared/inventory.ts";
import { resolveInstall } from "../shared/inventory.ts";

/** CycloneDX document for the given inventories. */
export function sbom(version: string, inventories: Inventory[], now = new Date()) {
  const components = inventories.flatMap((inv) =>
    inv.items.map((item) => {
      const entry = resolveInstall(item, "debian") ?? resolveInstall(item, "macos") ?? resolveInstall(item, "windows");
      return {
        type: "application",
        "bom-ref": `${inv.edition}:${item.id}`,
        name: item.id,
        version: item.version,
        description: item.description.en,
        externalReferences: [{ type: "website", url: item.homepage }],
        properties: [
          { name: "setupvibe:edition", value: inv.edition },
          { name: "setupvibe:versionPolicy", value: item.versionPolicy },
          { name: "setupvibe:method", value: entry ? (entry.method === "mise" ? `mise ${entry.tool}` : entry.method) : "none" },
        ],
      };
    }),
  );
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    version: 1,
    metadata: { timestamp: now.toISOString(), component: { type: "application", name: "setupvibe", version } },
    components,
  };
}

if (import.meta.main) {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
  const invs = ["desktop/inventory.json", "server/inventory.json"].map((f) => JSON.parse(readFileSync(f, "utf8")) as Inventory);
  mkdirSync("dist", { recursive: true });
  const doc = sbom(pkg.version, invs);
  writeFileSync("dist/sbom.cdx.json", `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`✓ dist/sbom.cdx.json (${doc.components.length} components)`);
}

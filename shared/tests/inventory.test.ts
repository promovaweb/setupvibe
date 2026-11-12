/**
 * Consistency tests for desktop/inventory.json and server/inventory.json.
 *
 * They check what the JSON Schema cannot express: references between items,
 * profiles and repositories, an install entry for every supported system,
 * pinned versions with matching verification, and well-formed checksums.
 *
 * Run with: bun test shared/tests
 */
import { describe, expect, test } from "bun:test";
import schema from "../inventory.schema.json";
import desktop from "../../desktop/inventory.json";
import server from "../../server/inventory.json";
import { flagsFor, installKeysFor, profileItems, resolveInstall, type Inventory, type Item } from "../inventory";

const inventories: [string, Inventory][] = [
  ["desktop", desktop as Inventory],
  ["server", server as Inventory],
];

const itemKeys = new Set(Object.keys(schema.$defs.item.properties));
const installKeys = new Set(schema.$defs.installKey.enum);
const installFields = new Set(Object.keys(schema.$defs.install.properties));
const methods = new Set(schema.$defs.install.properties.method.enum);
const policies = new Set(schema.$defs.item.properties.versionPolicy.enum);

describe("installKeysFor", () => {
  test("orders keys from specific to general", () => {
    expect(installKeysFor("wsl")).toEqual(["wsl", "debian-family", "linux", "unix", "all"]);
    expect(installKeysFor("omarchy")).toEqual(["omarchy", "arch-family", "linux", "unix", "all"]);
    expect(installKeysFor("macos")).toEqual(["macos", "unix", "all"]);
    expect(installKeysFor("windows")).toEqual(["windows", "all"]);
  });
});

for (const [name, inv] of inventories) {
  describe(`${name} inventory`, () => {
    const ids = inv.items.map((i) => i.id);
    const byId = new Map(inv.items.map((i) => [i.id, i]));
    const categories = new Set(inv.categories.map((c) => c.id));

    test("header matches the edition", () => {
      expect(inv.schemaVersion).toBe(1);
      expect(inv.edition).toBe(name as Inventory["edition"]);
      expect(inv.$schema).toBe("../shared/inventory.schema.json");
      expect(inv.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test("item ids are unique", () => {
      expect(new Set(ids).size).toBe(ids.length);
    });

    test("items only use known fields, methods and policies", () => {
      for (const item of inv.items) {
        for (const key of Object.keys(item)) expect(itemKeys.has(key), `${item.id}.${key}`).toBe(true);
        expect(policies.has(item.versionPolicy), `${item.id} policy`).toBe(true);
        for (const [key, entry] of Object.entries(item.install)) {
          expect(installKeys.has(key), `${item.id} install key ${key}`).toBe(true);
          expect(methods.has(entry!.method), `${item.id} method ${entry!.method}`).toBe(true);
          for (const field of Object.keys(entry!)) expect(installFields.has(field), `${item.id}.${key}.${field}`).toBe(true);
        }
      }
    });

    test("categories, requirements and repositories exist", () => {
      for (const item of inv.items) {
        expect(categories.has(item.category), `${item.id} category`).toBe(true);
        for (const req of item.requires ?? []) expect(byId.has(req), `${item.id} requires ${req}`).toBe(true);
        for (const entry of Object.values(item.install)) {
          if (entry!.repository) expect(inv.repositories[entry!.repository], `${item.id} repository`).toBeDefined();
        }
      }
    });

    test("requirements have no cycles", () => {
      const visit = (id: string, path: string[]) => {
        expect(path.includes(id), `cycle ${[...path, id].join(" -> ")}`).toBe(false);
        for (const req of byId.get(id)?.requires ?? []) visit(req, [...path, id]);
      };
      for (const id of ids) visit(id, []);
    });

    test("every item resolves an install entry on every supported system", () => {
      for (const item of inv.items) {
        for (const system of inv.systems) {
          expect(resolveInstall(item, system), `${item.id} on ${system}`).toBeDefined();
        }
      }
    });

    test("unsupported entries explain why, and items are installable somewhere", () => {
      for (const item of inv.items) {
        for (const entry of Object.values(item.install)) {
          if (entry!.method === "unsupported") expect(entry!.reason, `${item.id} reason`).toBeTruthy();
        }
        const somewhere = inv.systems.some((s) => resolveInstall(item, s)?.method !== "unsupported");
        expect(somewhere, `${item.id} installable somewhere`).toBe(true);
      }
    });

    test("pinned versions are verifiable", () => {
      for (const item of inv.items) {
        if (item.versionPolicy === "exact") {
          expect(item.version, `${item.id} version`).toMatch(/^\d+(\.\d+)+$/);
        }
        if (item.versionPolicy === "commit") {
          expect(item.version, `${item.id} commit`).toMatch(/^[0-9a-f]{40}$/);
        }
        if (item.versionPolicy === "minimum") {
          expect(item.verify.expect, `${item.id} minimum`).toBe(`>=${item.version}`);
        }
        if (item.versionPolicy === "series") {
          expect(item.verify.expect, `${item.id} series`).toBeTruthy();
        }
      }
    });

    test("mise entries name a tool", () => {
      for (const item of inv.items) {
        for (const entry of Object.values(item.install)) {
          if (entry!.method === "mise") expect(entry!.tool, `${item.id} tool`).toBeTruthy();
        }
      }
    });

    test("checksums and fingerprints are well formed", () => {
      for (const repo of Object.values(inv.repositories)) {
        for (const fpr of repo.fingerprints) expect(fpr).toMatch(/^[0-9A-F]{40}$/);
      }
      for (const item of inv.items) {
        for (const entry of Object.values(item.install)) {
          for (const file of entry!.files ?? []) expect(file.sha256, `${item.id} sha256`).toMatch(/^[0-9a-f]{64}$/);
          if (entry!.method === "installer") expect(entry!.checksum, `${item.id} checksum policy`).toBeTruthy();
        }
        for (const commit of Object.values(item.plugins ?? {})) expect(commit).toMatch(/^[0-9a-f]{40}$/);
      }
    });

    test("profiles reference existing items and resolve", () => {
      expect(inv.profiles.essencial).toBeDefined();
      for (const profile of Object.keys(inv.profiles)) {
        for (const id of profileItems(inv, profile)) expect(byId.has(id), `${profile} -> ${id}`).toBe(true);
      }
    });

    test("the essencial profile matches the default selection", () => {
      const defaults = inv.items.filter((i) => i.default).map((i) => i.id).sort();
      expect([...inv.profiles.essencial!.items].sort()).toEqual(defaults);
    });

    test("requirements of default items are installed by init or selected by default", () => {
      for (const item of inv.items.filter((i) => i.default)) {
        for (const req of item.requires ?? []) {
          const dep = byId.get(req) as Item;
          expect(dep.default || dep.initOnly, `${item.id} needs ${req} by default`).toBe(true);
        }
      }
    });

    test("items that open ports are flagged as services", () => {
      for (const item of inv.items) {
        const flags = item.flags ?? [];
        if (flags.includes("port")) expect(flags.includes("service"), `${item.id} port without service`).toBe(true);
      }
    });
  });
}

describe("edition rules", () => {
  const d = desktop as Inventory;
  const s = server as Inventory;

  test("server runs only on Debian and Ubuntu", () => {
    expect([...s.systems].sort()).toEqual(["debian", "ubuntu"]);
  });

  test("server has no GUI items", () => {
    for (const item of s.items) {
      for (const system of s.systems) expect(flagsFor(item, system).includes("gui"), item.id).toBe(false);
    }
  });

  test("server applies the security module by default", () => {
    for (const item of s.items.filter((i) => i.securityModule)) expect(item.default, item.id).toBe(true);
  });

  test("desktop has the remoto profile built on essencial", () => {
    expect(d.profiles.remoto!.extends).toBe("essencial");
    const remoto = profileItems(d, "remoto");
    for (const id of ["linger", "ufw", "fail2ban", "openssh-server"]) expect(remoto).toContain(id);
  });

  test("desktop defaults include Node, PHP and Python", () => {
    const defaults = d.items.filter((i) => i.default).map((i) => i.id);
    for (const id of ["node", "php", "python"]) expect(defaults).toContain(id);
    for (const id of ["ruby", "go", "rust", "bun"]) expect(defaults).not.toContain(id);
  });

  test("items shared by both editions pin the same version", () => {
    const desktopById = new Map(d.items.map((i) => [i.id, i]));
    for (const item of s.items) {
      const twin = desktopById.get(item.id);
      if (twin) expect(item.version, item.id).toBe(twin.version);
    }
  });
});

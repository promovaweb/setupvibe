/** System detection rules (spec sections 2 and 18). */
import { describe, expect, test } from "bun:test";
import {
  compareVersions,
  isHeadless,
  isPublicAddress,
  isWsl,
  linuxSystemFromOsRelease,
  normalizeArch,
  parseOsRelease,
  unsupportedReason,
  variantOf,
} from "../system/detect";
import desktop from "../../desktop/inventory.json";
import server from "../../server/inventory.json";
import type { System } from "../inventory";

const desktopSystems = desktop.systems as System[];
const serverSystems = server.systems as System[];

const osRelease = (id: string, version = "", extra = "") => parseOsRelease(`NAME="X"\nID=${id}\nVERSION_ID="${version}"\n${extra}`);
const plain = { wsl: false, omarchy: false };

describe("os-release", () => {
  test("parses quoted and unquoted values", () => {
    const f = parseOsRelease('ID=ubuntu\nVERSION_ID="24.04"\nPRETTY_NAME="Ubuntu 24.04 LTS"\n# comment');
    expect(f).toEqual({ ID: "ubuntu", VERSION_ID: "24.04", PRETTY_NAME: "Ubuntu 24.04 LTS" });
  });

  test("maps supported distributions", () => {
    expect(linuxSystemFromOsRelease(osRelease("ubuntu", "24.04"), plain)).toBe("ubuntu");
    expect(linuxSystemFromOsRelease(osRelease("debian", "12"), plain)).toBe("debian");
    expect(linuxSystemFromOsRelease(osRelease("linuxmint", "22"), plain)).toBe("mint");
    expect(linuxSystemFromOsRelease(osRelease("zorin", "18"), plain)).toBe("zorin");
    expect(linuxSystemFromOsRelease(osRelease("arch"), plain)).toBe("arch");
  });

  test("recognizes Omarchy and WSL", () => {
    expect(linuxSystemFromOsRelease(osRelease("arch"), { wsl: false, omarchy: true })).toBe("omarchy");
    expect(linuxSystemFromOsRelease(osRelease("ubuntu", "24.04"), { wsl: true, omarchy: false })).toBe("wsl");
    expect(linuxSystemFromOsRelease(osRelease("debian", "12"), { wsl: true, omarchy: false })).toBe("wsl");
  });

  test("rejects other distributions", () => {
    expect(linuxSystemFromOsRelease(osRelease("pop", "24.04"), plain)).toBeUndefined();
    expect(linuxSystemFromOsRelease(osRelease("fedora", "41"), plain)).toBeUndefined();
  });
});

describe("WSL, headless and public IP", () => {
  test("WSL from variables or the kernel", () => {
    expect(isWsl({ WSL_DISTRO_NAME: "Ubuntu" }, "")).toBe(true);
    expect(isWsl({}, "Linux version 6.6.36.6-microsoft-standard-WSL2")).toBe(true);
    expect(isWsl({}, "Linux version 6.12.74+deb13-amd64")).toBe(false);
  });

  test("headless on Linux without a graphical session", () => {
    expect(isHeadless({}, "linux", true)).toBe(true);
    expect(isHeadless({ DISPLAY: ":0" }, "linux", true)).toBe(false);
    expect(isHeadless({ WAYLAND_DISPLAY: "wayland-0" }, "linux", false)).toBe(false);
    expect(isHeadless({ XDG_SESSION_TYPE: "wayland" }, "linux", true)).toBe(false);
  });

  test("headless on macOS and Windows over SSH or without a terminal", () => {
    expect(isHeadless({}, "darwin", true)).toBe(false);
    expect(isHeadless({ SSH_CONNECTION: "1 2 3 4" }, "darwin", true)).toBe(true);
    expect(isHeadless({}, "win32", false)).toBe(true);
  });

  test("public addresses", () => {
    for (const a of ["10.0.0.1", "172.16.5.1", "192.168.1.10", "127.0.0.1", "169.254.1.1", "100.100.1.1", "::1", "fe80::1", "fd00::1"]) {
      expect(isPublicAddress(a), a).toBe(false);
    }
    for (const a of ["8.8.8.8", "172.32.0.1", "2001:db8::1", "45.10.20.30"]) expect(isPublicAddress(a), a).toBe(true);
  });

  test("variants", () => {
    expect(variantOf(false, true)).toBe("local");
    expect(variantOf(true, false)).toBe("remote-headless");
    expect(variantOf(true, true)).toBe("remote-exposed");
  });
});

describe("support rules", () => {
  test("architectures and versions", () => {
    expect(normalizeArch("x86_64")).toBe("x64");
    expect(normalizeArch("aarch64")).toBe("arm64");
    expect(compareVersions("24.04", "24.04")).toBe(0);
    expect(compareVersions("22.04", "24.04")).toBeLessThan(0);
    expect(compareVersions("13", "12")).toBeGreaterThan(0);
  });

  test("desktop accepts its systems at the minimum versions", () => {
    expect(unsupportedReason("ubuntu", "24.04", "x64", desktopSystems)).toBeUndefined();
    expect(unsupportedReason("debian", "13", "arm64", desktopSystems)).toBeUndefined();
    expect(unsupportedReason("omarchy", "", "x64", desktopSystems)).toBeUndefined();
    expect(unsupportedReason("windows", "26100", "x64", desktopSystems)).toBeUndefined();
  });

  test("desktop rejects old versions, unknown systems and unsupported architectures", () => {
    expect(unsupportedReason("ubuntu", "22.04", "x64", desktopSystems)).toContain("older than");
    expect(unsupportedReason(undefined, "", "x64", desktopSystems)).toContain("not supported");
    expect(unsupportedReason("windows", "26100", "arm64", desktopSystems)).toContain("arm64");
    expect(unsupportedReason("mint", "22", "arm64", desktopSystems)).toContain("arm64");
  });

  test("server accepts only Ubuntu and Debian", () => {
    expect(unsupportedReason("ubuntu", "24.04", "arm64", serverSystems)).toBeUndefined();
    expect(unsupportedReason("macos", "15.1", "arm64", serverSystems)).toContain("not supported by this edition");
    expect(unsupportedReason("zorin", "18", "x64", serverSystems)).toContain("not supported by this edition");
  });
});

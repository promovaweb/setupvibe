/**
 * Shared security module (spec sections 12 and 18).
 *
 * Applied always by `setupvibe-server` and by `setupvibe` on exposed
 * machines:
 *
 * - UFW: deny incoming, allow SSH; on the server also the Swarm ports;
 * - fail2ban: the sshd jail;
 * - unattended-upgrades: automatic security updates;
 * - SSH: keys only and no root password login, but only when the working
 *   user already has an authorized key, so nobody is locked out;
 * - time: NTP sync and, when given, the time zone.
 *
 * The SSH change goes through `sshd -t` before the service reloads.
 */
import type { System } from "../inventory.ts";
import type { Step } from "../exec/runner.ts";
import { nativeInstallCmd } from "../install/methods.ts";

/** Docker Swarm ports opened on the server. */
export const SWARM_PORTS = ["2377/tcp", "7946/tcp", "7946/udp", "4789/udp"] as const;

export const SSHD_DROPIN = "/etc/ssh/sshd_config.d/10-setupvibe.conf";

export interface SecurityOptions {
  system: System;
  edition: "desktop" | "server";
  /** Working user whose authorized keys allow the SSH hardening. */
  user: string;
  /** True when the user has at least one authorized key. */
  userHasKey: boolean;
  /** Open the Swarm ports (server only). */
  swarm?: boolean;
  timezone?: string;
}

export interface SecurityPlan {
  steps: Step[];
  /** Parts skipped and why, shown in the summary. */
  skipped: { part: string; reason: string }[];
}

/** Systems where the security module applies. */
export function securitySupported(system: System): boolean {
  return ["ubuntu", "debian", "mint", "zorin", "arch", "omarchy"].includes(system);
}

/** Builds the security steps. */
export function securityPlan(o: SecurityOptions): SecurityPlan {
  const skipped: SecurityPlan["skipped"] = [];
  if (!securitySupported(o.system)) {
    return { steps: [], skipped: [{ part: "all", reason: `${o.system} keeps its own firewall and updates.` }] };
  }
  const apt = !["arch", "omarchy"].includes(o.system);
  const packages = apt ? ["ufw", "fail2ban", "unattended-upgrades", "systemd-timesyncd"] : ["ufw", "fail2ban"];
  const steps: Step[] = [
    { id: "security-packages", description: `Install ${packages.join(", ")}`, commands: nativeInstallCmd(o.system, packages) },
    {
      id: "ufw",
      description: o.swarm ? "Firewall: deny incoming, allow SSH and the Swarm ports" : "Firewall: deny incoming, allow SSH",
      commands: [
        { argv: ["ufw", "default", "deny", "incoming"], sudo: true },
        { argv: ["ufw", "default", "allow", "outgoing"], sudo: true },
        { argv: ["ufw", "allow", "OpenSSH"], sudo: true, optional: true },
        { argv: ["ufw", "allow", "22/tcp"], sudo: true },
        ...(o.swarm && o.edition === "server" ? SWARM_PORTS.map((p) => ({ argv: ["ufw", "allow", p], sudo: true })) : []),
        { argv: ["ufw", "--force", "enable"], sudo: true },
      ],
    },
    {
      id: "fail2ban",
      description: "fail2ban: enable the sshd jail",
      commands: [
        { argv: ["tee", "/etc/fail2ban/jail.d/setupvibe.local"], sudo: true, input: "# Managed by SetupVibe\n[sshd]\nenabled = true\nmaxretry = 5\nbantime = 1h\n" },
        { argv: ["systemctl", "enable", "--now", "fail2ban"], sudo: true },
        { argv: ["systemctl", "restart", "fail2ban"], sudo: true },
      ],
    },
  ];
  if (apt) {
    steps.push({
      id: "unattended-upgrades",
      description: "Automatic security updates",
      commands: [
        { argv: ["tee", "/etc/apt/apt.conf.d/20auto-upgrades"], sudo: true, input: 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n' },
        { argv: ["systemctl", "enable", "--now", "unattended-upgrades"], sudo: true },
      ],
    });
  } else {
    skipped.push({ part: "unattended-upgrades", reason: "Arch has no unattended upgrades; updates stay with the user." });
  }
  if (o.userHasKey) {
    steps.push({
      id: "ssh-hardening",
      description: "SSH: keys only, no root password login",
      commands: [
        { argv: ["tee", SSHD_DROPIN], sudo: true, input: "# Managed by SetupVibe\nPasswordAuthentication no\nKbdInteractiveAuthentication no\nPermitRootLogin prohibit-password\n" },
        { argv: ["sshd", "-t"], sudo: true },
        { argv: ["sh", "-c", "systemctl reload ssh 2>/dev/null || systemctl reload sshd"], sudo: true },
      ],
    });
  } else {
    skipped.push({ part: "ssh-hardening", reason: `${o.user} has no authorized SSH key; password login stays on so nobody is locked out.` });
  }
  steps.push({
    id: "time-sync",
    description: o.timezone ? `Time sync and time zone ${o.timezone}` : "Time sync",
    commands: [
      // Containers and some VMs cannot sync time; that must not fail the module.
      { argv: ["timedatectl", "set-ntp", "true"], sudo: true, optional: true },
      ...(o.timezone ? [{ argv: ["timedatectl", "set-timezone", o.timezone], sudo: true }] : []),
    ],
  });
  return { steps, skipped };
}

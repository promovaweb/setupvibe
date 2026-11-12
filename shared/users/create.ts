/**
 * `user create`: the working user that owns the SetupVibe installation.
 *
 * On a fresh server only root exists. This command is one of the two that
 * run as root (spec section 3): it creates the user, adds it to the sudo
 * group, installs an SSH public key and, when asked, a sudoers rule without
 * password. The rule is validated with `visudo -c` before it is moved into
 * place, so a bad file never locks sudo.
 */
import type { System } from "../inventory.ts";
import type { Step } from "../exec/runner.ts";

/** Valid Linux user names (conservative subset of useradd rules). */
export const USER_NAME = /^[a-z_][a-z0-9_-]{0,31}$/;

/** Valid SSH public key line. */
export const SSH_KEY = /^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp(256|384|521)|sk-ssh-ed25519@openssh\.com|sk-ecdsa-sha2-nistp256@openssh\.com) [A-Za-z0-9+/=]+( [^\n]*)?$/;

export interface UserCreateOptions {
  name: string;
  system: System;
  sshKey?: string;
  /** Sudo without password (temporary in `auto`, spec section 9). */
  nopasswd?: boolean;
  /** Login shell; bash by default, zsh is set later by the shell items. */
  shell?: string;
}

/** Sudo group of a system. */
export function sudoGroup(system: System): string {
  return system === "arch" || system === "omarchy" ? "wheel" : "sudo";
}

/** Path of the SetupVibe sudoers rule for a user. */
export function sudoersPath(name: string): string {
  return `/etc/sudoers.d/90-setupvibe-${name}`;
}

/**
 * Validates the options.
 *
 * @throws when the name or the key is invalid, or the system has no useradd
 */
export function validateUserOptions(o: UserCreateOptions): void {
  if (!USER_NAME.test(o.name)) throw new Error(`Invalid user name: ${o.name}. Use lowercase letters, digits, - and _.`);
  if (o.name === "root") throw new Error("The working user cannot be root.");
  if (o.sshKey !== undefined && !SSH_KEY.test(o.sshKey.trim())) throw new Error("The SSH key must be a single public key line, such as ssh-ed25519 AAAA...");
  if (o.system === "macos" || o.system === "windows") throw new Error(`user create is not available on ${o.system}; create the account in the system settings.`);
}

/** Steps that create the user. Run as root. */
export function userCreatePlan(o: UserCreateOptions): Step[] {
  validateUserOptions(o);
  const group = sudoGroup(o.system);
  const home = `/home/${o.name}`;
  const steps: Step[] = [
    {
      id: "user",
      description: `Create the user ${o.name} with a home folder and the ${group} group`,
      skipIf: { argv: ["id", "-u", o.name] },
      commands: [{ argv: ["useradd", "--create-home", "--shell", o.shell ?? "/bin/bash", "--groups", group, o.name], sudo: true }],
    },
    {
      id: "group",
      description: `Make sure ${o.name} is in the ${group} group`,
      commands: [{ argv: ["usermod", "--append", "--groups", group, o.name], sudo: true }],
    },
  ];
  if (o.sshKey) {
    steps.push({
      id: "ssh-key",
      description: `Install the SSH public key in ${home}/.ssh/authorized_keys`,
      commands: [
        { argv: ["install", "-d", "-m", "0700", "-o", o.name, "-g", o.name, `${home}/.ssh`], sudo: true },
        { argv: ["sh", "-c", 'f="$1"; touch "$f"; grep -qxF "$2" "$f" || printf "%s\\n" "$2" >> "$f"', "sh", `${home}/.ssh/authorized_keys`, o.sshKey.trim()], sudo: true },
        { argv: ["chown", `${o.name}:${o.name}`, `${home}/.ssh/authorized_keys`], sudo: true },
        { argv: ["chmod", "0600", `${home}/.ssh/authorized_keys`], sudo: true },
      ],
    });
  }
  if (o.nopasswd) steps.push(nopasswdStep(o.name));
  return steps;
}

/** Step that writes the NOPASSWD rule, validated before it is installed. */
export function nopasswdStep(name: string): Step {
  const target = sudoersPath(name);
  const tmp = `${target}.tmp`;
  return {
    id: "sudo-nopasswd",
    description: `Allow ${name} to use sudo without a password (${target})`,
    commands: [
      { argv: ["tee", tmp], sudo: true, input: `# Managed by SetupVibe. Remove with: setupvibe user nopasswd --remove ${name}\n${name} ALL=(ALL) NOPASSWD:ALL\n` },
      { argv: ["chmod", "0440", tmp], sudo: true },
      { argv: ["visudo", "-cf", tmp], sudo: true },
      { argv: ["mv", tmp, target], sudo: true },
    ],
  };
}

/** Step that removes the NOPASSWD rule (end of `auto`, unless --keep-nopasswd). */
export function removeNopasswdStep(name: string): Step {
  return {
    id: "sudo-nopasswd-remove",
    description: `Remove the sudo rule without password for ${name}`,
    commands: [{ argv: ["rm", "-f", sudoersPath(name)], sudo: true }],
  };
}

/** Define edições e compatibilidade sem modificar o ambiente consultado. */
export type Edition = 'desktop' | 'server';
export interface Target { edition: Edition; system: string; arch: string; }
/** Recusa plataformas fora da matriz inicial antes de plan operações. */
export function validateTarget(target: Target): void {
  if (!target || typeof target !== 'object' || !['desktop','server'].includes(target.edition)) throw new Error("Unsupported edition.");
  if (!['x64', 'arm64'].includes(target.arch)) throw new Error("Unsupported architecture.");
  if (!['linux', 'darwin'].includes(target.system)) throw new Error("Unsupported operating system.");
  if (target.edition === 'server' && target.system !== 'linux') throw new Error("Server edition requires Linux.");
}

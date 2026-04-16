import { randomBytes, scryptSync } from 'crypto';

export function buildSeedPasswordHash(plainPassword: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plainPassword, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

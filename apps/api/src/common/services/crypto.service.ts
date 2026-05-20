import { Injectable } from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

@Injectable()
export class CryptoService {
  hash(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `scrypt$${salt}$${hash}`;
  }

  verify(password: string, hash: string): boolean {
    if (!hash.startsWith('scrypt$')) {
      return false;
    }

    const [, salt, storedHash] = hash.split('$');
    if (!salt || !storedHash) {
      return false;
    }

    const derived = scryptSync(password, salt, 64).toString('hex');
    return timingSafeEqual(Buffer.from(derived), Buffer.from(storedHash));
  }

  isValidHash(hash: string | null | undefined): boolean {
    if (!hash) return false;
    return hash.startsWith('scrypt$');
  }

  generateToken(bytes: number = 24): string {
    return randomBytes(bytes).toString('base64url');
  }
}

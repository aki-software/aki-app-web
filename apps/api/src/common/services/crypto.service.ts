import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import * as bcrypt from 'bcrypt';

const scryptAsync = promisify(scrypt);

@Injectable()
export class CryptoService {
  async hash(password: string): Promise<string> {
    // 12 salt rounds is the current industry standard
    return bcrypt.hash(password, 12);
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    if (!storedHash) return false;

    // Legacy Support: Check if the hash uses the old custom format
    if (storedHash.startsWith('scrypt$')) {
      const parts = storedHash.split('$');
      if (parts.length !== 3) return false;

      const [, salt, hashHex] = parts;
      try {
        const derivedBuffer = (await scryptAsync(password, salt, 64)) as Buffer;
        const storedHashBuffer = Buffer.from(hashHex, 'hex');
        if (derivedBuffer.length !== storedHashBuffer.length) return false;
        return timingSafeEqual(derivedBuffer, storedHashBuffer);
      } catch {
        return false;
      }
    }

    // Modern Support: Use bcrypt for standard hashes ($2a$, $2b$, etc.)
    return bcrypt.compare(password, storedHash);
  }

  isValidHash(hash: string | null | undefined): boolean {
    if (!hash) return false;
    // Consider both bcrypt ($2a$, $2b$, $2y$) and legacy (scrypt$) as valid formats
    return (
      hash.startsWith('$2b$') ||
      hash.startsWith('$2a$') ||
      hash.startsWith('$2y$') ||
      hash.startsWith('scrypt$')
    );
  }

  generateToken(bytes = 32): string {
    return randomBytes(bytes).toString('hex');
  }
}

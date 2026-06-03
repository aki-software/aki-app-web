import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

@Injectable()
export class CryptoService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedBuffer = (await scryptAsync(password, salt, 64)) as Buffer;
    const hashHex = derivedBuffer.toString('hex');
    return `scrypt$${salt}$${hashHex}`;
  }

  async verify(password: string, hash: string): Promise<boolean> {
    if (!hash.startsWith('scrypt$')) {
      return false;
    }

    const [, salt, storedHash] = hash.split('$');
    if (!salt || !storedHash) {
      return false;
    }

    const derivedBuffer = (await scryptAsync(password, salt, 64)) as Buffer;
    const storedHashBuffer = Buffer.from(storedHash, 'hex');
    return timingSafeEqual(derivedBuffer, storedHashBuffer);
  }

  isValidHash(hash: string | null | undefined): boolean {
    if (!hash) return false;
    return hash.startsWith('scrypt$');
  }

  generateToken(bytes: number = 24): string {
    return randomBytes(bytes).toString('base64url');
  }
}

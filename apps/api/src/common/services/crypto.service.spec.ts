import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService } from './crypto.service.js';
import { scryptSync } from 'node:crypto';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoService],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hash and verify', () => {
    it('should hash a password using bcrypt and verify it', async () => {
      const password = 'Password123!';
      const hash = await service.hash(password);
      expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt hash format
      expect(await service.verify(password, hash)).toBe(true);
    });

    it('should fail verification for incorrect password', async () => {
      const password = 'Password123!';
      const hash = await service.hash(password);
      expect(await service.verify('WrongPassword', hash)).toBe(false);
    });

    it('should be compatible with legacy scrypt hashes (fallback)', async () => {
      const password = 'test-legacy';
      const salt = 'abcd';
      const hash = scryptSync(password, salt, 64).toString('hex');
      const fullHash = `scrypt$${salt}$${hash}`;

      expect(await service.verify(password, fullHash)).toBe(true);
    });

    it('should reject invalid legacy scrypt hashes', async () => {
      const password = 'test-legacy';
      const salt = 'abcd';
      const hash = scryptSync('wrong', salt, 64).toString('hex');
      const fullHash = `scrypt$${salt}$${hash}`;

      expect(await service.verify(password, fullHash)).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a hex token of correct length', () => {
      const token = service.generateToken(24);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      // hex encoding for 24 bytes is 48 chars
      expect(token).toHaveLength(48);
    });

    it('should generate tokens of different lengths', () => {
      const token16 = service.generateToken(16);
      expect(token16.length).toBeLessThan(service.generateToken(24).length);
    });
  });
});

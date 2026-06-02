import { InMemoryReportCacheService } from './in-memory-report-cache.service.js';

describe('InMemoryReportCacheService', () => {
  let service: InMemoryReportCacheService;

  beforeEach(() => {
    service = new InMemoryReportCacheService();
  });

  describe('get and set', () => {
    it('returns null for missing key', () => {
      expect(service.get('missing')).toBeNull();
    });

    it('returns value if not expired', () => {
      service.set('key', 'value', 1000);
      expect(service.get('key')).toBe('value');
    });

    it('returns null if expired', () => {
      service.set('key', 'value', -1000);
      expect(service.get('key')).toBeNull();
    });
  });

  describe('getOrCreate', () => {
    it('returns cached value if exists', async () => {
      service.set('key', 'value', 1000);
      const result = await service.getOrCreate('key', async () => 'new');
      expect(result).toBe('value');
    });

    it('calls factory if missing', async () => {
      const result = await service.getOrCreate('key', async () => 'new');
      expect(result).toBe('new');
      expect(service.get('key')).toBe('new');
    });

    it('prevents concurrent factory calls', async () => {
      let callCount = 0;
      const factory = async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'new';
      };

      const [res1, res2] = await Promise.all([
        service.getOrCreate('key', factory),
        service.getOrCreate('key', factory),
      ]);

      expect(res1).toBe('new');
      expect(res2).toBe('new');
      expect(callCount).toBe(1);
    });
  });

  describe('withLock', () => {
    it('returns factory result', async () => {
      const result = await service.withLock('key', async () => 'value');
      expect(result).toBe('value');
    });

    it('prevents concurrent execution', async () => {
      let callCount = 0;
      const factory = async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'value';
      };

      const [res1, res2] = await Promise.all([
        service.withLock('key', factory),
        service.withLock('key', factory),
      ]);

      expect(res1).toBe('value');
      expect(res2).toBe('value');
      expect(callCount).toBe(1);
    });
  });
});

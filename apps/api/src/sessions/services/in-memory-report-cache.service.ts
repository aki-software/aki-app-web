import { Injectable, Logger } from '@nestjs/common';
import { IReportCacheService } from '../interfaces/report-cache.interface.js';

@Injectable()
export class InMemoryReportCacheService implements IReportCacheService {
  private readonly locks = new Map<string, Promise<any>>();
  private readonly cache = new Map<
    string,
    { value: unknown; expiresAt: number }
  >();
  private readonly logger = new Logger(InMemoryReportCacheService.name);
  private readonly defaultTtlMs = 5 * 60 * 1000;

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }
    if (cached.expiresAt > Date.now()) {
      return cached.value as T;
    }
    this.cache.delete(key);
    return null;
  }

  set<T>(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  async getOrCreate<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs = this.defaultTtlMs,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached) {
      this.logger.debug(`Cache hit for key: ${key}`);
      return cached;
    }
    this.logger.debug(`Cache miss for key: ${key}`);
    return this.withLock(`lock:${key}`, async () => {
      const cachedAfterLock = this.get<T>(key);
      if (cachedAfterLock) {
        this.logger.debug(`Cache hit after lock for key: ${key}`);
        return cachedAfterLock;
      }
      const value = await factory();
      this.set(key, value, ttlMs);
      return value;
    });
  }

  async withLock<T>(key: string, factory: () => Promise<T>): Promise<T> {
    if (this.locks.has(key)) {
      this.logger.debug(`Lock acquired for key: ${key}`);
      return this.locks.get(key) as Promise<T>;
    }

    this.logger.debug(`Creating new lock for key: ${key}`);
    const promise = factory().finally(() => {
      this.locks.delete(key);
    });

    this.locks.set(key, promise);
    return promise;
  }
}

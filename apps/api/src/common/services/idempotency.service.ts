import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class IdempotencyService implements OnModuleDestroy {
  private readonly redis: Redis | null = null;
  private useRedis = false;
  private readonly memoryStore = new Map<string, { value: string; expiresAt: number }>();

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          connectTimeout: 5000,
        });
        this.useRedis = true;
        console.log('[Idempotency] Using Redis backend');
      } catch (error) {
        console.warn(
          '[Idempotency] Failed to connect to Redis, falling back to memory',
          error,
        );
        this.useRedis = false;
      }
    } else {
      console.log('[Idempotency] REDIS_URL not set, using memory backend');
      this.useRedis = false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.useRedis && this.redis) {
      try {
        return await this.redis.get(`idempotency:${key}`);
      } catch (error) {
        console.error('[Idempotency] Redis error on GET, falling back to memory', error);
      }
    }
    const record = this.memoryStore.get(key);
    if (record && record.expiresAt > Date.now()) {
      return record.value;
    }
    if (record) {
      this.memoryStore.delete(key);
    }
    return null;
  }

  async set(key: string, value: string, ttlSeconds = 86400): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        await this.redis.set(`idempotency:${key}`, value, 'EX', ttlSeconds);
        return;
      } catch (error) {
        console.error('[Idempotency] Redis error on SET, falling back to memory', error);
      }
    }
    this.memoryStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(`idempotency:${key}`);
        return;
      } catch (error) {
        console.error('[Idempotency] Redis error on DELETE, falling back to memory', error);
      }
    }
    this.memoryStore.delete(key);
  }

  onModuleDestroy() {
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}

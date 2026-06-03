import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class IdempotencyService implements OnModuleDestroy {
  private readonly logger = new Logger(IdempotencyService.name);
  private redis: Redis | null = null;
  private useRedis = false;
  private readonly memoryStore = new Map<
    string,
    { value: string; expiresAt: number }
  >();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          connectTimeout: 5000,
        });

        this.redis.on('error', (error) => {
          this.logger.warn(
            `Redis connection error, falling back to memory: ${error.message}`,
          );
          this.useRedis = false;
        });

        this.redis.on('connect', () => {
          this.logger.log('Connected to Redis backend');
          this.useRedis = true;
        });

        this.useRedis = true;
        this.logger.log('Initializing Redis backend');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to initialize Redis, falling back to memory: ${errorMessage}`,
        );
        this.useRedis = false;
      }
    } else {
      this.logger.log('REDIS_URL not set, using memory backend');
      this.useRedis = false;
    }

    this.cleanupInterval = setInterval(() => this.cleanupMemoryStore(), 60000);
  }

  async tryLock(key: string, ttlSeconds = 120): Promise<boolean> {
    if (this.useRedis && this.redis) {
      try {
        const result = await this.redis.set(
          `idempotency:${key}`,
          'processing',
          'EX',
          ttlSeconds,
          'NX',
        );
        return result === 'OK';
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Redis error on tryLock, falling back to memory: ${errorMessage}`,
        );
      }
    }

    const now = Date.now();
    const record = this.memoryStore.get(key);

    if (record && record.expiresAt > now) {
      return false;
    }

    this.memoryStore.set(key, {
      value: 'processing',
      expiresAt: now + ttlSeconds * 1000,
    });
    return true;
  }

  async get(key: string): Promise<string | null> {
    if (this.useRedis && this.redis) {
      try {
        return await this.redis.get(`idempotency:${key}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Redis error on GET, falling back to memory: ${errorMessage}`,
        );
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
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Redis error on SET, falling back to memory: ${errorMessage}`,
        );
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
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Redis error on DELETE, falling back to memory: ${errorMessage}`,
        );
      }
    }
    this.memoryStore.delete(key);
  }

  private cleanupMemoryStore() {
    const now = Date.now();
    for (const [key, bucket] of this.memoryStore.entries()) {
      if (bucket.expiresAt <= now) {
        this.memoryStore.delete(key);
      }
    }
  }

  onModuleDestroy() {
    clearInterval(this.cleanupInterval);
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}

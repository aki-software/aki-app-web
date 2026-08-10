import {
  Injectable,
  OnModuleDestroy,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly logger = new Logger(RateLimitService.name);
  private redis: Redis | null = null;
  private useRedis = false;
  private readonly allowMemoryFallback: boolean;
  private memoryStore = new Map<string, { count: number; resetAt: number }>();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {
    const environment = this.configService.get<string>('NODE_ENV');
    this.allowMemoryFallback =
      (environment === 'development' || environment === 'test') &&
      this.configService.get<string>('RATE_LIMIT_MEMORY_FALLBACK') === 'true';
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const redisHost = this.configService.get<string>('REDIS_HOST');

    if (redisUrl || redisHost) {
      try {
        this.redis = redisUrl
          ? new Redis(redisUrl, {
              maxRetriesPerRequest: 1,
              lazyConnect: true,
              connectTimeout: 5000,
            })
          : new Redis({
              host: redisHost,
              port: this.configService.get<number>('REDIS_PORT', 6379),
              password:
                this.configService.get<string>('REDIS_PASSWORD') || undefined,
              maxRetriesPerRequest: 1,
              lazyConnect: true,
              connectTimeout: 5000,
            });

        this.redis.on('error', () => {
          this.logger.warn('Redis rate-limit connection error');
          this.useRedis = false;
        });

        this.redis.on('connect', () => {
          this.logger.log('Connected to Redis backend');
          this.useRedis = true;
        });

        this.useRedis = true;
        this.logger.log('Initializing Redis backend');
      } catch {
        this.logger.warn('Failed to initialize Redis rate-limit backend');
        this.useRedis = false;
      }
    } else {
      this.logger.log('Redis rate-limit configuration not set');
      this.useRedis = false;
    }

    // Clean up expired memory buckets every minute
    this.cleanupInterval = setInterval(() => this.cleanupMemoryStore(), 60000);
  }

  async checkRateLimit(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowSec = Math.floor(windowMs / 1000);

    if (this.useRedis && this.redis) {
      return this.checkRedis(key, limit, windowSec, now);
    }

    if (this.allowMemoryFallback) {
      return this.checkMemory(key, limit, windowMs, now);
    }

    throw this.redisUnavailable();
  }

  private async checkRedis(
    key: string,
    limit: number,
    windowSec: number,
    now: number,
  ): Promise<RateLimitResult> {
    if (!this.redis) {
      throw this.redisUnavailable();
    }

    try {
      const redisKey = `ratelimit:${key}`;
      const current = await this.redis.incr(redisKey);

      if (current === 1) {
        await this.redis.expire(redisKey, windowSec);
      }

      const ttl = await this.redis.ttl(redisKey);
      const resetAt = now + ttl * 1000;
      const remaining = Math.max(0, limit - current);

      return {
        allowed: current <= limit,
        remaining,
        resetAt,
      };
    } catch {
      this.logger.error('Redis rate-limit operation failed');
      throw this.redisUnavailable();
    }
  }

  private checkMemory(
    key: string,
    limit: number,
    windowMs: number,
    now: number,
  ): RateLimitResult {
    const bucket = this.memoryStore.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.memoryStore.set(key, { count: 1, resetAt: now + windowMs });
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt: now + windowMs,
      };
    }

    if (bucket.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: bucket.resetAt,
      };
    }

    bucket.count += 1;
    this.memoryStore.set(key, bucket);

    return {
      allowed: true,
      remaining: limit - bucket.count,
      resetAt: bucket.resetAt,
    };
  }

  private cleanupMemoryStore() {
    const now = Date.now();
    for (const [key, bucket] of this.memoryStore.entries()) {
      if (bucket.resetAt <= now) {
        this.memoryStore.delete(key);
      }
    }
  }

  private redisUnavailable(): ServiceUnavailableException {
    return new ServiceUnavailableException({
      statusCode: 503,
      error: 'Service Unavailable',
      code: 'RATE_LIMIT_BACKEND_UNAVAILABLE',
      message: 'Rate limiting is temporarily unavailable',
    });
  }

  onModuleDestroy() {
    clearInterval(this.cleanupInterval);
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private redis: Redis | null = null;
  private useRedis = false;
  private memoryStore = new Map<string, { count: number; resetAt: number }>();

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
        console.log('[RateLimit] Using Redis backend');
      } catch (error) {
        console.warn(
          '[RateLimit] Failed to connect to Redis, falling back to memory',
          error,
        );
        this.useRedis = false;
      }
    } else {
      console.log('[RateLimit] REDIS_URL not set, using memory backend');
      this.useRedis = false;
    }
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

    return this.checkMemory(key, limit, windowMs, now);
  }

  private async checkRedis(
    key: string,
    limit: number,
    windowSec: number,
    now: number,
  ): Promise<RateLimitResult> {
    if (!this.redis) {
      return this.checkMemory(key, limit, windowSec * 1000, now);
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
    } catch (error) {
      console.error('[RateLimit] Redis error, falling back to memory', error);
      return this.checkMemory(key, limit, windowSec * 1000, now);
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

  onModuleDestroy() {
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  RATE_LIMIT_METADATA_KEY,
  RateLimitMeta,
} from '../decorators/rate-limit.decorator';

type Bucket = { count: number; resetAt: number };

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const meta = this.reflector.getAllAndOverride<RateLimitMeta>(
      RATE_LIMIT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!meta) return true;

    const req = context.switchToHttp().getRequest<{
      ip?: string;
      route?: { path?: string };
      originalUrl?: string;
      user?: { userId?: string };
    }>();

    const actor = req.user?.userId || req.ip || 'unknown';
    const route = req.route?.path || req.originalUrl || 'unknown-route';
    const key = `${actor}:${route}`;
    const now = Date.now();

    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + meta.windowMs });
      return true;
    }

    if (bucket.count >= meta.limit) {
      throw new HttpException(
        'Demasiadas solicitudes. Intenta nuevamente en unos minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.count += 1;
    this.buckets.set(key, bucket);
    return true;
  }
}

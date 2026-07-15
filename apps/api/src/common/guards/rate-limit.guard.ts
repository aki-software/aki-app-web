import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import {
  RATE_LIMIT_METADATA_KEY,
  RateLimitMeta,
} from '../decorators/rate-limit.decorator.js';
import { RateLimitService } from '../services/rate-limit.service.js';

type RequestWithUser = Request & { user?: { userId?: string } };

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<RateLimitMeta>(
      RATE_LIMIT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!meta) return true;

    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const res = context.switchToHttp().getResponse<Response>();

    const key = this.generateKey(req);

    const result = await this.rateLimitService.checkRateLimit(
      key,
      meta.limit,
      meta.windowMs,
    );

    res.set('X-RateLimit-Limit', meta.limit.toString());
    res.set('X-RateLimit-Remaining', result.remaining.toString());
    res.set('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString());

    if (!result.allowed) {
      throw new HttpException(
        'Demasiadas solicitudes. Intenta nuevamente en unos minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private generateKey(req: RequestWithUser): string {
    const actor = req.user?.userId || req.ip || 'unknown';
    const routeObj = req.route as { path?: string } | undefined;
    const route = routeObj?.path || req.originalUrl || 'unknown-route';
    return `ratelimit:${actor}:${route}`;
  }
}

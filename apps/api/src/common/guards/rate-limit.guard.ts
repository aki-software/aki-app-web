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

    const key = this.generateKey(req, meta);

    const result = await this.rateLimitService.checkRateLimit(
      key,
      meta.limit,
      meta.windowMs,
    );

    res.set('X-RateLimit-Limit', meta.limit.toString());
    res.set('X-RateLimit-Remaining', result.remaining.toString());
    res.set('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString());

    if (!result.allowed) {
      res.set(
        'Retry-After',
        Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)).toString(),
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          code: 'PAYMENT_RATE_LIMITED',
          message: 'Payment request rate limit exceeded',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private generateKey(req: RequestWithUser, meta?: RateLimitMeta): string {
    const policy =
      meta?.keyPrefix ||
      meta?.policy ||
      (req.originalUrl?.toLowerCase().includes('/webhooks/payments/')
        ? 'payment.webhook'
        : 'ratelimit');
    if (policy === 'payment.webhook') {
      return `${policy}:${req.ip || 'unknown'}:${this.webhookGateway(req)}`;
    }

    const principal = req.user?.userId || 'anonymous';
    const institution =
      (req.user as { institutionId?: string } | undefined)?.institutionId ||
      'none';
    return `${policy}:${principal}:${institution}`;
  }

  private webhookGateway(req: RequestWithUser): string {
    const param = (req.params as { gateway?: string } | undefined)?.gateway;
    const candidate =
      param || req.originalUrl?.split('?')[0].split('/').pop() || 'unknown';
    return candidate.toUpperCase() === 'MERCADO_PAGO'
      ? 'mercado_pago'
      : candidate.toLowerCase() === 'stripe'
        ? 'stripe'
        : 'invalid';
  }
}

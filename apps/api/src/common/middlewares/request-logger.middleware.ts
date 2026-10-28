import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { RequestCorrelationContext } from '../context/request-correlation.context.js';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(
    private readonly logger: PinoLogger,
    private readonly correlationContext: RequestCorrelationContext,
  ) {
    this.logger.setContext(RequestLoggerMiddleware.name);
  }

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const method = req.method;
    const path = normalizePath(req.originalUrl);
    const requestId = this.correlationContext.getRequestId();
    this.logger.info(
      { event: 'http.request', request_id: requestId, method, path },
      'Incoming request',
    );

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;
      this.logger.info(
        {
          event: 'http.response',
          request_id: requestId,
          method,
          path,
          status: statusCode,
          durationMs: duration,
        },
        'Request completed',
      );
    });

    next();
  }
}

function normalizePath(originalUrl: string): string {
  const path = originalUrl.split('?')[0].split('#')[0];
  const normalized = path.replace(
    /\/webhooks\/payments\/(stripe|mercado_pago)/i,
    (_match, gateway: string) => `/webhooks/payments/${gateway.toLowerCase()}`,
  );
  return normalized
    .split('/')
    .map((segment) => (isSensitivePathSegment(segment) ? ':id' : segment))
    .join('/');
}

function isSensitivePathSegment(segment: string): boolean {
  return (
    /^\d+$/.test(segment) ||
    /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment) ||
    /^[0-9a-f]{32,}$/i.test(segment) ||
    /^[^/\s@]+@[^/\s@]+\.[^/\s@]+$/.test(segment) ||
    (segment.length >= 24 && /[a-z]/i.test(segment) && /\d/.test(segment))
  );
}

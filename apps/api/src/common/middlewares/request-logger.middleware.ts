import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('IncomingRequest');

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const method = req.method;
    const path = normalizePath(req.originalUrl);
    const correlationId = correlationIdFrom(req);

    this.logger.log(
      JSON.stringify({
        event: 'http.request',
        correlationId,
        method,
        path,
      }),
    );

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;
      this.logger.log(
        JSON.stringify({
          event: 'http.response',
          correlationId,
          method,
          path,
          status: statusCode,
          durationMs: duration,
        }),
      );
    });

    next();
  }
}

function normalizePath(originalUrl: string): string {
  const path = originalUrl.split('?')[0];
  return path.replace(
    /\/webhooks\/payments\/(stripe|mercado_pago)/i,
    (_match, gateway: string) => `/webhooks/payments/${gateway.toLowerCase()}`,
  );
}

function correlationIdFrom(req: Request): string {
  const value = req.headers['x-request-id'];
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && /^[A-Za-z0-9._-]{1,128}$/.test(candidate)
    ? candidate
    : randomUUID();
}

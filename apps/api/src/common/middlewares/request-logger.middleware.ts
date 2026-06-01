import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('IncomingRequest');

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, originalUrl, body, headers } = req;
    
    // Log inmediato apenas entra la petición (para no estar a ciegas)
    this.logger.log(`>> [REQ] ${method} ${originalUrl} - IP: ${req.ip}`);
    if (originalUrl.includes('/vouchers/redeem') || originalUrl.includes('/sessions/complete')) {
      this.logger.debug(`>> [PAYLOAD] ${method} ${originalUrl} - Body: ${JSON.stringify(body)}`);
    }

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;
      this.logger.log(`<< [RES] ${method} ${originalUrl} - ${statusCode} - ${duration}ms`);
    });

    next();
  }
}

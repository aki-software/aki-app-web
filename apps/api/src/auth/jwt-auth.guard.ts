import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const hasAuthorizationHeader = !!req.headers?.authorization;
    this.logger.debug(
      `JWT check ${req.method} ${req.originalUrl || req.url} authHeader=${hasAuthorizationHeader ? 'present' : 'missing'}`,
    );
    return super.canActivate(context);
  }

  handleRequest(err: unknown, user: unknown, info: unknown, context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    if (err || !user) {
      const reason =
        (err as Error | undefined)?.message ||
        (typeof info === 'string'
          ? info
          : (info as { message?: string } | undefined)?.message) ||
        'unknown';

      this.logger.warn(
        `JWT auth failed ${req.method} ${req.originalUrl || req.url}: ${reason}`,
      );
    }
    return super.handleRequest(err, user, info, context);
  }
}

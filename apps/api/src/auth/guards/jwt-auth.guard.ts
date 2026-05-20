import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AUTH_JWT_LOG_MESSAGES } from '../auth.constants.js';
import type { AuthenticatedRequest } from '../auth.types.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const hasAuthorizationHeader = !!req.headers?.authorization;
    this.logger.debug(
      `${AUTH_JWT_LOG_MESSAGES.checkPrefix} ${req.method} ${req.originalUrl || req.url} authHeader=${hasAuthorizationHeader ? 'present' : 'missing'}`,
    );
    return super.canActivate(context);
  }

  handleRequest(
    err: unknown,
    user: unknown,
    info: unknown,
    context: ExecutionContext,
  ) {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (err || !user) {
      const reason =
        (err as Error | undefined)?.message ||
        (typeof info === 'string'
          ? info
          : (info as { message?: string } | undefined)?.message) ||
        'unknown';

      this.logger.warn(
        `${AUTH_JWT_LOG_MESSAGES.failedPrefix} ${req.method} ${req.originalUrl || req.url}: ${reason}`,
      );
    }
    return super.handleRequest(err, user, info, context);
  }
}

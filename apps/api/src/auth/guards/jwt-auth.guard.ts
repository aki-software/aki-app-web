import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AUTH_JWT_LOG_MESSAGES } from '../auth.constants.js';
import type { AuthenticatedRequest } from '../auth.types.js';
import { AuthTokenService } from '../services/auth-token.service.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly authTokenService: AuthTokenService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const hasAuthorizationHeader = !!req.headers?.authorization;
    this.logger.debug(
      `${AUTH_JWT_LOG_MESSAGES.checkPrefix} ${req.method} ${req.originalUrl || req.url} authHeader=${hasAuthorizationHeader ? 'present' : 'missing'}`,
    );

    // Check blacklist before delegating to Passport signature verification.
    // A revoked token must be rejected even if it is cryptographically valid.
    const rawToken = req.headers?.authorization?.replace('Bearer ', '');
    if (rawToken) {
      const isRevoked = await this.authTokenService.isTokenInvalidated(rawToken);
      if (isRevoked) {
        this.logger.warn(
          `${AUTH_JWT_LOG_MESSAGES.failedPrefix} ${req.method} ${req.originalUrl || req.url}: token has been revoked`,
        );
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    return super.canActivate(context) as Promise<boolean>;
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

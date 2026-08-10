import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth.types.js';

@Injectable()
export class GooglePlayPatientGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user?.role === 'PATIENT' && request.user.userId) return true;
    throw new UnauthorizedException('Android patient principal is required');
  }
}

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/auth.types.js';
import { UserRole } from '../../users/entities/user.entity.js';

@Injectable()
export class InstitutionOwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const institutionId = request.params.id;

    if (!user) {
      throw new ForbiddenException(
        'No tienes permisos para acceder a esta institución',
      );
    }

    const isOwnerOrAdmin =
      user.role?.toUpperCase() === UserRole.ADMIN ||
      user.institutionId === institutionId;

    if (!isOwnerOrAdmin) {
      throw new ForbiddenException(
        'No tienes permisos para acceder a esta institución',
      );
    }

    return true;
  }
}

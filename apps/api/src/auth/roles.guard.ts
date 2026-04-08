import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException(
        'No se encontró información de rol en la sesión',
      );
    }

    const userRole = user.role.toUpperCase();
    const hasRole = requiredRoles.some(
      (role) => role.toUpperCase() === userRole,
    );

    if (!hasRole) {
      throw new ForbiddenException(
        'No tienes los permisos necesarios para acceder a este recurso',
      );
    }

    return true;
  }
}

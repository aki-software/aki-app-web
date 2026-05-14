import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/auth.types.js';
import { UserRole } from '../../users/entities/user.entity.js';

@Injectable()
export class StatsAccessService {
  private readonly logger = new Logger(StatsAccessService.name);

  resolveInstitutionScope(
    req: AuthenticatedRequest,
    requestedInstitutionId?: string,
  ): string | undefined {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const normalizedRole = user.role?.toUpperCase();

    this.logger.debug(
      `resolveInstitutionScope userId=${user.id}, role=${user.role} (normalized=${normalizedRole}), institutionId=${user.institutionId}, queryInstitutionId=${requestedInstitutionId}`,
    );

    const isInstitutionScopedRole =
      normalizedRole === UserRole.THERAPIST ||
      normalizedRole === UserRole.INSTITUTION_ADMIN;

    if (!isInstitutionScopedRole) {
      if (normalizedRole !== UserRole.ADMIN) {
        this.logger.warn(
          `User ${user.id} with role ${user.role} attempted to access stats (insufficient permissions)`,
        );
        throw new ForbiddenException('Insufficient permissions');
      }

      return requestedInstitutionId;
    }

    if (!user.institutionId) {
      this.logger.warn(
        `${normalizedRole} user ${user.id} attempted to access stats without institutionId`,
      );
      throw new ForbiddenException(
        `${normalizedRole} must be assigned to an institution`,
      );
    }

    if (
      requestedInstitutionId &&
      requestedInstitutionId !== user.institutionId
    ) {
      this.logger.warn(
        `${normalizedRole} user ${user.id} attempted to access stats for different institution (requested=${requestedInstitutionId}, assigned=${user.institutionId})`,
      );
      throw new ForbiddenException(
        'Cannot access stats for other institutions',
      );
    }

    return user.institutionId;
  }
}

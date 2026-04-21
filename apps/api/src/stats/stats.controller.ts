import {
  Controller,
  Get,
  Query,
  Req,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  private readonly logger = new Logger(StatsController.name);

  constructor(private readonly statsService: StatsService) {}

  @Get('vouchers')
  async getVoucherStats(
    @Query('institutionId') institutionId: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    if (!user) throw new ForbiddenException('User not authenticated');

    // Normalize role to uppercase for case-insensitive comparison
    const normalizedRole = user.role?.toUpperCase();

    this.logger.debug(
      `getVoucherStats request - userId=${user.id}, role=${user.role} (normalized=${normalizedRole}), institutionId=${user.institutionId}, queryInstitutionId=${institutionId}`,
    );

    let targetInstitutionId = institutionId;

    // THERAPIST and INSTITUTION_ADMIN users can only access their own institution's stats
    if (normalizedRole === 'THERAPIST' || normalizedRole === 'INSTITUTION_ADMIN') {
      if (!user.institutionId) {
        this.logger.warn(
          `${normalizedRole} user ${user.id} attempted to access stats without institutionId`,
        );
        throw new ForbiddenException(
          `${normalizedRole} must be assigned to an institution`,
        );
      }
      // If institutionId is provided, verify it matches the user's institution
      if (institutionId && institutionId !== user.institutionId) {
        this.logger.warn(
          `${normalizedRole} user ${user.id} attempted to access stats for different institution (requested=${institutionId}, assigned=${user.institutionId})`,
        );
        throw new ForbiddenException(
          'Cannot access stats for other institutions',
        );
      }
      targetInstitutionId = user.institutionId;
    } else if (normalizedRole !== 'ADMIN') {
      this.logger.warn(
        `User ${user.id} with role ${user.role} attempted to access stats (insufficient permissions)`,
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    this.logger.log(
      `Fetching voucher stats for role=${normalizedRole} targetId=${targetInstitutionId}`,
    );

    const [stats, alerts] = await Promise.all([
      this.statsService.getVoucherStats(targetInstitutionId),
      this.statsService.getVoucherAlerts(targetInstitutionId),
    ]);

    return { stats, alerts };
  }
}

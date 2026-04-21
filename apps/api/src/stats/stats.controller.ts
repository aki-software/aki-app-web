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

    let targetInstitutionId = institutionId;

    // THERAPIST users can only access their own institution's stats
    if (user.role === 'THERAPIST') {
      if (!user.institutionId) {
        throw new ForbiddenException('Therapist must be assigned to an institution');
      }
      // If institutionId is provided, verify it matches the user's institution
      if (institutionId && institutionId !== user.institutionId) {
        throw new ForbiddenException('Cannot access stats for other institutions');
      }
      targetInstitutionId = user.institutionId;
    } else if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Insufficient permissions');
    }

    this.logger.log(
      `Fetching voucher stats for role=${user.role} targetId=${targetInstitutionId}`,
    );

    const [stats, alerts] = await Promise.all([
      this.statsService.getVoucherStats(targetInstitutionId),
      this.statsService.getVoucherAlerts(targetInstitutionId),
    ]);

    return { stats, alerts };
  }
}

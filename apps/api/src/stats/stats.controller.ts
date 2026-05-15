import { Controller, Get, Logger, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { StatsService } from './stats.service.js';
import { StatsAccessService } from './services/stats-access.service.js';
import { VoucherAlertsService } from './services/voucher-alerts.service.js';
import { VoucherStatsResponse } from '@akit/contracts';

@Controller('stats')
export class StatsController {
  private readonly logger = new Logger(StatsController.name);

  constructor(
    private readonly statsService: StatsService,
    private readonly statsAccessService: StatsAccessService,
    private readonly voucherAlertsService: VoucherAlertsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('vouchers')
  async getVoucherStats(
    @Query('institutionId') institutionId: string | undefined,
    @Req() req: AuthenticatedRequest,
  ): Promise<VoucherStatsResponse> {
    const targetInstitutionId = this.statsAccessService.resolveInstitutionScope(
      req,
      institutionId,
    );

    this.logger.log(`Fetching voucher stats targetId=${targetInstitutionId}`);

    const [stats, alerts] = await Promise.all([
      this.statsService.getVoucherStats(targetInstitutionId),
      this.voucherAlertsService.getVoucherAlerts(targetInstitutionId),
    ]);

    return { stats, alerts };
  }
}

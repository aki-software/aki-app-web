import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VouchersModule } from '../vouchers/vouchers.module.js';
import { CategoriesModule } from '../categories/categories.module.js';
import { VocationalCategory } from '../categories/entities/vocational-category.entity.js';
import { MailModule } from '../mail/mail.module.js';
import { UsersModule } from '../users/users.module.js';
import { SessionResult } from './entities/session-result.entity.js';
import { SessionSwipe } from './entities/session-swipe.entity.js';
import { Session } from './entities/session.entity.js';
import { SessionMetrics } from './entities/session-metrics.entity.js';
import { SessionsController } from './sessions.controller.js';
import { SessionsService } from './sessions.service.js';
import { AdminDashboardService } from './services/admin-dashboard.service.js';
import { AdminDashboardStatsService } from './services/admin-dashboard-stats.service.js';
import { ReportOrchestratorService } from './services/report-orchestrator.service.js';
import { ReportService } from './services/report.service.js';
import { SessionMetricsService } from './services/session-metrics.service.js';
import { SessionCompleteMapperService } from './services/session-complete-mapper.service.js';
import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';
import { TresAreasModule } from '../tres-areas/tres-areas.module.js';
import { VoucherRedemptionModule } from '../common/modules/voucher-redemption.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Session,
      SessionResult,
      SessionSwipe,
      SessionMetrics,
      VocationalCategory,
    ]),
    CategoriesModule,
    MailModule,
    UsersModule,
    TresAreasModule,
    VoucherRedemptionModule,
    VouchersModule,
  ],
  controllers: [SessionsController],
  providers: [
    SessionsService,
    ReportService,
    AdminDashboardService,
    AdminDashboardStatsService,
    ReportOrchestratorService,
    SessionMetricsService,
    SessionCompleteMapperService,
    RateLimitGuard,
  ],
  exports: [SessionsService, SessionMetricsService],
})
export class SessionsModule {}

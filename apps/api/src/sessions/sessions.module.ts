import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VouchersModule } from '../vouchers/vouchers.module.js';
import { CategoriesModule } from '../categories/categories.module.js';
import { VocationalCategory } from '../categories/entities/vocational-category.entity.js';
import { BullModule } from '@nestjs/bullmq';
import { UsersModule } from '../users/users.module.js';
import { SessionResult } from './entities/session-result.entity.js';
import { SessionSwipe } from './entities/session-swipe.entity.js';
import { Session } from './entities/session.entity.js';
import { SessionMetrics } from './entities/session-metrics.entity.js';
import { SessionsController } from './sessions.controller.js';
import { SessionsQueryService } from './services/sessions-query.service.js';
import { SessionsMutationService } from './services/sessions-mutation.service.js';
import { SessionsOrchestratorService } from './services/sessions-orchestrator.service.js';
import { AdminDashboardService } from './services/admin-dashboard.service.js';
import { ReportOrchestratorService } from './services/report-orchestrator.service.js';
import { ReportDeliveryService } from './services/report-delivery.service.js';
import { ReportService } from './services/report.service.js';
import { SessionMetricsService } from './services/session-metrics.service.js';
import { SessionOwnerResolverService } from './services/session-owner-resolver.service.js';
import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';
import { AdminDashboardRepository } from './repositories/admin-dashboard.repository.js';
import { TresAreasModule } from '../tres-areas/tres-areas.module.js';
import { CalculateMetricsHandler } from './services/calculate-metrics.handler.js';
import { ReportsModule } from '../reports/reports.module.js';

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
    BullModule.registerQueue({ name: 'reports' }),
    BullModule.registerQueue({ name: 'metrics' }),
    UsersModule,
    TresAreasModule,
    VouchersModule,
    forwardRef(() => ReportsModule),
  ],
  controllers: [SessionsController],
  providers: [
    SessionsQueryService,
    SessionsMutationService,
    SessionsOrchestratorService,
    ReportService,
    AdminDashboardService,
    AdminDashboardRepository,
    ReportOrchestratorService,
    ReportDeliveryService,
    SessionMetricsService,
    SessionOwnerResolverService,
    RateLimitGuard,
    CalculateMetricsHandler,
  ],
  exports: [
    SessionsQueryService,
    SessionsMutationService,
    SessionsOrchestratorService,
    SessionMetricsService,
    ReportService,
  ],
})
export class SessionsModule {}

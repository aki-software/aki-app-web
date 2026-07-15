import { Module, OnModuleInit } from '@nestjs/common';
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
import { ReportOrchestratorService } from './services/report-orchestrator.service.js';
import { InMemoryReportCacheService } from './services/in-memory-report-cache.service.js';
import { ReportPdfService } from './services/report-pdf.service.js';
import { ReportDeliveryService } from './services/report-delivery.service.js';
import { ReportService } from './services/report.service.js';
import { SessionMetricsService } from './services/session-metrics.service.js';
import { SessionOwnerResolverService } from './services/session-owner-resolver.service.js';
import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';
import { AdminDashboardRepository } from './repositories/admin-dashboard.repository.js';
import { TresAreasModule } from '../tres-areas/tres-areas.module.js';

import { CalculateMetricsHandler } from './services/calculate-metrics.handler.js';
import { JobDispatcherService } from '../common/services/job-dispatcher.service.js';

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
    VouchersModule,
  ],
  controllers: [SessionsController],
  providers: [
    SessionsService,
    ReportService,

    ReportPdfService,
    AdminDashboardService,
    AdminDashboardRepository,
    ReportOrchestratorService,
    {
      provide: 'IReportCacheService',
      useClass: InMemoryReportCacheService,
    },
    ReportDeliveryService,
    SessionMetricsService,
    SessionOwnerResolverService,
    RateLimitGuard,
    CalculateMetricsHandler,
  ],
  exports: [SessionsService, SessionMetricsService],
})
export class SessionsModule implements OnModuleInit {
  constructor(
    private readonly jobDispatcher: JobDispatcherService,
    private readonly calculateMetricsHandler: CalculateMetricsHandler,
  ) {}

  onModuleInit(): void {
    this.jobDispatcher.registerHandler(this.calculateMetricsHandler);
  }
}

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VouchersModule } from '../vouchers/vouchers.module.js';
import { CategoriesModule } from '../categories/categories.module.js';
import { VocationalCategory } from '../categories/entities/vocational-category.entity.js';
import { CommonModule } from '../common/common.module.js';
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
import { ReportService } from './services/report.service.js';
import { SessionMetricsService } from './services/session-metrics.service.js';
import { SessionCompleteMapperService } from './services/session-complete-mapper.service.js';
import { SessionReportService } from './services/session-report.service.js';
import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';

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
    forwardRef(() => CommonModule),
    VouchersModule,
  ],
  controllers: [SessionsController],
  providers: [
    SessionsService,
    ReportService,
    AdminDashboardService,
    ReportOrchestratorService,
    SessionMetricsService,
    SessionCompleteMapperService,
    SessionReportService,
    RateLimitGuard,
  ],
  exports: [SessionsService, SessionMetricsService, SessionReportService],
})
export class SessionsModule {}

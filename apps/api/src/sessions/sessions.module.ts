import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VouchersModule } from '../vouchers/vouchers.module';
import { CategoriesModule } from '../categories/categories.module';
import { VocationalCategory } from '../categories/entities/vocational-category.entity';
import { CommonModule } from '../common/common.module';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { SessionResult } from './entities/session-result.entity';
import { SessionSwipe } from './entities/session-swipe.entity';
import { Session } from './entities/session.entity';
import { SessionMetrics } from './entities/session-metrics.entity';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { ReportOrchestratorService } from './services/report-orchestrator.service';
import { ReportService } from './services/report.service';
import { SessionMetricsService } from './services/session-metrics.service';
import { SessionCompleteMapperService } from './services/session-complete-mapper.service';
import { SessionReportService } from './services/session-report.service';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

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

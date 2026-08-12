import { forwardRef, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportWorker } from './report.worker';
import { ReportRendererService } from './report-renderer.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { TemplateRendererService } from '../notifications/services/template-renderer.service.js';
import { REPORT_TEMPLATE_RENDERER } from './report-renderer.service.js';
import { PrivateReportStorageService } from './private-report-storage.service.js';
import { ReportsService } from './reports.service.js';
import { Report } from './entities/report.entity.js';
import { Session } from '../sessions/entities/session.entity.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { ReportAccessAudit } from './entities/report-access-audit.entity.js';
import { ReportAccessAuditService } from './report-access-audit.service.js';
import { ReportsController } from './reports.controller.js';
import {
  REPORT_CONSENT_POLICY,
  ReportAccessService,
} from './report-access.service.js';

@Module({
  controllers: [ReportsController],
  imports: [
    NotificationsModule,
    TypeOrmModule.forFeature([Report, Session, ReportAccessAudit]),
    forwardRef(() => SessionsModule),
    BullModule.registerQueue({
      name: 'reports',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false, // keep in queue / move to DLQ equivalent
      },
    }),
  ],
  providers: [
    ReportWorker,
    ReportRendererService,
    PrivateReportStorageService,
    ReportsService,
    ReportAccessAuditService,
    ReportAccessService,
    {
      provide: REPORT_CONSENT_POLICY,
      useValue: { permits: async () => false },
    },
    { provide: REPORT_TEMPLATE_RENDERER, useExisting: TemplateRendererService },
  ],
  exports: [
    BullModule,
    PrivateReportStorageService,
    ReportsService,
    ReportAccessAuditService,
    ReportAccessService,
  ],
})
export class ReportsModule {}

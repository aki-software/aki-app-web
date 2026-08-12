jest.mock('@akit/design-tokens', () => ({ colors: {} }), { virtual: true });

import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Session } from '../sessions/entities/session.entity';
import { SessionsModule } from '../sessions/sessions.module';
import { ReportService } from '../sessions/services/report.service';
import { Report } from './entities/report.entity';
import { PrivateReportStorageService } from './private-report-storage.service';
import { ReportRendererService } from './report-renderer.service';
import { ReportWorker } from './report.worker';

describe('ReportsModule', () => {
  it('resolves ReportWorker from the SessionsModule report-data export', async () => {
    const exports = Reflect.getMetadata('exports', SessionsModule) as unknown[];
    const sessionReportBoundary = {
      module: class SessionReportBoundary {},
      providers: [{ provide: ReportService, useValue: {} }],
      exports: exports.filter((provider) => provider === ReportService),
    };
    const module = await Test.createTestingModule({
      imports: [sessionReportBoundary],
      providers: [
        ReportWorker,
        { provide: getRepositoryToken(Report), useValue: {} },
        { provide: getRepositoryToken(Session), useValue: {} },
        { provide: ReportRendererService, useValue: {} },
        { provide: PrivateReportStorageService, useValue: {} },
      ],
    }).compile();

    expect(module.get(ReportWorker)).toBeInstanceOf(ReportWorker);
  });
});

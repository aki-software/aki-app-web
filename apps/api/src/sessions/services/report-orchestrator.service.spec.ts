import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { ReportOrchestratorService } from './report-orchestrator.service.js';
import { Session } from '../entities/session.entity.js';
import { SessionPaymentStatus } from '@akit/contracts';

describe('ReportOrchestratorService', () => {
  let service: ReportOrchestratorService;
  let reportsQueue: any;
  let sessionRepository: any;

  const sessionId = 'session-abc';
  const targetEmail = 'patient@example.com';

  const mockSession = {
    id: sessionId,
    voucherId: 'voucher-1',
    paymentStatus: SessionPaymentStatus.PAID,
  };

  beforeEach(async () => {
    reportsQueue = {
      add: jest.fn().mockResolvedValue(true),
    };

    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(mockSession),
    };

    sessionRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportOrchestratorService,
        {
          provide: getRepositoryToken(Session),
          useValue: sessionRepository,
        },
        {
          provide: getQueueToken('reports'),
          useValue: reportsQueue,
        },
      ],
    }).compile();

    service = module.get<ReportOrchestratorService>(ReportOrchestratorService);
  });

  it('debería encolar el trabajo de generación de reporte (job: report.requested)', async () => {
    const result = await service.sendReport(
      sessionId,
      targetEmail,
      'voucher-1',
    );

    expect(reportsQueue.add).toHaveBeenCalledTimes(1);
    expect(reportsQueue.add).toHaveBeenCalledWith('report.requested', {
      sessionId,
      requestedByEmail: targetEmail,
      voucherId: 'voucher-1',
    });

    expect(result).toEqual({
      success: true,
      message: `Report generation queued for ${targetEmail}`,
    });
  });
});

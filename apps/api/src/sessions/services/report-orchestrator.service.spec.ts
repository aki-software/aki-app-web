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
  let mockQueryBuilder: any;

  const sessionId = 'session-abc';
  const targetEmail = 'patient@example.com';

  const mockSession: any = {
    id: sessionId,
    voucherId: 'voucher-1',
    paymentStatus: SessionPaymentStatus.PAID,
  };

  beforeEach(async () => {
    reportsQueue = {
      add: jest.fn().mockResolvedValue(true),
    };

    mockQueryBuilder = {
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

  it('allows an owned completed Google-unlocked report even when payment status is not PAID', async () => {
    mockQueryBuilder.getOne.mockResolvedValue({
      id: sessionId,
      patientId: 'patient-1',
      results: [{}],
      reportUnlockedAt: new Date(),
      paymentStatus: 'PENDING',
      voucherId: null,
    });

    await expect(
      service.sendReport(sessionId, targetEmail, null, {
        role: 'PATIENT',
        patientId: 'patient-1',
      } as never),
    ).resolves.toEqual(expect.objectContaining({ success: true }));
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'session.patientId = :patientId',
      { patientId: 'patient-1' },
    );
    expect(reportsQueue.add).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['locked', { results: [{}], reportUnlockedAt: null }],
    ['incomplete', { results: [], reportUnlockedAt: new Date() }],
    ['foreign', null],
  ])('rejects %s patient report access', async (_case, session) => {
    mockQueryBuilder.getOne.mockResolvedValue(
      session && {
        id: sessionId,
        patientId: 'patient-1',
        paymentStatus: 'PENDING',
        ...session,
      },
    );
    await expect(
      service.sendReport(sessionId, targetEmail, null, {
        role: 'PATIENT',
        patientId: 'patient-1',
      } as never),
    ).rejects.toBeDefined();
    expect(reportsQueue.add).not.toHaveBeenCalled();
  });
});

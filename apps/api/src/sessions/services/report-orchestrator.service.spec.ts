import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportOrchestratorService } from './report-orchestrator.service.js';
import { Session } from '../entities/session.entity.js';
import { SessionPaymentStatus } from '@akit/contracts';
import { ReportsService } from '../../reports/reports.service.js';

describe('ReportOrchestratorService', () => {
  let service: ReportOrchestratorService;
  let reportsService: any;
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
    reportsService = {
      requestGeneration: jest.fn().mockResolvedValue({ reportId: 'report-1' }),
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
        { provide: ReportsService, useValue: reportsService },
      ],
    }).compile();

    service = module.get<ReportOrchestratorService>(ReportOrchestratorService);
  });

  it('delegates authorized generation to the report producer', async () => {
    const result = await service.sendReport(
      sessionId,
      targetEmail,
      'voucher-1',
    );

    expect(reportsService.requestGeneration).toHaveBeenCalledWith(
      sessionId,
      targetEmail,
    );

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
    expect(reportsService.requestGeneration).toHaveBeenCalledWith(
      sessionId,
      targetEmail,
    );
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
    expect(reportsService.requestGeneration).not.toHaveBeenCalled();
  });
});

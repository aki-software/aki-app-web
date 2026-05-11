import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CategoriesService } from '../categories/categories.service';
import { PdfService } from '../common/services/pdf.service';
import { StorageService } from '../common/services/storage.service';
import { MailService } from '../mail/mail.service';
import { Voucher } from '../vouchers/entities/voucher.entity';
import { VouchersService } from '../vouchers/vouchers.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { Session } from './entities/session.entity';
import { QUEUE_ADAPTER } from '../common/constants/adapters.constants';
import { JobNames } from '../common/jobs';
import { ReportService } from './services/report.service';
import { ReportOrchestratorService } from './services/report-orchestrator.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { SessionMetricsService } from './services/session-metrics.service';
import { SessionsService } from './sessions.service';

describe('SessionsService', () => {
  let service: SessionsService;

  // Mock del repositorio de TypeORM
  const mockSessionRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((session) =>
        Promise.resolve({ id: 'uuid-123', ...session }),
      ),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
  };

  const mockVoucherRepository = {
    count: jest.fn(),
    find: jest.fn(),
  };

  const mockQueueAdapter = {
    isConfigured: jest.fn(),
    enqueue: jest.fn(),
  };

  const mockReportOrchestratorService = {
    sendReport: jest.fn(),
  };

  const mockSessionMetricsService = {
    calculateAndSaveMetrics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: getRepositoryToken(Session),
          useValue: mockSessionRepository,
        },
        {
          provide: getRepositoryToken(Voucher),
          useValue: mockVoucherRepository,
        },
        {
          provide: CategoriesService,
          useValue: { findAll: jest.fn() },
        },
        {
          provide: MailService,
          useValue: {},
        },
        {
          provide: PdfService,
          useValue: {},
        },
        {
          provide: StorageService,
          useValue: {},
        },
        {
          provide: ReportService,
          useValue: { buildReportData: jest.fn() },
        },
        {
          provide: AdminDashboardService,
          useValue: {},
        },
        {
          provide: ReportOrchestratorService,
          useValue: mockReportOrchestratorService,
        },
        {
          provide: SessionMetricsService,
          useValue: mockSessionMetricsService,
        },
        {
          provide: QUEUE_ADAPTER,
          useValue: mockQueueAdapter,
        },
        {
          provide: VouchersService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully insert a session', async () => {
      mockSessionMetricsService.calculateAndSaveMetrics.mockResolvedValueOnce(
        undefined,
      );
      const createSessionDto: CreateSessionDto = {
        patientName: 'Test Patient',
        sessionDate: new Date('2026-03-26T12:00:00.000Z'),
        results: [],
        swipes: [],
      };

      const result = await service.create(createSessionDto);

      expect(result).toEqual({
        id: 'uuid-123',
        patientName: 'Test Patient',
        sessionDate: new Date('2026-03-26T12:00:00.000Z'),
        results: [],
        swipes: [],
      });
      expect(mockSessionRepository.create).toHaveBeenCalledWith(
        createSessionDto,
      );
      expect(mockSessionRepository.save).toHaveBeenCalledTimes(1);
      expect(
        mockSessionMetricsService.calculateAndSaveMetrics,
      ).toHaveBeenCalledWith('uuid-123');
    });
  });

  describe('sendReport', () => {
    beforeEach(() => {
      mockQueueAdapter.enqueue.mockReset();
      mockQueueAdapter.isConfigured.mockReset();
      mockReportOrchestratorService.sendReport.mockReset();
    });

    it('enqueues report when queue is configured', async () => {
      mockQueueAdapter.isConfigured.mockReturnValue(true);
      mockQueueAdapter.enqueue.mockResolvedValueOnce(undefined);

      const result = await service.sendReport(
        'session-1',
        'test@example.com',
        null,
        { role: 'ADMIN' },
      );

      expect(mockQueueAdapter.enqueue).toHaveBeenCalledWith(
        JobNames.SendReport,
        expect.objectContaining({
          sessionId: 'session-1',
          targetEmail: 'test@example.com',
        }),
        expect.objectContaining({
          attempts: 3,
          backoffMs: 60_000,
          backoffType: 'exponential',
        }),
      );
      expect(result).toEqual({
        success: true,
        message: 'Email encolado hacia test@example.com',
      });
    });

    it('dispatches report inline when queue is not configured', async () => {
      mockQueueAdapter.isConfigured.mockReturnValue(false);
      mockReportOrchestratorService.sendReport.mockResolvedValueOnce({
        success: true,
        message: 'ok',
      });

      const result = await service.sendReport('session-2', 'a@example.com');

      expect(mockReportOrchestratorService.sendReport).toHaveBeenCalledWith(
        'session-2',
        'a@example.com',
        undefined,
        undefined,
      );
      expect(result).toEqual({ success: true, message: 'ok' });
    });
  });

  describe('findOne scope', () => {
    beforeEach(() => {
      // Resetear el mock entre tests para evitar contaminación de llamadas
      mockSessionRepository.findOne.mockReset();
    });

    it('should allow admin to access any session', async () => {
      mockSessionRepository.findOne.mockResolvedValueOnce({
        id: 'session-1',
        patientName: 'Paciente',
      });

      const result = await service.findOne('session-1', {
        role: 'ADMIN',
      });

      expect(result).toEqual({
        id: 'session-1',
        patientName: 'Paciente',
      });
      // El servicio actual añade voucherId: IsNull() para ADMIN y expande relaciones
      expect(mockSessionRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'session-1' }),
          relations: expect.arrayContaining([
            'results',
            'swipes',
            'institution',
            'therapist',
            'voucher',
          ]),
        }),
      );
    });

    it('should scope patient access by patientId', async () => {
      mockSessionRepository.findOne.mockResolvedValueOnce({
        id: 'session-2',
        patientId: 'patient-1',
      });

      await service.findOne('session-2', {
        role: 'PATIENT',
        patientId: 'patient-1',
      });

      expect(mockSessionRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'session-2',
            patientId: 'patient-1',
          }),
          relations: expect.arrayContaining(['results', 'swipes']),
        }),
      );
    });

    it('should reject access when scope does not match', async () => {
      mockSessionRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.findOne('session-3', {
          role: 'THERAPIST',
          therapistUserId: 'therapist-1',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(mockSessionRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'session-3',
            therapistUserId: 'therapist-1',
          }),
        }),
      );
    });
  });
});

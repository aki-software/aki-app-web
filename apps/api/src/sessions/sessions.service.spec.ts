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
import { ReportService } from './services/report.service';
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

import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity.js';
import { ReportOrchestratorService } from './report-orchestrator.service.js';
import { ReportService } from './report.service.js';
import { MailService } from '../../mail/mail.service.js';
import { PdfService } from '../../common/services/pdf.service.js';
import { StorageService } from '../../common/services/storage.service.js';

describe('ReportOrchestratorService', () => {
  let service: ReportOrchestratorService;
  let sessionRepository: Repository<Session>;

  const reportService = {
    buildReportData: jest.fn(),
  } as unknown as ReportService;

  const mailService = {
    renderReportPdfTemplate: jest.fn(),
    sendVocationalReport: jest.fn(),
  } as unknown as MailService;

  const pdfService = {
    generateFromHtml: jest.fn(),
  } as unknown as PdfService;

  const storageService = {
    uploadFile: jest.fn(),
  } as unknown as StorageService;

  const mockSessionRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportOrchestratorService,
        {
          provide: getRepositoryToken(Session),
          useValue: mockSessionRepository,
        },
        {
          provide: ReportService,
          useValue: reportService,
        },
        {
          provide: MailService,
          useValue: mailService,
        },
        {
          provide: PdfService,
          useValue: pdfService,
        },
        {
          provide: StorageService,
          useValue: storageService,
        },
      ],
    }).compile();

    service = module.get<ReportOrchestratorService>(ReportOrchestratorService);
    sessionRepository = module.get<Repository<Session>>(
      getRepositoryToken(Session),
    );
  });

  it('reuses cached report on subsequent calls', async () => {
    const session = {
      id: 'session-1',
      reportUrl: null,
      voucherId: null,
      paymentStatus: null,
    } as unknown as Session;

    mockSessionRepository.findOne.mockResolvedValue(session);
    reportService.buildReportData = jest.fn().mockResolvedValue({
      patientName: 'Test',
      topResults: [],
      hollandCode: 'A',
      summary: {
        primaryTitle: '',
        primaryPercentage: 0,
        profileStrength: '',
        recommendation: '',
        rankedAreas: [],
      },
      tripletInsight: null,
    });
    mailService.renderReportPdfTemplate = jest.fn().mockReturnValue('<html />');
    pdfService.generateFromHtml = jest.fn().mockResolvedValue(Buffer.from('pdf'));
    storageService.uploadFile = jest.fn().mockResolvedValue('https://cdn/report.pdf');
    mailService.sendVocationalReport = jest.fn().mockResolvedValue(true);
    jest.spyOn(Date, 'now').mockReturnValue(1234567890);

    await service.sendReport('session-1', 'test@example.com');
    await service.sendReport('session-1', 'test@example.com');

    expect(pdfService.generateFromHtml).toHaveBeenCalledTimes(1);
    (Date.now as jest.Mock).mockRestore();
  });

  it('locks concurrent generation per session', async () => {
    jest.useFakeTimers();
    const session = {
      id: 'session-2',
      reportUrl: null,
      voucherId: null,
      paymentStatus: null,
    } as unknown as Session;

    mockSessionRepository.findOne.mockResolvedValue(session);
    reportService.buildReportData = jest.fn().mockResolvedValue({
      patientName: 'Test',
      topResults: [],
      hollandCode: 'A',
      summary: {
        primaryTitle: '',
        primaryPercentage: 0,
        profileStrength: '',
        recommendation: '',
        rankedAreas: [],
      },
      tripletInsight: null,
    });
    mailService.renderReportPdfTemplate = jest.fn().mockReturnValue('<html />');
    const pdfPromise = new Promise<Buffer>((resolve) => {
      setTimeout(() => resolve(Buffer.from('pdf')), 10);
    });
    pdfService.generateFromHtml = jest.fn(() => pdfPromise);
    storageService.uploadFile = jest.fn().mockResolvedValue(null);
    mailService.sendVocationalReport = jest.fn().mockResolvedValue(true);

    const sendPromise = Promise.all([
      service.sendReport('session-2', 'a@example.com'),
      service.sendReport('session-2', 'b@example.com'),
    ]);

    jest.advanceTimersByTime(10);
    await sendPromise;

    expect(pdfService.generateFromHtml).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});

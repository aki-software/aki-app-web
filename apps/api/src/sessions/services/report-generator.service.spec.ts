import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportGeneratorService } from './report-generator.service.js';
import { ReportService } from './report.service.js';
import { PdfService } from '../../common/services/pdf.service.js';
import { StorageService } from '../../common/services/storage.service.js';
import { Session } from '../entities/session.entity.js';

describe('ReportGeneratorService', () => {
  let service: ReportGeneratorService;
  const sessionRepository = {
    save: jest.fn(),
  };
  const reportService = {
    renderReportPdfHtml: jest.fn(),
  };
  const pdfService = {
    generateFromHtml: jest.fn(),
  };
  const storageService = {
    uploadFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportGeneratorService,
        { provide: getRepositoryToken(Session), useValue: sessionRepository },
        { provide: ReportService, useValue: reportService },
        { provide: PdfService, useValue: pdfService },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    service = module.get(ReportGeneratorService);
    jest.clearAllMocks();
  });

  it('generates and uploads when reportUrl is missing', async () => {
    const session = { id: 'session-1', reportUrl: null } as Session;
    const pdfBuffer = Buffer.from('pdf-data');

    reportService.renderReportPdfHtml.mockReturnValue('<html/>');
    pdfService.generateFromHtml.mockResolvedValue(pdfBuffer);
    storageService.uploadFile.mockResolvedValue('https://cdn/report.pdf');

    const result = await service.generateAndUploadPdf(session, {
      patientName: 'Test',
    });

    expect(reportService.renderReportPdfHtml).toHaveBeenCalled();
    expect(pdfService.generateFromHtml).toHaveBeenCalledWith('<html/>');
    expect(storageService.uploadFile).toHaveBeenCalledWith(
      pdfBuffer,
      expect.stringMatching(/^report_session-1_/),
    );
    expect(sessionRepository.save).toHaveBeenCalledWith(session);
    expect(session.reportUrl).toBe('https://cdn/report.pdf');
    expect(result).toEqual({
      pdfBuffer,
      reportUrl: 'https://cdn/report.pdf',
    });
  });

  it('reuses existing reportUrl and only regenerates the buffer', async () => {
    const session = {
      id: 'session-2',
      reportUrl: 'https://cdn/existing.pdf',
    } as Session;
    const pdfBuffer = Buffer.from('pdf-data');

    reportService.renderReportPdfHtml.mockReturnValue('<html/>');
    pdfService.generateFromHtml.mockResolvedValue(pdfBuffer);

    const result = await service.generateAndUploadPdf(session, {
      patientName: 'Test',
    });

    expect(pdfService.generateFromHtml).toHaveBeenCalledWith('<html/>');
    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(sessionRepository.save).not.toHaveBeenCalled();
    expect(result).toEqual({
      pdfBuffer,
      reportUrl: 'https://cdn/existing.pdf',
    });
  });
});

import { ReportOrchestratorService } from './report-orchestrator.service.js';
import { ReportService } from './report.service.js';
import type { IReportCacheService } from '../interfaces/report-cache.interface.js';
import { InMemoryReportCacheService } from './in-memory-report-cache.service.js';
import { STORAGE_ADAPTER } from '../../common/constants/adapters.constants.js';

describe('ReportOrchestratorService', () => {
  let service: ReportOrchestratorService;
  let cacheService: IReportCacheService;
  let deliverReport: jest.Mock;

  const sessionId = 'session-abc';
  const targetEmail = 'patient@example.com';
  const mockReportData = {
    patientName: 'Juan',
    hollandCode: 'RIS',
    summary: null,
    tripletInsight: null,
  };
  const mockSession = {
    id: sessionId,
    voucherId: null,
    reportUrl: null,
    results: [],
    swipes: [],
  };

  beforeEach(() => {
    cacheService = new InMemoryReportCacheService();
    deliverReport = jest
      .fn()
      .mockResolvedValue({ success: true, message: 'ok' });

    const mockReportService = {
      buildReportData: jest.fn().mockResolvedValue(mockReportData),
    };
    const mockReportPdfService = {
      generatePdfBuffer: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    };
    const mockDeliveryService = { deliverReport };
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(mockSession),
    };

    const mockSessionRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const mockStorageAdapter = {
      getPresignedDownloadUrl: jest.fn().mockResolvedValue('https://s3.url/logo.png'),
    };

    service = new ReportOrchestratorService(
      mockSessionRepository as any,
      mockReportService as any,
      cacheService,
      mockReportPdfService as any,
      mockDeliveryService as any,
      mockStorageAdapter as any,
    );
  });

  describe('enrichReportDataWithLogo', () => {
    it('GIVEN institution has a logoUrl WHEN PDF is generated THEN logo is fetched from S3 and embedded', async () => {
      const mockSessionWithLogo = {
        id: sessionId,
        institution: { logoUrl: 'inst1/logo.png' },
      };
      const mockQueryBuilderWithLogo = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockSessionWithLogo),
      };
      
      const mockSessionRepositoryWithLogo = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilderWithLogo),
      };
      const getPresignedDownloadUrl = jest.fn().mockResolvedValue('https://s3.url/logo.png');
      const mockStorageAdapter = { getPresignedDownloadUrl };
      const buildReportData = jest.fn().mockResolvedValue({ ...mockReportData });
      
      const customService = new ReportOrchestratorService(
        mockSessionRepositoryWithLogo as any,
        { buildReportData } as any,
        new InMemoryReportCacheService(),
        { generatePdfBuffer: jest.fn().mockResolvedValue(Buffer.from('pdf')) } as any,
        { deliverReport: jest.fn() } as any,
        mockStorageAdapter as any,
      );

      await customService.getPdfBuffer(sessionId);
      
      expect(getPresignedDownloadUrl).toHaveBeenCalledWith('inst1/logo.png');
      // Report data should be updated with logo url
      const generatedReportData = await buildReportData.mock.results[0].value;
      expect(generatedReportData.institutionLogoUrl).toBe('https://s3.url/logo.png');
    });

    it('GIVEN institution has NO logoUrl WHEN PDF is generated THEN PDF renders with A.kit logo only (no error)', async () => {
      const mockSessionNoLogo = {
        id: sessionId,
        institution: { logoUrl: null },
      };
      const mockQueryBuilderNoLogo = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockSessionNoLogo),
      };
      
      const mockSessionRepositoryNoLogo = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilderNoLogo),
      };
      const getPresignedDownloadUrl = jest.fn();
      const mockStorageAdapter = { getPresignedDownloadUrl };
      const buildReportData = jest.fn().mockResolvedValue({ ...mockReportData });
      
      const customService = new ReportOrchestratorService(
        mockSessionRepositoryNoLogo as any,
        { buildReportData } as any,
        new InMemoryReportCacheService(),
        { generatePdfBuffer: jest.fn().mockResolvedValue(Buffer.from('pdf')) } as any,
        { deliverReport: jest.fn() } as any,
        mockStorageAdapter as any,
      );

      await customService.getPdfBuffer(sessionId);
      
      expect(getPresignedDownloadUrl).not.toHaveBeenCalled();
      const generatedReportData = await buildReportData.mock.results[0].value;
      expect(generatedReportData.institutionLogoUrl).toBeUndefined();
    });
  });

  it('debería enviar el correo una sola vez cuando hay una sola llamada', async () => {
    await service.sendReport(sessionId, targetEmail);

    expect(deliverReport).toHaveBeenCalledTimes(1);
  });

  it('debería enviar el correo una sola vez cuando dos requests llegan simultáneamente (race condition)', async () => {
    const [r1, r2] = await Promise.all([
      service.sendReport(sessionId, targetEmail),
      service.sendReport(sessionId, targetEmail),
    ]);

    expect(deliverReport).toHaveBeenCalledTimes(1);
    expect(r1).toEqual({ success: true, message: 'ok' });
    expect(r2).toEqual({ success: true, message: 'ok' });
  });

  it('debería enviar el correo una sola vez cuando el segundo request llega después del primero (fast-path cache)', async () => {
    await service.sendReport(sessionId, targetEmail);
    const result = await service.sendReport(sessionId, targetEmail);

    expect(deliverReport).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, message: 'ok' });
  });

  it('debería reintentar el envío si el primero falló (no cachear fallas)', async () => {
    deliverReport.mockResolvedValueOnce({
      success: false,
      message: 'error de red',
    });

    const first = await service.sendReport(sessionId, targetEmail);
    expect(first.success).toBe(false);

    deliverReport.mockResolvedValueOnce({ success: true, message: 'ok' });
    const second = await service.sendReport(sessionId, targetEmail);
    expect(second.success).toBe(true);

    expect(deliverReport).toHaveBeenCalledTimes(2);
  });

  it('no debería enviar el correo a un email diferente aunque la sesión sea la misma', async () => {
    await service.sendReport(sessionId, 'otro@example.com');
    await service.sendReport(sessionId, targetEmail);

    expect(deliverReport).toHaveBeenCalledTimes(2);
  });
});

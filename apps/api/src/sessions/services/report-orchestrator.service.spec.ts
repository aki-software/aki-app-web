import { ReportOrchestratorService } from './report-orchestrator.service.js';
import { ReportCacheService } from './report-cache.service.js';

describe('ReportOrchestratorService — delivery idempotency', () => {
  let service: ReportOrchestratorService;
  let cacheService: ReportCacheService;
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
    cacheService = new ReportCacheService();
    deliverReport = jest
      .fn()
      .mockResolvedValue({ success: true, message: 'ok' });

    const mockReportService = {
      buildReportData: jest.fn().mockResolvedValue(mockReportData),
    };
    const mockGeneratorService = {
      generateAndUploadPdf: jest.fn().mockResolvedValue({
        pdfBuffer: undefined,
        reportUrl: 'https://example.com/report.pdf',
      }),
    };
    const mockDeliveryService = { deliverReport };
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(mockSession),
    };

    const mockSessionRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    service = new ReportOrchestratorService(
      mockSessionRepository as any,
      mockReportService as any,
      cacheService,
      mockGeneratorService as any,
      mockDeliveryService as any,
    );
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

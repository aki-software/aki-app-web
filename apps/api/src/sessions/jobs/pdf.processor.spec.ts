import { Test, TestingModule } from '@nestjs/testing';
import { PdfProcessor } from './pdf.processor';
import { ReportOrchestratorService } from '../services/report-orchestrator.service';
import { GeneratePdfJobPayload } from '../../common/jobs/generate-pdf.job';

describe('PdfProcessor', () => {
  let processor: PdfProcessor;
  let reportOrchestratorService: jest.Mocked<ReportOrchestratorService>;

  beforeEach(async () => {
    const mockReportOrchestrator = {
      preloadReport: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfProcessor,
        {
          provide: ReportOrchestratorService,
          useValue: mockReportOrchestrator,
        },
      ],
    }).compile();

    processor = module.get<PdfProcessor>(PdfProcessor);
    reportOrchestratorService = module.get(ReportOrchestratorService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should skip processing if no sessionId is provided', async () => {
    const payload = { userId: '123', isB2C: true } as GeneratePdfJobPayload;
    await processor.handle(payload);
    expect(reportOrchestratorService.preloadReport).not.toHaveBeenCalled();
  });

  it('should call preloadReport with correct sessionId (logoUrl absent)', async () => {
    const payload = {
      sessionId: 'session1',
      userId: '123',
      isB2C: true,
    } as GeneratePdfJobPayload;
    await processor.handle(payload);
    expect(reportOrchestratorService.preloadReport).toHaveBeenCalledWith(
      'session1',
    );
  });

  it('should call preloadReport with correct sessionId (logoUrl present)', async () => {
    const payload = {
      sessionId: 'session1',
      userId: '123',
      isB2C: true,
      logoUrl: 'https://example.com/logo.png',
    } as GeneratePdfJobPayload;
    await processor.handle(payload);
    expect(reportOrchestratorService.preloadReport).toHaveBeenCalledWith(
      'session1',
    );
  });
});

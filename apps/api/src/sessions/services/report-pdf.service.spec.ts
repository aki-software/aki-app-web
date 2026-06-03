import { Test, TestingModule } from '@nestjs/testing';
import { ReportPdfService } from './report-pdf.service.js';
import { PDF_GENERATOR } from '../../common/constants/adapters.constants.js';
import * as pug from 'pug';

jest.mock('pug', () => ({
  renderFile: jest.fn().mockReturnValue('<html/>'),
}));

describe('ReportPdfService', () => {
  let service: ReportPdfService;
  const pdfService = {
    generateFromHtml: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportPdfService,
        { provide: PDF_GENERATOR, useValue: pdfService },
      ],
    }).compile();

    service = module.get(ReportPdfService);
    jest.clearAllMocks();
  });

  it('renders HTML using pug', () => {
    const reportData = { patientName: 'John Doe', strengths: [] } as any;
    const html = service.renderHtml(reportData);

    expect(html).toBe('<html/>');
    expect(pug.renderFile).toHaveBeenCalledWith(
      expect.stringContaining('report-pdf.pug'),
      expect.objectContaining({ patientName: 'John Doe' }),
    );
  });

  it('generates pdf buffer', async () => {
    const pdfBuffer = Buffer.from('pdf-data');
    pdfService.generateFromHtml.mockResolvedValue(pdfBuffer);

    const result = await service.generatePdfBuffer({
      patientName: 'Test',
    } as any);

    expect(pug.renderFile).toHaveBeenCalled();
    expect(pdfService.generateFromHtml).toHaveBeenCalledWith('<html/>');
    expect(result).toEqual(pdfBuffer);
  });

  it('throws error if pdf generation fails', async () => {
    pdfService.generateFromHtml.mockRejectedValue(
      new Error('PDF generation failed'),
    );

    await expect(
      service.generatePdfBuffer({
        patientName: 'Test',
      } as any),
    ).rejects.toThrow('PDF generation failed');
  });
});

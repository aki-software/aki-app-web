import { Test, TestingModule } from '@nestjs/testing';
import { GeneratePdfProcessor } from './generate-pdf.processor.js';
import { PDF_GENERATOR } from '../../constants/adapters.constants.js';
import { Job } from 'bullmq';

describe('GeneratePdfProcessor', () => {
  let processor: GeneratePdfProcessor;
  let pdfGenerator: any;

  beforeEach(async () => {
    pdfGenerator = {
      generateFromHtml: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeneratePdfProcessor,
        { provide: PDF_GENERATOR, useValue: pdfGenerator },
      ],
    }).compile();

    processor = module.get<GeneratePdfProcessor>(GeneratePdfProcessor);
  });

  it('should process job and call generateFromHtml', async () => {
    const jobData = { html: '<html>test</html>', jobId: 'j1' };
    const mockJob = { data: jobData } as Job<any, any, string>;

    const result = await processor.process(mockJob);

    expect(result).toEqual(Buffer.from('pdf'));
    expect(pdfGenerator.generateFromHtml).toHaveBeenCalledWith(
      '<html>test</html>',
    );
  });
});

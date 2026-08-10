import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { GeneratePdfJobPayload } from '../generate-pdf.job.js';
import { PDF_GENERATOR } from '../../constants/adapters.constants.js';
import type { PdfGenerator } from '../../adapters/pdf-generator.adapter.js';

@Processor('pdf')
export class GeneratePdfProcessor extends WorkerHost {
  private readonly logger = new Logger(GeneratePdfProcessor.name);

  constructor(
    @Inject(PDF_GENERATOR) private readonly pdfGenerator: PdfGenerator,
  ) {
    super();
  }

  async process(job: Job<GeneratePdfJobPayload, any, string>): Promise<Buffer> {
    return await this.pdfGenerator.generateFromHtml(job.data.html);
  }
}

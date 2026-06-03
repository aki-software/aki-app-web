import { Injectable, Inject } from '@nestjs/common';
import { JobHandler } from './job-handler.interface.js';
import { JobNames } from '../job-names.js';
import { GeneratePdfJobPayload } from '../generate-pdf.job.js';
import { PDF_GENERATOR } from '../../constants/adapters.constants.js';
import type { PdfGenerator } from '../../adapters/pdf-generator.adapter.js';

@Injectable()
export class GeneratePdfHandler implements JobHandler<GeneratePdfJobPayload> {
  readonly name = JobNames.GeneratePdf;
  private readonly defaultTimeoutMs = 60_000;

  constructor(
    @Inject(PDF_GENERATOR) private readonly pdfGenerator: PdfGenerator,
  ) {}

  getTimeoutMs(payload: GeneratePdfJobPayload): number {
    return payload.timeoutMs ?? this.defaultTimeoutMs;
  }

  getJobContext(payload: GeneratePdfJobPayload) {
    return {
      jobId: payload.jobId,
    };
  }

  async handle(payload: GeneratePdfJobPayload): Promise<Buffer> {
    return await this.pdfGenerator.generateFromHtml(payload.html);
  }
}

import { Injectable } from '@nestjs/common';
import { JobHandler } from './job-handler.interface.js';
import { JobNames } from '../job-names.js';
import { GeneratePdfJobPayload } from '../generate-pdf.job.js';
import { PdfService } from '../../services/pdf.service.js';

@Injectable()
export class GeneratePdfHandler implements JobHandler<GeneratePdfJobPayload> {
  readonly name = JobNames.GeneratePdf;
  private readonly defaultTimeoutMs = 60_000;

  constructor(private readonly pdfService: PdfService) {}

  getTimeoutMs(payload: GeneratePdfJobPayload): number {
    return payload.timeoutMs ?? this.defaultTimeoutMs;
  }

  getJobContext(payload: GeneratePdfJobPayload) {
    return {
      jobId: payload.jobId,
    };
  }

  async handle(payload: GeneratePdfJobPayload): Promise<Buffer> {
    return await this.pdfService.generateFromHtml(payload.html);
  }
}

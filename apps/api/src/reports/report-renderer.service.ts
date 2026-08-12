import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { PDF_GENERATOR } from '../common/constants/adapters.constants.js';
import type { PdfGenerator } from '../common/adapters/pdf-generator.adapter.js';
export const REPORT_TEMPLATE_RENDERER = 'REPORT_TEMPLATE_RENDERER';

interface ReportTemplateRenderer {
  renderTemplate(name: string, payload: Record<string, unknown>): string;
}

export interface ReportRenderInput {
  locale: string;
  timeZone: string;
  generatedAt: string;
  assessmentAt: string;
  templateVersion: string;
  reportVersion: number;
  data: Record<string, unknown>;
}

@Injectable()
export class ReportRendererService {
  constructor(
    @Inject(PDF_GENERATOR) private readonly pdfGenerator: PdfGenerator,
    @Inject(REPORT_TEMPLATE_RENDERER)
    private readonly templates: ReportTemplateRenderer,
  ) {}

  async render(
    input: ReportRenderInput,
  ): Promise<{ pdf: Buffer; inputHash: string }> {
    const canonicalInput = JSON.stringify(this.sort(input));
    const inputHash = createHash('sha256').update(canonicalInput).digest('hex');
    const html = this.templates.renderTemplate('report-pdf.pug', {
      ...input.data,
      locale: input.locale,
      timeZone: input.timeZone,
      generatedAt: input.generatedAt,
      assessmentAt: input.assessmentAt,
      reportVersion: input.reportVersion,
      templateVersion: input.templateVersion,
      logoDataUri: '',
    });
    return { pdf: await this.pdfGenerator.generateFromHtml(html), inputHash };
  }

  private sort(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => this.sort(item));
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, item]) => [key, this.sort(item)]),
    );
  }
}

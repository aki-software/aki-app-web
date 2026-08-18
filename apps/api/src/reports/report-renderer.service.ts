import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import { PDF_GENERATOR } from '../common/constants/adapters.constants.js';
import type { PdfGenerator } from '../common/adapters/pdf-generator.adapter.js';
export const REPORT_TEMPLATE_RENDERER = 'REPORT_TEMPLATE_RENDERER';

const logoDataUri = `data:image/png;base64,${readFileSync(
  path.resolve(__dirname, '../common/assets/logo.png'),
).toString('base64')}`;

const fontFaceCss = [400, 500, 600, 700]
  .map((weight) => {
    const font = readFileSync(
      require.resolve(`@fontsource/inter/files/inter-latin-${weight}-normal.woff2`),
    ).toString('base64');
    return `@font-face { font-family: 'Inter'; font-style: normal; font-weight: ${weight}; src: url(data:font/woff2;base64,${font}) format('woff2'); }`;
  })
  .join('\n');

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
      logoDataUri,
      fontFaceCss,
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

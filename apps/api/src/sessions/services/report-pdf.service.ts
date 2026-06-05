import { Injectable, Logger, Inject } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as pug from 'pug';
import { colors } from '@akit/design-tokens';
import { PDF_GENERATOR } from '../../common/constants/adapters.constants.js';
import type { PdfGenerator } from '../../common/adapters/pdf-generator.adapter.js';
import type { ReportData } from '../../common/types/report.types.js';

function getAppRoot(): string {
  const cwd = process.cwd().replace(/\\/g, '/');
  if (!cwd.endsWith('apps/api') && !cwd.includes('apps/api/')) {
    return path.join(process.cwd(), 'apps', 'api');
  }
  return process.cwd();
}

@Injectable()
export class ReportPdfService {
  private readonly logger = new Logger(ReportPdfService.name);

  private readonly brandDomain = 'akituespacio.com.ar';
  private readonly supportEmail = 'akituvocacion@gmail.com';
  private readonly logoAssetPath = path.join(
    getAppRoot(),
    '..',
    'web',
    'src',
    'assets',
    'logo.png',
  );
  private readonly templatePath = path.join(
    getAppRoot(),
    'src',
    'mail',
    'templates',
    'report-pdf.pug',
  );
  private cachedLogoDataUri: string | null = null;

  constructor(
    @Inject(PDF_GENERATOR) private readonly pdfGenerator: PdfGenerator,
  ) {}

  renderHtml(reportData: ReportData): string {
    return pug.renderFile(this.templatePath, {
      patientName: reportData.patientName,
      patientEmail: reportData.patientEmail || null,
      topResults: reportData.topResults,
      bottomAreas: reportData.bottomAreas || [],
      hollandCode: reportData.hollandCode || null,
      summary: reportData.summary || null,
      tripletInsight: reportData.tripletInsight || null,
      hollandPercentages: reportData.hollandPercentages || null,
      strengths: reportData.strengths || [],
      colors,
      logoDataUri: this.getLogoDataUri(),
      brandDomain: this.brandDomain,
      supportEmail: this.supportEmail,
    });
  }

  async generatePdfBuffer(reportData: ReportData): Promise<Buffer> {
    const htmlContent = this.renderHtml(reportData);

    try {
      return await this.pdfGenerator.generateFromHtml(htmlContent);
    } catch (err) {
      this.logger.error(
        `PDF generation failed: ${(err as Error)?.message ?? 'unknown'}`,
        (err as Error)?.stack,
      );
      throw err; // Don't swallow the error, let the orchestrator handle it
    }
  }

  private getLogoDataUri(): string | null {
    if (this.cachedLogoDataUri !== null) {
      return this.cachedLogoDataUri;
    }

    try {
      if (fs.existsSync(this.logoAssetPath)) {
        const buffer = fs.readFileSync(this.logoAssetPath);
        const ext = path.extname(this.logoAssetPath).toLowerCase();
        const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
        this.cachedLogoDataUri = `data:${mime};base64,${buffer.toString('base64')}`;
        return this.cachedLogoDataUri;
      }
      return null;
    } catch {
      return null;
    }
  }
}

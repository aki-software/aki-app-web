import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as pug from 'pug';
import { colors } from '@akit/design-tokens';
import type { ReportData } from '../../common/types/report.types.js';

@Injectable()
export class ReportPdfRendererService {
  private readonly brandDomain = 'akituespacio.com.ar';
  private readonly supportEmail = 'akituvocacion@gmail.com';
  private readonly logoAssetPath = path.join(
    process.cwd(),
    '..',
    'web',
    'src',
    'assets',
    'logo.png',
  );
  private readonly templatePath = path.join(
    process.cwd(),
    'src',
    'mail',
    'templates',
    'report-pdf.pug',
  );

  renderHtml(reportData: ReportData): string {
    return pug.renderFile(this.templatePath, {
      patientName: reportData.patientName,
      patientEmail: reportData.patientEmail || null,
      topResults: reportData.topResults,
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

  private getLogoDataUri(): string | null {
    try {
      if (fs.existsSync(this.logoAssetPath)) {
        const buffer = fs.readFileSync(this.logoAssetPath);
        const ext = path.extname(this.logoAssetPath).toLowerCase();
        const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
        return `data:${mime};base64,${buffer.toString('base64')}`;
      }
      return null;
    } catch {
      return null;
    }
  }
}

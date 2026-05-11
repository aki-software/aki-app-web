import { Injectable } from '@nestjs/common';
import { colors } from '@akit/design-tokens';
import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';
import * as pug from 'pug';
import { ConfigService } from '@nestjs/config';
import {
  CategoryResult,
  ReportSummary,
  ReportTripletInsight,
} from '../common/types/report.types';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
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

  constructor(private configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const transportType = this.configService.get<string>(
      'MAIL_TRANSPORT_TYPE',
      'smtp',
    );

    if (transportType === 'smtp') {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>(
          'SMTP_HOST',
          'sandbox.smtp.mailtrap.io',
        ),
        port: Number(this.configService.get<number>('SMTP_PORT', 2525)),
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
    } else {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('MAIL_PRO_HOST'),
        port: Number(this.configService.get<number>('MAIL_PRO_PORT', 587)),
        auth: {
          user: this.configService.get<string>('MAIL_PRO_USER'),
          pass: this.configService.get<string>('MAIL_PRO_PASS'),
        },
      });
    }
  }

  private renderTemplate(
    templateName: string,
    payload: Record<string, unknown>,
  ): string {
    const templatePath = process.cwd() + `/src/mail/templates/${templateName}`;
    return pug.renderFile(templatePath, {
      ...payload,
      colors,
      logoDataUri: this.getLogoDataUri(),
      brandDomain: this.brandDomain,
      supportEmail: this.supportEmail,
    });
  }

  private getLogoDataUri(): string | null {
    try {
      const buffer = fs.readFileSync(this.logoAssetPath);
      const ext = path.extname(this.logoAssetPath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch (error) {
      console.warn('Logo asset not found for emails/PDF.', error);
      return null;
    }
  }

  renderReportPdfTemplate(
    patientName: string,
    formattedResults: CategoryResult[],
    hollandCode?: string,
    reportUrl?: string,
    summary?: ReportSummary,
    tripletInsight?: ReportTripletInsight,
    patientEmail?: string,
    hollandPercentages?: Record<string, number>,
    strengths?: string[],
  ): string {
    return this.renderTemplate('report-pdf.pug', {
      patientName,
      patientEmail: patientEmail || null,
      topResults: formattedResults,
      hollandCode: hollandCode || null,
      reportUrl: reportUrl || null,
      summary: summary || null,
      tripletInsight: tripletInsight || null,
      hollandPercentages: hollandPercentages || null,
      strengths: strengths || [],
    });
  }

  renderReportEmailTemplate(
    patientName: string,
    patientEmail?: string,
    hollandCode?: string,
    reportUrl?: string,
    summary?: ReportSummary,
  ): string {
    return this.renderTemplate('report-email.pug', {
      patientName,
      patientEmail: patientEmail || null,
      hollandCode: hollandCode || null,
      reportUrl: reportUrl || null,
      summary: summary || null,
    });
  }

  async sendVocationalReport(
    targetEmail: string,
    patientName: string,
    hollandCode?: string,
    pdfAttachment?: Buffer,
    reportUrl?: string,
    summary?: ReportSummary,
    tripletInsight?: ReportTripletInsight,
  ): Promise<boolean> {
    const htmlContent = this.renderReportEmailTemplate(
      patientName,
      targetEmail,
      hollandCode,
      reportUrl,
      summary,
    );
    const textContent = this.renderReportText(
      patientName,
      hollandCode,
      reportUrl,
      summary,
      tripletInsight,
    );
    try {
      const from = this.configService.get<string>(
        'SMTP_FROM',
        'reportes@akit.app',
      );
      const mailOptions: nodemailer.SendMailOptions = {
        from: `A.kit Test Vocacional <${from}>`,
        to: targetEmail,
        subject: `📊 Tu Informe Vocacional${hollandCode ? ` — Código ${hollandCode}` : ''}`,
        html: htmlContent,
        text: textContent,
      };
      if (pdfAttachment) {
        mailOptions.attachments = [
          {
            filename: `Informe_Vocacional_${patientName.replace(/\s+/g, '_')}.pdf`,
            content: pdfAttachment,
            contentType: 'application/pdf',
          },
        ];
      }
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error(`❌ Error dispatching vocational report:`, error);
      return false;
    }
  }

  private renderReportText(
    patientName: string,
    hollandCode?: string,
    reportUrl?: string,
    summary?: ReportSummary,
    tripletInsight?: ReportTripletInsight,
  ): string {
    const lines: string[] = [];
    lines.push('INFORME DE RESULTADOS VOCACIONALES');
    lines.push('');
    lines.push(
      `Hola ${patientName}, aqui tienes los detalles de tu exploracion vocacional.`,
    );
    if (hollandCode) {
      lines.push(`Codigo Holland: ${hollandCode}`);
    }

    if (summary) {
      lines.push('');
      lines.push('RESUMEN EJECUTIVO');
      lines.push('');
      lines.push(
        `Afinidad principal: ${summary.primaryTitle} (${summary.primaryPercentage}%)`,
      );
      lines.push(`Fortaleza destacada: ${summary.profileStrength}`);
      lines.push(`Recomendacion: ${summary.recommendation}`);
      if (summary.rankedAreas.length > 0) {
        lines.push('Ranking de afinidad:');
        summary.rankedAreas.forEach((area, idx) => {
          lines.push(`${idx + 1}. ${area.title} (${area.percentage}%)`);
        });
      }
    }

    lines.push('');
    if (summary?.rankedAreas?.length) {
      lines.push('Ranking de afinidad (Top 3):');
      summary.rankedAreas.forEach((area, idx) => {
        lines.push(`${idx + 1}. ${area.title} (${area.percentage}%)`);
      });
      lines.push('');
    }

    if (tripletInsight) {
      lines.push(`Combinacion destacada: ${tripletInsight.title}`);
      if (tripletInsight.tendencies?.length) {
        lines.push('Tendencias observadas:');
        tripletInsight.tendencies.forEach((item) => lines.push(`- ${item}`));
      }
      lines.push('');
    }

    if (reportUrl) {
      lines.push(`Descargar informe completo en PDF: ${reportUrl}`);
      lines.push('');
    }

    lines.push(`Soporte tecnico: ${this.supportEmail}`);
    lines.push(`Sitio: ${this.brandDomain}`);
    return lines.join('\n');
  }

  async sendVoucherCode(
    targetEmail: string,
    voucherCode: string,
    patientName?: string,
  ): Promise<boolean> {
    try {
      const from = this.configService.get<string>(
        'SMTP_FROM',
        'reportes@akit.app',
      );
      const testUrl = `https://${this.brandDomain}/v/${voucherCode}`;
      const html = this.renderTemplate('voucher-code.pug', {
        titleText: 'Tu código de acceso al test',
        headerLabel: 'Código de acceso',
        voucherCode,
        patientName: patientName || null,
        testUrl,
      });

      await this.transporter.sendMail({
        from: `A.kit Test Vocacional <${from}>`,
        to: targetEmail,
        subject: `🔑 Tu código de acceso para A.kit`,
        html,
      });

      return true;
    } catch (error) {
      console.error(`❌ Error dispatching voucher email:`, error);
      return false;
    }
  }

  async sendAccountActivation(
    targetEmail: string,
    name: string,
    activationLink: string,
    institutionName?: string | null,
  ): Promise<boolean> {
    try {
      const from = this.configService.get<string>(
        'SMTP_FROM',
        'reportes@akit.app',
      );
      const html = this.renderTemplate('account-activation.pug', {
        titleText: 'Activá tu cuenta de A.kit',
        headerLabel: 'Activación de cuenta',
        name,
        greetingName: this.buildGreetingName(name, targetEmail),
        activationLink,
        institutionName: institutionName || null,
      });
      await this.transporter.sendMail({
        from: `A.kit <${from}>`,
        to: targetEmail,
        subject: 'Activá tu cuenta de A.kit',
        html,
      });
      return true;
    } catch (error) {
      console.error(`❌ Error dispatching activation email:`, error);
      return false;
    }
  }

  async sendPasswordReset(
    targetEmail: string,
    name: string,
    resetLink: string,
  ): Promise<boolean> {
    try {
      const from = this.configService.get<string>(
        'SMTP_FROM',
        'reportes@akit.app',
      );
      const html = this.renderTemplate('password-reset.pug', {
        titleText: 'Recuperar contraseña',
        headerLabel: 'Seguridad de cuenta',
        name,
        greetingName: this.buildGreetingName(name, targetEmail),
        resetLink,
      });
      await this.transporter.sendMail({
        from: `A.kit <${from}>`,
        to: targetEmail,
        subject: 'Restablecé tu contraseña de A.kit',
        html,
      });
      return true;
    } catch (error) {
      console.error(`❌ Error dispatching password reset email:`, error);
      return false;
    }
  }

  private buildGreetingName(name: string, email?: string): string | null {
    const normalized = name?.trim();
    if (!normalized) return null;

    const lowerName = normalized.toLowerCase();
    const lowerEmail = email?.trim().toLowerCase();
    if (lowerName.includes('@')) return null;
    if (lowerEmail && lowerName === lowerEmail) return null;
    return normalized;
  }
}

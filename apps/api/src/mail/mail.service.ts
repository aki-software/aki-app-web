import { Injectable } from '@nestjs/common';
import { colors } from '@akit/design-tokens';
import * as path from 'path';
import * as nodemailer from 'nodemailer';
import * as pug from 'pug';
import { ConfigService } from '@nestjs/config';
import {
  ReportSummary,
  ReportTripletInsight,
} from '../common/types/report.types.js';

import { Resend } from 'resend';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;
  private resend: Resend | null = null;
  private transportType: string = 'smtp';
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
    this.transportType = this.configService.get<string>(
      'MAIL_TRANSPORT_TYPE',
      'smtp',
    );

    if (this.transportType === 'smtp') {
      const port = Number(this.configService.get<number>('SMTP_PORT', 2525));
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>(
          'SMTP_HOST',
          'sandbox.smtp.mailtrap.io',
        ),
        port,
        secure: port === 465,
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
    } else {
      // PRO mode uses HTTP Resend API because Render Free tier blocks outbound SMTP ports
      this.resend = new Resend(this.configService.get<string>('MAIL_PRO_PASS'));
    }
  }

  private async dispatchEmail(options: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
  }): Promise<boolean> {
    try {
      if (this.transportType === 'smtp' && this.transporter) {
        await this.transporter.sendMail(options);
      } else if (this.resend) {
        const { error } = await this.resend.emails.send(options);
        if (error) {
          console.error(`❌ Resend HTTP API Error:`, error);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error(`❌ Error dispatching email:`, error);
      return false;
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
    // Use an absolute static URL instead of Base64 Data URI
    // Base64 Data URIs for images are aggressively blocked by Gmail and Resend
    // causing the HTML layout to be stripped out completely.
    return `https://${this.brandDomain}/logo.png`;
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
    const rawName = patientName.replace(/\s*\(.*?\)\s*/g, '').trim();
    const cleanPatientName = rawName.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
    );
    const htmlContent = this.renderReportEmailTemplate(
      cleanPatientName,
      targetEmail,
      hollandCode,
      reportUrl,
      summary,
    );
    const textContent = this.renderReportText(
      cleanPatientName,
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
        from: `Orient A.ki <${from}>`,
        to: targetEmail,
        subject: `📊 Tu Informe Vocacional`,
        html: htmlContent,
        text: textContent,
      };
      if (pdfAttachment) {
        mailOptions.attachments = [
          {
            filename: `Informe_Vocacional_${cleanPatientName.replace(/\s+/g, '_')}.pdf`,
            content: pdfAttachment,
            contentType: 'application/pdf',
          },
        ];
      }
      const success = await this.dispatchEmail(mailOptions);
      return success;
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

      const success = await this.dispatchEmail({
        from: `Orient A.ki <${from}>`,
        to: targetEmail,
        subject: `🔑 Tu código de acceso para Orient A.ki`,
        html,
      });

      return success;
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
        titleText: 'Activá tu cuenta de Orient A.ki',
        headerLabel: 'Activación de cuenta',
        name,
        greetingName: this.buildGreetingName(name, targetEmail),
        activationLink,
        institutionName: institutionName || null,
      });
      const success = await this.dispatchEmail({
        from: `Orient A.ki <${from}>`,
        to: targetEmail,
        subject: 'Activá tu cuenta de Orient A.ki',
        html,
      });
      return success;
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
      const success = await this.dispatchEmail({
        from: `Orient A.ki <${from}>`,
        to: targetEmail,
        subject: 'Restablecé tu contraseña de Orient A.ki',
        html,
      });
      return success;
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

import { Injectable, Logger } from '@nestjs/common';
import { colors } from '@akit/design-tokens';
import * as path from 'path';
import * as nodemailer from 'nodemailer';
import * as pug from 'pug';
import { ConfigService } from '@nestjs/config';
import {
  ReportSummary,
  ReportTripletInsight,
} from '../common/types/report.types.js';
import {
  MailAdapter,
  MailMeta,
  MailPayload,
} from '../common/adapters/mail.adapter.js';

import { Resend } from 'resend';

function getAppRoot(): string {
  const cwd = process.cwd().replace(/\\/g, '/');
  if (!cwd.endsWith('apps/api') && !cwd.includes('apps/api/')) {
    return path.join(process.cwd(), 'apps', 'api');
  }
  return process.cwd();
}

@Injectable()
export class MailService implements MailAdapter {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private resend: Resend | null = null;
  private transportType: string = 'smtp';
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
    attachments?: Array<{
      filename: string;
      content: Buffer;
      contentType?: string;
    }>;
  }): Promise<boolean> {
    try {
      if (this.transportType === 'smtp' && this.transporter) {
        await this.transporter.sendMail(options);
      } else if (this.resend) {
        const { error } = await this.resend.emails.send(options);
        if (error) {
          this.logger.error(`Resend HTTP API Error: ${JSON.stringify(error)}`);
          return false;
        }
      }
      return true;
    } catch (error) {
      this.logger.error(
        `Error dispatching email to ${options.to}:`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }

  private renderTemplate(
    templateName: string,
    payload: Record<string, unknown>,
  ): string {
    const templatePath = path.join(
      getAppRoot(),
      'src',
      'mail',
      'templates',
      templateName,
    );
    return pug.renderFile(templatePath, {
      ...payload,
      colors,
      logoDataUri: this.getLogoDataUri(),
      brandDomain: this.brandDomain,
      supportEmail: this.supportEmail,
    });
  }

  private getLogoDataUri(): string | null {
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

  async send(
    template: string,
    payload: MailPayload,
    meta: MailMeta,
  ): Promise<boolean> {
    try {
      const from = this.configService.get<string>(
        'SMTP_FROM',
        'reportes@akit.app',
      );
      return await this.dispatchEmail({
        from: `Orient A.ki <${from}>`,
        to: meta.to,
        subject: meta.subject,
        html: this.renderTemplate(template, payload),
        text: meta.text,
        attachments: meta.attachments,
      });
    } catch (error) {
      this.logger.error(
        `Error in send method for template ${template} to ${meta.to}:`,
        error instanceof Error ? error.stack : String(error),
      );
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
    const htmlContentPayload = {
      patientName: cleanPatientName,
      patientEmail: targetEmail || null,
      hollandCode: hollandCode || null,
      reportUrl: reportUrl || null,
      summary: summary || null,
    };
    const textContent = this.renderReportText(
      cleanPatientName,
      hollandCode,
      reportUrl,
      summary,
      tripletInsight,
    );
    const attachments = pdfAttachment
      ? [
          {
            filename: `Informe_Vocacional_${cleanPatientName.replace(/\s+/g, '_')}.pdf`,
            content: pdfAttachment,
            contentType: 'application/pdf',
          },
        ]
      : undefined;

    return await this.send('report-email.pug', htmlContentPayload, {
      to: targetEmail,
      subject: `📊 Tu Informe Vocacional`,
      text: textContent,
      attachments,
    });
  }

  async sendVoucherCode(
    targetEmail: string,
    voucherCode: string,
    patientName?: string,
  ): Promise<boolean> {
    const testUrl = `https://${this.brandDomain}/v/${voucherCode}`;
    const payload = {
      titleText: 'Tu código de acceso al test',
      headerLabel: 'Código de acceso',
      voucherCode,
      patientName: patientName || null,
      testUrl,
    };

    return await this.send('voucher-code.pug', payload, {
      to: targetEmail,
      subject: `🔑 Tu código de acceso para Orient A.ki`,
    });
  }

  async sendAccountActivation(
    targetEmail: string,
    name: string,
    activationLink: string,
    institutionName?: string | null,
  ): Promise<boolean> {
    const payload = {
      titleText: 'Activá tu cuenta de Orient A.ki',
      headerLabel: 'Activación de cuenta',
      name,
      greetingName: this.buildGreetingName(name, targetEmail),
      activationLink,
      institutionName: institutionName || null,
    };

    return await this.send('account-activation.pug', payload, {
      to: targetEmail,
      subject: 'Activá tu cuenta de Orient A.ki',
    });
  }

  async sendPasswordReset(
    targetEmail: string,
    name: string,
    resetLink: string,
  ): Promise<boolean> {
    const payload = {
      titleText: 'Recuperar contraseña',
      headerLabel: 'Seguridad de cuenta',
      name,
      greetingName: this.buildGreetingName(name, targetEmail),
      resetLink,
    };

    return await this.send('password-reset.pug', payload, {
      to: targetEmail,
      subject: 'Restablecé tu contraseña de Orient A.ki',
    });
  }

  private buildGreetingName(name: string, email?: string): string | null {
    const normalized = name?.trim();
    if (!normalized) return null;

    let lowerName = normalized.toLowerCase();
    const lowerEmail = email?.trim().toLowerCase();
    if (lowerName.includes('@')) {
      lowerName = lowerName.split('@')[0];
      return lowerName.charAt(0).toUpperCase() + lowerName.slice(1);
    }
    if (lowerEmail && lowerName === lowerEmail) return null;
    return normalized;
  }
}

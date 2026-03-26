import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as pug from 'pug';
import { ConfigService } from '@nestjs/config';

export interface CategoryResult {
  title: string;
  percentage: number;
  description: string;
  parsedBlocks?: { subtitle?: string; content: string }[];
  materialSnippet?: string;
  suggestedCareers?: string[];
}

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const transportType = this.configService.get<string>('MAIL_TRANSPORT_TYPE', 'smtp');

    if (transportType === 'smtp') {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST', 'sandbox.smtp.mailtrap.io'),
        port: Number(this.configService.get<number>('SMTP_PORT', 2525)),
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
    } else {
      // Aquí se podrían agregar otros transportes (SendGrid, Brevo API, etc.)
      // Por ahora, usamos el transporte profesional vía SMTP como fallback seguro
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

  /**
   * Genera el HTML a partir de los resultados para ser usado por el PdfService o el Mailer
   */
  renderReportTemplate(
    patientName: string,
    formattedResults: CategoryResult[],
    hollandCode?: string,
  ): string {
    const templatePath = process.cwd() + '/src/mail/templates/report.pug';
    return pug.renderFile(templatePath, {
      patientName,
      topResults: formattedResults,
      hollandCode: hollandCode || null,
    });
  }

  async sendVocationalReport(
    targetEmail: string,
    patientName: string,
    formattedResults: CategoryResult[],
    hollandCode?: string,
    pdfAttachment?: Buffer,
  ): Promise<boolean> {
    const htmlContent = this.renderReportTemplate(patientName, formattedResults, hollandCode);

    try {
      const from = this.configService.get<string>('SMTP_FROM', 'reportes@akit.app');
      
      const mailOptions: nodemailer.SendMailOptions = {
        from: `A.kit Test Vocacional <${from}>`,
        to: targetEmail,
        subject: `📊 Tu Informe Vocacional${hollandCode ? ` — Código ${hollandCode}` : ''}`,
        html: htmlContent,
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
      console.log(`✅ Email report successfully dispatched to: ${targetEmail}`);
      return true;
    } catch (error) {
      console.error(`❌ Error dispatching email via NodeMailer:`, error);
      return false;
    }
  }
}

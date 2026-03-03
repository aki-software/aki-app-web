import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as pug from 'pug';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
      port: Number(process.env.SMTP_PORT) || 2525,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendVocationalReport(
    targetEmail: string,
    patientName: string,
    formattedResults: {
      title: string;
      percentage: number;
      description: string;
    }[],
  ): Promise<boolean> {
    const templatePath = process.cwd() + '/src/mail/templates/report.pug';
    let htmlContent: string;

    try {
      htmlContent = pug.renderFile(templatePath, {
        patientName,
        topResults: formattedResults,
      });
    } catch (err) {
      console.error('❌ Error rendering Pug template in MailService:', err);
      return false;
    }

    try {
      if (
        !process.env.SMTP_USER ||
        process.env.SMTP_USER === 'aqui_va_el_user'
      ) {
        console.warn(
          '⚠️ Credenciales SMTP no configuradas. El envío se saltará.',
        );
        return false;
      }

      await this.transporter.sendMail({
        from: `A.kit Test Vocacional <${process.env.SMTP_FROM || 'reportes@akit.app'}>`,
        to: targetEmail,
        subject: `📊 Resultados Vocacionales: ${patientName}`,
        html: htmlContent,
      });

      console.log(`✅ Email report successfully dispatched to: ${targetEmail}`);
      return true;
    } catch (error) {
      console.error(`❌ Error dispatching email via NodeMailer:`, error);
      return false;
    }
  }
}

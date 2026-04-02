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
    const htmlContent = this.renderReportTemplate(
      patientName,
      formattedResults,
      hollandCode,
    );
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
      return true;
    } catch (error) {
      console.error(`❌ Error dispatching vocational report:`, error);
      return false;
    }
  }

  async sendVoucherCode(
    targetEmail: string,
    voucherCode: string,
    patientName?: string,
  ): Promise<boolean> {
    try {
      const from = this.configService.get<string>('SMTP_FROM', 'reportes@akit.app');
      const testUrl = `https://akit-test.com/v/${voucherCode}`;

      const html = `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 900; letter-spacing: -0.05em; color: #4f46e5; margin: 0;">A.kit</h1>
            <p style="font-size: 10px; font-weight: bold; color: #6b7280; letter-spacing: 0.1em; margin-top: 4px; text-transform: uppercase;">Acompañamiento Vocacional</p>
          </div>

          <h2 style="font-size: 20px; font-weight: 800; text-align: center; margin-bottom: 24px; letter-spacing: -0.02em;">Tu Código de Acceso al Test</h2>
          
          <p>Hola${patientName ? ` <strong>${patientName}</strong>` : ''},</p>
          <p>Te enviaron un código para realizar tu test vocacional en la plataforma <strong>A.kit</strong>.</p>
          
          <div style="background: #f9fafb; border: 2px dashed #e5e7eb; border-radius: 12px; padding: 32px; text-align: center; margin: 32px 0;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; color: #111827; letter-spacing: 4px; display: block; margin-bottom: 8px;">${voucherCode}</span>
            <span style="font-size: 10px; color: #9ca3af; font-weight: bold; text-transform: uppercase;">CÓDIGO ÚNICO</span>
          </div>

          <div style="text-align: center; margin: 40px 0;">
            <a href="${testUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 16px 32px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 12px; transition: background 0.3s;">
              Comenzar mi Test ahora
            </a>
          </div>

          <p style="font-size: 14px; color: #4b5563; text-align: center;">Si el botón no funciona, copiá y pegá este enlace en tu navegador:</p>
          <p style="word-break: break-all; font-size: 12px; color: #2563eb; text-align: center; margin-top: 4px;">${testUrl}</p>
          
          <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="font-size: 11px; color: #9ca3af;">Este código es de uso único y personal. Por favor, no lo compartas con nadie más.</p>
          </div>
        </div>
      `;

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
      const from = this.configService.get<string>('SMTP_FROM', 'reportes@akit.app');
      const html = `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <h2 style="margin-bottom: 8px;">Activá tu cuenta de A.kit</h2>
          <p>Hola ${name},</p>
          <p>Te dimos acceso a A.kit${institutionName ? ` para <strong>${institutionName}</strong>` : ''}.</p>
          <p>Para definir tu contraseña inicial y entrar al panel, usá este enlace:</p>
          <p><a href="${activationLink}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;">Activar cuenta</a></p>
          <p style="word-break: break-all;">${activationLink}</p>
          <p>Este enlace vence en 72 horas.</p>
        </div>
      `;
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
}

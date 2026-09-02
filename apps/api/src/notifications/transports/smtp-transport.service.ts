import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import {
  MailTransport,
  DispatchEmailOptions,
} from './mail-transport.interface.js';

@Injectable()
export class SmtpTransportService implements MailTransport {
  private readonly logger = new Logger(SmtpTransportService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(host: string, port: number, user: string, pass: string) {
    if (Boolean(user) !== Boolean(pass)) {
      throw new Error(
        'SMTP authentication requires both SMTP_USER and SMTP_PASS',
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
    this.logger.log(
      `Initialized SMTP transport (host: ${host}, port: ${port})`,
    );
  }

  async dispatchEmail(options: DispatchEmailOptions): Promise<void> {
    const mailOptions: nodemailer.SendMailOptions = {
      from: options.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    };

    await this.transporter.sendMail(mailOptions);
  }
}

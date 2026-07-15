import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
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
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  async dispatchEmail(options: DispatchEmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail(options);
    } catch (error) {
      this.logger.error(
        `Failed to dispatch SMTP email to ${options.to}:`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        `Email sending failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

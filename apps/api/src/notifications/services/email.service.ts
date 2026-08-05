import {
  Injectable,
  Logger,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MailTransport,
  MAIL_TRANSPORT_TOKEN,
} from '../transports/mail-transport.interface.js';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;

  constructor(
    @Inject(MAIL_TRANSPORT_TOKEN) private readonly mailTransport: MailTransport,
    private readonly configService: ConfigService,
  ) {
    this.fromEmail = this.configService.get<string>(
      'SMTP_FROM',
      'reportes@akit.app',
    );
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    attachments?: Array<{
      filename: string;
      content: Buffer;
      contentType?: string;
    }>,
  ): Promise<void> {
    try {
      await this.mailTransport.dispatchEmail({
        from: `"Orient A.ki" <${this.fromEmail}>`,
        to,
        subject,
        html,
        attachments,
      });
      this.logger.log(`Email successfully sent to ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}:`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        `Email sending failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

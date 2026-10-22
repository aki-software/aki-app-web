import {
  Injectable,
  Logger,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAIL_TRANSPORT_TOKEN } from '../transports/mail-transport.interface.js';
import type { MailTransport } from '../transports/mail-transport.interface.js';

const SAFE_TRANSPORT_CODES = new Set([
  'EAUTH',
  'ECONNECTION',
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'ENOTFOUND',
  'EPROTOCOL',
  'ESOCKET',
  'ETIMEDOUT',
]);

const formatTransportDiagnostic = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return '';
  }

  const candidate = error as Error & {
    code?: unknown;
    responseCode?: unknown;
  };
  const details: string[] = [];

  if (
    typeof candidate.code === 'string' &&
    SAFE_TRANSPORT_CODES.has(candidate.code)
  ) {
    details.push(`code=${candidate.code}`);
  }

  if (
    typeof candidate.responseCode === 'number' &&
    Number.isInteger(candidate.responseCode) &&
    candidate.responseCode >= 100 &&
    candidate.responseCode <= 599
  ) {
    details.push(`responseCode=${candidate.responseCode}`);
  }

  return details.length > 0 ? ` (${details.join(', ')})` : '';
};

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
      this.logger.log('Email successfully sent');
    } catch (error) {
      this.logger.error(
        `Email delivery failed${formatTransportDiagnostic(error)}`,
      );
      throw new InternalServerErrorException('Email sending failed');
    }
  }
}

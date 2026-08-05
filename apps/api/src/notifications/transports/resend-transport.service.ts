import { Injectable, Logger } from '@nestjs/common';
import {
  MailTransport,
  DispatchEmailOptions,
} from './mail-transport.interface.js';

@Injectable()
export class ResendTransportService implements MailTransport {
  private readonly logger = new Logger(ResendTransportService.name);
  private resend: any;

  constructor(private readonly apiKey: string) {
    this.logger.log('Initialized Resend transport');
  }

  async dispatchEmail(options: DispatchEmailOptions): Promise<void> {
    if (!this.resend) {
      const { Resend } = await import('resend');
      this.resend = new Resend(this.apiKey);
    }

    const { data, error } = await this.resend.emails.send({
      from: options.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
  }
}

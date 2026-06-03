import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { Resend } from 'resend';
import {
  MailTransport,
  DispatchEmailOptions,
} from './mail-transport.interface.js';

@Injectable()
export class ResendTransportService implements MailTransport {
  private readonly logger = new Logger(ResendTransportService.name);
  private readonly resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  async dispatchEmail(options: DispatchEmailOptions): Promise<void> {
    try {
      const { error } = await this.resend.emails.send(options);

      if (error) {
        this.logger.error(`Resend HTTP API Error: ${JSON.stringify(error)}`);
        throw new InternalServerErrorException(
          `Resend API Error: ${error.message}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to dispatch Resend email to ${options.to}:`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        `Email sending failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  MailTransport,
  DispatchEmailOptions,
} from './mail-transport.interface.js';

type ResendClient = {
  emails: {
    send: (
      options: DispatchEmailOptions,
    ) => Promise<{ error?: { message: string } | null }>;
  };
};

@Injectable()
export class ResendTransportService implements MailTransport {
  private readonly logger = new Logger(ResendTransportService.name);
  private resend: ResendClient | null = null;

  constructor(private readonly apiKey: string) {}

  async dispatchEmail(options: DispatchEmailOptions): Promise<void> {
    try {
      const resend = await this.getResend();
      const { error } = await resend.emails.send(options);

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

  private async getResend(): Promise<ResendClient> {
    if (!this.resend) {
      const { Resend } = await import('resend');
      this.resend = new Resend(this.apiKey) as unknown as ResendClient;
    }

    return this.resend;
  }
}

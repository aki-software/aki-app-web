import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailRequestedEvent } from '../../events/domain-events.js';
import { TemplateRendererService } from '../services/template-renderer.service.js';
import { EmailService } from '../services/email.service.js';

@Injectable()
export class EmailRequestedHandler {
  private readonly logger = new Logger(EmailRequestedHandler.name);

  constructor(
    private readonly templateRenderer: TemplateRendererService,
    private readonly emailService: EmailService,
  ) {}

  @OnEvent('email.requested')
  async handleEmailRequestedEvent(event: EmailRequestedEvent) {
    this.logger.log(`Handling email.requested event for ${event.meta?.to}`);
    try {
      const html = this.templateRenderer.renderTemplate(
        event.template,
        event.payload,
      );
      await this.emailService.sendEmail(
        event.meta.to,
        event.meta.subject,
        html,
      );
      this.logger.log(`Generic email sent to ${event.meta?.to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send generic email to ${event.meta?.to}`,
        error,
      );
    }
  }
}

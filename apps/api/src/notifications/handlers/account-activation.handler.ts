import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AccountActivationRequestedEvent } from '../../events/domain-events.js';
import { TemplateRendererService } from '../services/template-renderer.service.js';
import { EmailService } from '../services/email.service.js';

@Injectable()
export class AccountActivationHandler {
  private readonly logger = new Logger(AccountActivationHandler.name);

  constructor(
    private readonly templateRenderer: TemplateRendererService,
    private readonly emailService: EmailService,
  ) {}

  @OnEvent('account.activation.requested')
  async handleAccountActivationRequestedEvent(
    event: AccountActivationRequestedEvent,
  ) {
    this.logger.log(
      `Handling account.activation.requested event for ${event.email}`,
    );
    try {
      const html = this.templateRenderer.renderTemplate(
        'account-activation.pug',
        {
          greetingName: event.name,
          activationLink: event.activationLink,
          institutionName: event.institutionName,
        },
      );
      await this.emailService.sendEmail(
        event.email,
        'Activá tu cuenta - Orient A.ki',
        html,
      );
      this.logger.log(`Account activation email sent to ${event.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send account activation email to ${event.email}`,
        error,
      );
    }
  }
}

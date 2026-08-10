import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PasswordResetRequestedEvent } from '../../events/domain-events.js';
import { TemplateRendererService } from '../services/template-renderer.service.js';
import { EmailService } from '../services/email.service.js';

@Injectable()
export class PasswordResetHandler {
  private readonly logger = new Logger(PasswordResetHandler.name);

  constructor(
    private readonly templateRenderer: TemplateRendererService,
    private readonly emailService: EmailService,
  ) {}

  @OnEvent('password.reset.requested')
  async handlePasswordResetRequestedEvent(event: PasswordResetRequestedEvent) {
    this.logger.log(
      `Handling password.reset.requested event for ${event.email}`,
    );
    try {
      const html = this.templateRenderer.renderTemplate('password-reset.pug', {
        name: event.name,
        resetLink: event.resetLink,
      });
      await this.emailService.sendEmail(
        event.email,
        'Recuperá tu contraseña - Orient A.ki',
        html,
      );
      this.logger.log(`Password reset email sent to ${event.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${event.email}`,
        error,
      );
    }
  }
}

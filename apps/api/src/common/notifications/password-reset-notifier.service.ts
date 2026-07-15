import { Inject, Injectable } from '@nestjs/common';
import { MailService } from '../../mail/mail.service.js';
import type { QueueAdapter } from '../adapters/queue.adapter.js';
import { QUEUE_ADAPTER } from '../constants/adapters.constants.js';
import { PASSWORD_RESET_EMAIL_OPTIONS } from '../constants/notifications.constants.js';
import { JobNames, SendEmailJobPayload } from '../jobs/index.js';
import { buildGreetingName } from './utils/notification.utils.js';

@Injectable()
export class PasswordResetNotifierService {
  constructor(
    private readonly mailService: MailService,
    @Inject(QUEUE_ADAPTER)
    private readonly queueAdapter: QueueAdapter,
  ) {}

  async notifyPasswordReset(email: string, name: string, resetLink: string) {
    const template = PASSWORD_RESET_EMAIL_OPTIONS.template;
    const templatePayload = {
      titleText: 'Recuperar contraseña',
      headerLabel: 'Seguridad de cuenta',
      name,
      greetingName: buildGreetingName(name, email),
      resetLink,
    };
    const meta = {
      to: email,
      subject: PASSWORD_RESET_EMAIL_OPTIONS.subject,
    };

    if (this.queueAdapter.isConfigured()) {
      await this.enqueuePasswordResetEmail(template, templatePayload, meta);
      return true;
    }

    await this.mailService.send(template, templatePayload, meta);
    return true;
  }

  private async enqueuePasswordResetEmail(
    template: string,
    templatePayload: Record<string, unknown>,
    meta: {
      to: string;
      subject: string;
      sessionId?: string;
      voucherId?: string;
    },
  ): Promise<boolean> {
    const payload: SendEmailJobPayload = {
      jobId: `password-reset-email-${meta.to}-${Date.now()}`,
      attempts: PASSWORD_RESET_EMAIL_OPTIONS.attempts,
      backoffMs: PASSWORD_RESET_EMAIL_OPTIONS.backoffMs,
      backoffType: PASSWORD_RESET_EMAIL_OPTIONS.backoffType,
      timeoutMs: PASSWORD_RESET_EMAIL_OPTIONS.timeoutMs,
      concurrencyKey: PASSWORD_RESET_EMAIL_OPTIONS.concurrencyKey,
      concurrencyLimit: PASSWORD_RESET_EMAIL_OPTIONS.concurrencyLimit,
      template,
      payload: templatePayload as any,
      meta,
    };

    await this.queueAdapter.enqueue(JobNames.SendEmail, payload, {
      attempts: payload.attempts,
      backoffMs: payload.backoffMs,
      backoffType: payload.backoffType,
      timeoutMs: payload.timeoutMs,
      concurrencyKey: payload.concurrencyKey,
      concurrencyLimit: payload.concurrencyLimit,
    });
    return true;
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { MailService } from '../../mail/mail.service';
import type { QueueAdapter } from '../adapters/queue.adapter';
import { QUEUE_ADAPTER } from '../constants/adapters.constants';
import { PASSWORD_RESET_EMAIL_OPTIONS } from '../constants/notifications.constants';
import { JobNames, SendEmailJobPayload } from '../jobs';

@Injectable()
export class PasswordResetNotifierService {
  constructor(
    private readonly mailService: MailService,
    @Inject(QUEUE_ADAPTER)
    private readonly queueAdapter: QueueAdapter,
  ) {}

  async notifyPasswordReset(email: string, name: string, resetLink: string) {
    if (this.queueAdapter.isConfigured()) {
      await this.enqueuePasswordResetEmail(email, name, resetLink);
      return true;
    }

    await this.mailService.sendPasswordReset(email, name, resetLink);
    return true;
  }

  private async enqueuePasswordResetEmail(
    email: string,
    name: string,
    resetLink: string,
  ): Promise<boolean> {
    const payload: SendEmailJobPayload = {
      jobId: `password-reset-email-${email}-${Date.now()}`,
      attempts: PASSWORD_RESET_EMAIL_OPTIONS.attempts,
      backoffMs: PASSWORD_RESET_EMAIL_OPTIONS.backoffMs,
      backoffType: PASSWORD_RESET_EMAIL_OPTIONS.backoffType,
      timeoutMs: PASSWORD_RESET_EMAIL_OPTIONS.timeoutMs,
      concurrencyKey: PASSWORD_RESET_EMAIL_OPTIONS.concurrencyKey,
      concurrencyLimit: PASSWORD_RESET_EMAIL_OPTIONS.concurrencyLimit,
      template: PASSWORD_RESET_EMAIL_OPTIONS.template,
      payload: {
        name,
        resetLink,
      },
      meta: {
        to: email,
        subject: PASSWORD_RESET_EMAIL_OPTIONS.subject,
      },
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

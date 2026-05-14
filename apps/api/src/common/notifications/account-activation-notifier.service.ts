import { Inject, Injectable } from '@nestjs/common';
import { MailService } from '../../mail/mail.service.js';
import type { QueueAdapter } from '../adapters/queue.adapter.js';
import { QUEUE_ADAPTER } from '../constants/adapters.constants.js';
import { ACCOUNT_ACTIVATION_EMAIL_OPTIONS } from '../constants/notifications.constants.js';
import { JobNames, SendEmailJobPayload } from '../jobs/index.js';

@Injectable()
export class AccountActivationNotifierService {
  constructor(
    private readonly mailService: MailService,
    @Inject(QUEUE_ADAPTER)
    private readonly queueAdapter: QueueAdapter,
  ) {}

  async notifyAccountActivation(
    email: string,
    name: string,
    activationLink: string,
    institutionName: string | null,
  ) {
    if (this.queueAdapter.isConfigured()) {
      await this.enqueueActivationEmail(email, name, activationLink, institutionName);
      return true;
    }

    await this.mailService.sendAccountActivation(
      email,
      name,
      activationLink,
      institutionName,
    );
    return true;
  }

  private async enqueueActivationEmail(
    email: string,
    name: string,
    activationLink: string,
    institutionName: string | null,
  ): Promise<boolean> {
    const payload: SendEmailJobPayload = {
      jobId: `activation-email-${email}-${Date.now()}`,
      attempts: ACCOUNT_ACTIVATION_EMAIL_OPTIONS.attempts,
      backoffMs: ACCOUNT_ACTIVATION_EMAIL_OPTIONS.backoffMs,
      backoffType: ACCOUNT_ACTIVATION_EMAIL_OPTIONS.backoffType,
      timeoutMs: ACCOUNT_ACTIVATION_EMAIL_OPTIONS.timeoutMs,
      concurrencyKey: ACCOUNT_ACTIVATION_EMAIL_OPTIONS.concurrencyKey,
      concurrencyLimit: ACCOUNT_ACTIVATION_EMAIL_OPTIONS.concurrencyLimit,
      template: ACCOUNT_ACTIVATION_EMAIL_OPTIONS.template,
      payload: {
        name,
        activationLink,
        institutionName,
      },
      meta: {
        to: email,
        subject: ACCOUNT_ACTIVATION_EMAIL_OPTIONS.subject,
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

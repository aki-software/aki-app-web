import { Inject, Injectable } from '@nestjs/common';
import { MailService } from '../../mail/mail.service.js';
import type { QueueAdapter } from '../adapters/queue.adapter.js';
import { QUEUE_ADAPTER } from '../constants/adapters.constants.js';
import { ACCOUNT_ACTIVATION_EMAIL_OPTIONS } from '../constants/notifications.constants.js';
import { JobNames, SendEmailJobPayload } from '../jobs/index.js';
import { buildGreetingName } from './utils/notification.utils.js';

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
    const template = ACCOUNT_ACTIVATION_EMAIL_OPTIONS.template;
    const templatePayload = {
      titleText: 'Activá tu cuenta de Orient A.ki',
      headerLabel: 'Activación de cuenta',
      name,
      greetingName: buildGreetingName(name, email),
      activationLink,
      institutionName: institutionName || null,
    };
    const meta = {
      to: email,
      subject: ACCOUNT_ACTIVATION_EMAIL_OPTIONS.subject,
    };

    if (this.queueAdapter.isConfigured()) {
      await this.enqueueActivationEmail(template, templatePayload, meta);
      return true;
    }

    await this.mailService.send(template, templatePayload, meta);
    return true;
  }

  private async enqueueActivationEmail(
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
      jobId: `activation-email-${meta.to}-${Date.now()}`,
      attempts: ACCOUNT_ACTIVATION_EMAIL_OPTIONS.attempts,
      backoffMs: ACCOUNT_ACTIVATION_EMAIL_OPTIONS.backoffMs,
      backoffType: ACCOUNT_ACTIVATION_EMAIL_OPTIONS.backoffType,
      timeoutMs: ACCOUNT_ACTIVATION_EMAIL_OPTIONS.timeoutMs,
      concurrencyKey: ACCOUNT_ACTIVATION_EMAIL_OPTIONS.concurrencyKey,
      concurrencyLimit: ACCOUNT_ACTIVATION_EMAIL_OPTIONS.concurrencyLimit,
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

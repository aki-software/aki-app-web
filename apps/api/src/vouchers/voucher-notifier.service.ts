import { Inject, Injectable, Logger } from '@nestjs/common';
import { MailService } from '../mail/mail.service.js';
import { QUEUE_ADAPTER } from '../common/constants/adapters.constants.js';
import type { QueueAdapter } from '../common/adapters/queue.adapter.js';
import { JobNames, SendEmailJobPayload } from '../common/jobs/index.js';
import { Voucher } from './entities/voucher.entity.js';
import { VOUCHER_EMAIL_JOB_CONFIG } from './vouchers.constants.js';

@Injectable()
export class VoucherNotifierService {
  private readonly logger = new Logger(VoucherNotifierService.name);

  constructor(
    private readonly mailService: MailService,
    @Inject(QUEUE_ADAPTER)
    private readonly queueAdapter: QueueAdapter,
  ) {}

  async sendVoucherEmail(
    voucher: Voucher,
    targetEmail: string,
  ): Promise<boolean> {
    if (this.queueAdapter.isConfigured()) {
      return await this.enqueueVoucherEmail(voucher, targetEmail);
    }

    return await this.mailService.sendVoucherCode(
      targetEmail,
      voucher.code,
      voucher.assignedPatientName || undefined,
    );
  }

  private async enqueueVoucherEmail(
    voucher: Voucher,
    targetEmail: string,
  ): Promise<boolean> {
    const payload: SendEmailJobPayload = {
      jobId: `voucher-email-${voucher.id}-${Date.now()}`,
      attempts: VOUCHER_EMAIL_JOB_CONFIG.ATTEMPTS,
      backoffMs: VOUCHER_EMAIL_JOB_CONFIG.BACKOFF_MS,
      backoffType: VOUCHER_EMAIL_JOB_CONFIG.BACKOFF_TYPE,
      timeoutMs: VOUCHER_EMAIL_JOB_CONFIG.TIMEOUT_MS,
      concurrencyKey: VOUCHER_EMAIL_JOB_CONFIG.CONCURRENCY_KEY,
      concurrencyLimit: VOUCHER_EMAIL_JOB_CONFIG.CONCURRENCY_LIMIT,
      template: 'voucher-code',
      payload: {
        voucherCode: voucher.code,
        patientName: voucher.assignedPatientName || undefined,
      },
      meta: {
        to: targetEmail,
        subject: '🔑 Tu código de acceso para A.kit',
        voucherId: voucher.id,
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

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    private readonly configService: ConfigService,
  ) {}

  async sendVoucherEmail(
    voucher: Voucher,
    targetEmail: string,
  ): Promise<boolean> {
    const brandDomain = this.configService.get<string>('BRAND_DOMAIN', 'orienta.ki');
    const testUrl = `https://${brandDomain}/v/${voucher.code}`;
    
    const template = 'voucher-code.pug';
    const templatePayload = {
      titleText: 'Tu código de acceso al test',
      headerLabel: 'Código de acceso',
      voucherCode: voucher.code,
      patientName: voucher.assignedPatientName || null,
      testUrl,
    };
    const meta = {
      to: targetEmail,
      subject: '🔑 Tu código de acceso para Orient A.ki',
      voucherId: voucher.id,
    };

    if (this.queueAdapter.isConfigured()) {
      return await this.enqueueVoucherEmail(template, templatePayload, meta);
    }

    return await this.mailService.send(template, templatePayload, meta);
  }

  async notifyBatchAssignment(
    targetEmail: string,
    institutionName: string,
    quantity: number,
    expiresAt: Date | null,
  ): Promise<boolean> {
    const webAppUrl = this.configService.get<string>('WEB_APP_URL', 'http://localhost:5173');
    const template = 'voucher-batch-assignment.pug';
    
    let expiresAtStr = null;
    if (expiresAt) {
      const dd = String(expiresAt.getDate()).padStart(2, '0');
      const mm = String(expiresAt.getMonth() + 1).padStart(2, '0');
      const yyyy = expiresAt.getFullYear();
      expiresAtStr = `${dd}/${mm}/${yyyy}`;
    }

    const templatePayload = {
      titleText: 'Nuevos vouchers asignados',
      headerLabel: 'Acreditación de vouchers',
      institutionName,
      quantity,
      expiresAt: expiresAtStr,
      dashboardUrl: webAppUrl,
    };
    
    const meta = {
      to: targetEmail,
      subject: '🎟 Nuevos vouchers asignados a tu cuenta',
    };

    if (this.queueAdapter.isConfigured()) {
      return await this.enqueueVoucherEmail(template, templatePayload, meta);
    }

    return await this.mailService.send(template, templatePayload, meta);
  }

  private async enqueueVoucherEmail(
    template: string,
    templatePayload: Record<string, unknown>,
    meta: { to: string; subject: string; voucherId?: string },
  ): Promise<boolean> {
    const payload: SendEmailJobPayload = {
      jobId: `voucher-email-${meta.voucherId}-${Date.now()}`,
      attempts: VOUCHER_EMAIL_JOB_CONFIG.ATTEMPTS,
      backoffMs: VOUCHER_EMAIL_JOB_CONFIG.BACKOFF_MS,
      backoffType: VOUCHER_EMAIL_JOB_CONFIG.BACKOFF_TYPE,
      timeoutMs: VOUCHER_EMAIL_JOB_CONFIG.TIMEOUT_MS,
      concurrencyKey: VOUCHER_EMAIL_JOB_CONFIG.CONCURRENCY_KEY,
      concurrencyLimit: VOUCHER_EMAIL_JOB_CONFIG.CONCURRENCY_LIMIT,
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

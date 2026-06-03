import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { JobHandler } from './job-handler.interface.js';
import { JobNames } from '../job-names.js';
import { SendEmailJobPayload } from '../send-email.job.js';
import { MailService } from '../../../mail/mail.service.js';

@Injectable()
export class SendEmailHandler implements JobHandler<SendEmailJobPayload> {
  readonly name = JobNames.SendEmail;
  private readonly logger = new Logger(SendEmailHandler.name);
  private readonly defaultTimeoutMs = 20_000;

  constructor(private readonly moduleRef: ModuleRef) {}

  private getMailService(): MailService {
    return this.moduleRef.get(MailService, { strict: false });
  }

  getTimeoutMs(payload: SendEmailJobPayload): number {
    return payload.timeoutMs ?? this.defaultTimeoutMs;
  }

  getJobContext(payload: SendEmailJobPayload) {
    return {
      jobId: payload.jobId,
      sessionId: payload.meta?.sessionId,
      voucherId: payload.meta?.voucherId,
    };
  }

  async handle(payload: SendEmailJobPayload): Promise<boolean> {
    const { template, payload: templatePayload, meta } = payload;
    const jobId = payload.jobId ?? 'none';
    const sessionId = meta.sessionId ?? 'none';
    const voucherId = meta.voucherId ?? 'none';

    this.logger.log(
      `job-mail template=${template} jobId=${jobId} sessionId=${sessionId} voucherId=${voucherId} to=${meta.to}`,
    );

    return await this.getMailService().send(
      template,
      templatePayload as any,
      meta,
    );
  }
}

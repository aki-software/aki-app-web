import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ModuleRef } from '@nestjs/core';
import { SendEmailJobPayload } from '../send-email.job.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmailRequestedEvent } from '../../../events/domain-events.js';

@Processor('email')
export class SendEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(SendEmailProcessor.name);

  constructor(private readonly moduleRef: ModuleRef) {
    super();
  }

  private getEventEmitter(): EventEmitter2 {
    return this.moduleRef.get(EventEmitter2, { strict: false });
  }

  async process(job: Job<SendEmailJobPayload, any, string>): Promise<boolean> {
    const payload = job.data;
    const { template, payload: templatePayload, meta } = payload;
    const jobId = payload.jobId ?? 'none';
    const sessionId = meta.sessionId ?? 'none';
    const voucherId = meta.voucherId ?? 'none';

    this.logger.log(
      `job-mail template=${template} jobId=${jobId} sessionId=${sessionId} voucherId=${voucherId} to=${meta.to}`,
    );

    this.getEventEmitter().emit(
      'email.requested',
      new EmailRequestedEvent(template, templatePayload, meta),
    );
    return true;
  }
}

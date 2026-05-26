import { Module, Global } from '@nestjs/common';
import { MailModule } from '../mail/mail.module.js';
import { PdfService } from './services/pdf.service.js';
import { StorageService } from './services/storage.service.js';
import { CryptoService } from './services/crypto.service.js';
import { RateLimitService } from './services/rate-limit.service.js';
import {
  PDF_GENERATOR,
  STORAGE_ADAPTER,
  QUEUE_ADAPTER,
} from './constants/adapters.constants.js';
import { InMemoryQueueAdapter } from './adapters/in-memory-queue.adapter.js';
import { BullMQQueueAdapter } from './adapters/bullmq-queue.adapter.js';
import { JobDispatcherService } from './services/job-dispatcher.service.js';
import { IdempotencyService } from './services/idempotency.service.js';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor.js';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SendEmailHandler } from './jobs/handlers/send-email.handler.js';
import { GeneratePdfHandler } from './jobs/handlers/generate-pdf.handler.js';
import { SendReportHandler } from './jobs/handlers/send-report.handler.js';

@Global()
@Module({
  imports: [MailModule],
  providers: [
    PdfService,
    StorageService,
    CryptoService,
    RateLimitService,
    JobDispatcherService,
    SendEmailHandler,
    GeneratePdfHandler,
    SendReportHandler,
    InMemoryQueueAdapter,
    BullMQQueueAdapter,
    { provide: PDF_GENERATOR, useExisting: PdfService },
    { provide: STORAGE_ADAPTER, useExisting: StorageService },
    {
      provide: QUEUE_ADAPTER,
      useFactory: (
        bullMqAdapter: BullMQQueueAdapter,
        inMemoryAdapter: InMemoryQueueAdapter,
      ) => {
        const enableBullMq = process.env.ENABLE_BULLMQ === 'true';
        return enableBullMq && bullMqAdapter.isEnabled
          ? bullMqAdapter
          : inMemoryAdapter;
      },
      inject: [BullMQQueueAdapter, InMemoryQueueAdapter],
    },
    IdempotencyService,
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
  exports: [
    PdfService,
    StorageService,
    CryptoService,
    RateLimitService,
    JobDispatcherService,
    PDF_GENERATOR,
    STORAGE_ADAPTER,
    QUEUE_ADAPTER,
    IdempotencyService,
  ],
})
export class CommonModule {}

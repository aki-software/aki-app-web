import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailModule } from '../mail/mail.module.js';
import { PdfService } from './services/pdf.service.js';
import { StorageService } from './services/storage.service.js';
import { CryptoService } from './services/crypto.service.js';
import { RateLimitService } from './services/rate-limit.service.js';
import {
  PDF_GENERATOR,
  STORAGE_ADAPTER,
  QUEUE_ADAPTER,
  MAIL_ADAPTER,
} from './constants/adapters.constants.js';
import { InMemoryQueueAdapter } from './adapters/in-memory-queue.adapter.js';
import { BullMQQueueAdapter } from './adapters/bullmq-queue.adapter.js';
import { BullMQWorkerService } from './services/bullmq-worker.service.js';
import { JobDispatcherService } from './services/job-dispatcher.service.js';
import { IdempotencyService } from './services/idempotency.service.js';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor.js';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { SendEmailHandler } from './jobs/handlers/send-email.handler.js';
import { GeneratePdfHandler } from './jobs/handlers/generate-pdf.handler.js';
import { SendReportHandler } from './jobs/handlers/send-report.handler.js';
import { MailService } from '../mail/mail.service.js';
import { AllExceptionsFilter } from './filters/all-exceptions.filter.js';

@Global()
@Module({
  imports: [MailModule],
  providers: [
    PdfService,
    StorageService,
    CryptoService,
    RateLimitService,
    JobDispatcherService,
    BullMQWorkerService,
    SendEmailHandler,
    GeneratePdfHandler,
    SendReportHandler,
    InMemoryQueueAdapter,
    BullMQQueueAdapter,
    { provide: PDF_GENERATOR, useExisting: PdfService },
    { provide: STORAGE_ADAPTER, useExisting: StorageService },
    { provide: MAIL_ADAPTER, useExisting: MailService },
    {
      provide: QUEUE_ADAPTER,
      useFactory: (
        bullMqAdapter: BullMQQueueAdapter,
        inMemoryAdapter: InMemoryQueueAdapter,
        configService: ConfigService,
      ) => {
        const enableBullMq = configService.get<string>('ENABLE_BULLMQ') === 'true';
        return enableBullMq && bullMqAdapter.isEnabled
          ? bullMqAdapter
          : inMemoryAdapter;
      },
      inject: [BullMQQueueAdapter, InMemoryQueueAdapter, ConfigService],
    },
    IdempotencyService,
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
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
    MAIL_ADAPTER,
    IdempotencyService,
  ],
})
export class CommonModule {}

import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { BullMQQueueAdapter } from './adapters/bullmq-queue.adapter.js';
import { InMemoryQueueAdapter } from './adapters/in-memory-queue.adapter.js';
import {
  PDF_GENERATOR,
  QUEUE_ADAPTER,
  STORAGE_ADAPTER,
} from './constants/adapters.constants.js';
import { AllExceptionsFilter } from './filters/all-exceptions.filter.js';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor.js';
import { GeneratePdfProcessor } from './jobs/handlers/generate-pdf.processor.js';
import { SendEmailProcessor } from './jobs/handlers/send-email.processor.js';
import { SendReportProcessor } from './jobs/handlers/send-report.processor.js';
import { CryptoService } from './services/crypto.service.js';
import { IdempotencyService } from './services/idempotency.service.js';
import { PdfService } from './services/pdf.service.js';
import { RateLimitService } from './services/rate-limit.service.js';
import { StorageService } from './services/storage.service.js';

@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'pdf' },
      { name: 'reports' },
      { name: 'send-report' },
      { name: 'metrics' },
    ),
  ],
  providers: [
    PdfService,
    StorageService,
    CryptoService,
    RateLimitService,
    SendEmailProcessor,
    GeneratePdfProcessor,
    SendReportProcessor,
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
    PDF_GENERATOR,
    STORAGE_ADAPTER,
    QUEUE_ADAPTER,
    BullMQQueueAdapter,
    IdempotencyService,
  ],
})
export class CommonModule {}

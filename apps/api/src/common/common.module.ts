import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
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
import { IdempotencyService } from './services/idempotency.service.js';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor.js';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { SendEmailProcessor } from './jobs/handlers/send-email.processor.js';
import { GeneratePdfProcessor } from './jobs/handlers/generate-pdf.processor.js';
import { AllExceptionsFilter } from './filters/all-exceptions.filter.js';

@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'pdf' },
      { name: 'reports' },
    ),
  ],
  providers: [
    PdfService,
    StorageService,
    CryptoService,
    RateLimitService,
    SendEmailProcessor,
    GeneratePdfProcessor,
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
    IdempotencyService,
  ],
})
export class CommonModule {}

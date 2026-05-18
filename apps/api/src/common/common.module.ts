import { Module, Global, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { PdfService } from './services/pdf.service.js';
import { StorageService } from './services/storage.service.js';
import { TresAreasService } from './services/tres-areas.service.js';
import { CryptoService } from './services/crypto.service.js';
import { RateLimitService } from './services/rate-limit.service.js';
import {
  PDF_GENERATOR,
  STORAGE_ADAPTER,
  QUEUE_ADAPTER,
} from './constants/adapters.constants.js';
import { TresAreasCombination } from './entities/tres-areas-combination.entity.js';
import { InMemoryQueueAdapter } from './adapters/in-memory-queue.adapter.js';
import { BullMQQueueAdapter } from './adapters/bullmq-queue.adapter.js';
import { JobDispatcherService } from './services/job-dispatcher.service.js';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([TresAreasCombination]),
    MailModule,
    forwardRef(() => SessionsModule),
  ],
  providers: [
    PdfService,
    StorageService,
    TresAreasService,
    CryptoService,
    RateLimitService,
    JobDispatcherService,
    InMemoryQueueAdapter,
    BullMQQueueAdapter,
    { provide: PDF_GENERATOR, useExisting: PdfService },
    { provide: STORAGE_ADAPTER, useExisting: StorageService },
    {
      provide: QUEUE_ADAPTER,
      useFactory: (
        bullMqAdapter: BullMQQueueAdapter,
        inMemoryAdapter: InMemoryQueueAdapter,
      ) => (bullMqAdapter.isEnabled ? bullMqAdapter : inMemoryAdapter),
      inject: [BullMQQueueAdapter, InMemoryQueueAdapter],
    },
  ],
  exports: [
    PdfService,
    StorageService,
    TresAreasService,
    CryptoService,
    RateLimitService,
    JobDispatcherService,
    PDF_GENERATOR,
    STORAGE_ADAPTER,
    QUEUE_ADAPTER,
  ],
})
export class CommonModule {}

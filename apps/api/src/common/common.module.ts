import { Module, Global, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';
import { SessionsModule } from '../sessions/sessions.module';
import { PdfService } from './services/pdf.service';
import { StorageService } from './services/storage.service';
import { TresAreasService } from './services/tres-areas.service';
import {
  PDF_GENERATOR,
  STORAGE_ADAPTER,
  QUEUE_ADAPTER,
} from './constants/adapters.constants';
import { TresAreasCombination } from './entities/tres-areas-combination.entity';
import { InMemoryQueueAdapter } from './adapters/in-memory-queue.adapter';
import { BullMQQueueAdapter } from './adapters/bullmq-queue.adapter';
import { JobDispatcherService } from './services/job-dispatcher.service';

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
    JobDispatcherService,
    PDF_GENERATOR,
    STORAGE_ADAPTER,
    QUEUE_ADAPTER,
  ],
})
export class CommonModule {}

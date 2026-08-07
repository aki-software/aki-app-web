import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReportWorker } from './report.worker';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'reports',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false, // keep in queue / move to DLQ equivalent
      },
    }),
  ],
  providers: [ReportWorker],
  exports: [BullModule],
})
export class ReportsModule {}

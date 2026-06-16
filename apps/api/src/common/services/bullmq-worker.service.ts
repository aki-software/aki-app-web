import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job, Worker as BullMQWorker } from 'bullmq';
import { JobDispatcherService } from './job-dispatcher.service.js';
import { JobNames } from '../jobs/job-names.js';
import { getRedisConnection } from '../utils/redis.utils.js';

@Injectable()
export class BullMQWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BullMQWorkerService.name);
  private worker: BullMQWorker | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly jobDispatcherService: JobDispatcherService,
  ) {}

  async onModuleInit(): Promise<void> {
    const enableBullMQ =
      this.configService.get<string>('ENABLE_BULLMQ') === 'true';
    if (!enableBullMQ) {
      this.logger.log('BullMQ worker is disabled (ENABLE_BULLMQ !== true)');
      return;
    }

    const connection = getRedisConnection(this.configService);
    if (!connection) {
      this.logger.warn(
        'BullMQ is enabled but no valid Redis connection could be resolved. Worker not started.',
      );
      return;
    }

    this.logger.log('Initializing BullMQ worker for queue akit-jobs');
    const { Worker } = await import('bullmq');

    this.worker = new Worker(
      'akit-jobs',
      async (job: Job) => {
        this.logger.debug(`Processing job name=${job.name} id=${job.id}`);
        await this.jobDispatcherService.dispatch(
          job.name as JobNames,
          job.data,
        );
      },
      { connection },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Job failed name=${job?.name ?? 'unknown'} id=${job?.id ?? 'unknown'} error=${err.message}`,
        err.stack,
      );
    });

    this.worker.on('error', (err) => {
      this.logger.error(`BullMQ worker error: ${err.message}`, err.stack);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      this.logger.log('Closing BullMQ worker...');
      await this.worker.close();
      this.worker = null;
      this.logger.log('BullMQ worker closed.');
    }
  }

  getWorker(): BullMQWorker | null {
    return this.worker;
  }
}

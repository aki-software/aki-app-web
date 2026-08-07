import { Test, TestingModule } from '@nestjs/testing';
import { ReportWorker } from './report.worker.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import {
  ReportGeneratedEvent,
  ReportFailedEvent,
} from '../events/domain-events.js';

describe('ReportWorker', () => {
  let worker: ReportWorker;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    eventEmitter = {
      emit: jest.fn(),
      emitAsync: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportWorker,
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    worker = module.get<ReportWorker>(ReportWorker);
  });

  it('should be defined', () => {
    expect(worker).toBeDefined();
  });

  it('should emit report.generated on successful processing', async () => {
    const mockJob = {
      id: 'job-123',
      data: { requestedByEmail: 'test@test.com' },
    } as Job;

    const result = await worker.process(mockJob);

    expect(result).toBe('https://s3.bucket/reports/report-job-123.pdf');
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      'report.generated',
      expect.any(ReportGeneratedEvent),
    );
  });

  it('should emit report.failed when job fails after max attempts', () => {
    const mockJob = {
      id: 'job-123',
      attemptsMade: 3,
      opts: { attempts: 3 },
    } as unknown as Job;

    worker.onFailed(mockJob, new Error('Fatal'));

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'report.failed',
      expect.any(ReportFailedEvent),
    );
  });

  it('should not emit report.failed when job has remaining attempts', () => {
    const mockJob = {
      id: 'job-123',
      attemptsMade: 1,
      opts: { attempts: 3 },
    } as unknown as Job;

    worker.onFailed(mockJob, new Error('Transient'));

    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});

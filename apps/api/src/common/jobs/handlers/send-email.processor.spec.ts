import { Test, TestingModule } from '@nestjs/testing';
import { SendEmailProcessor } from './send-email.processor.js';
import { ModuleRef } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { EmailRequestedEvent } from '../../../events/domain-events.js';

describe('SendEmailProcessor', () => {
  let processor: SendEmailProcessor;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let moduleRef: jest.Mocked<ModuleRef>;

  beforeEach(async () => {
    eventEmitter = { emit: jest.fn(), emitAsync: jest.fn() } as any;
    moduleRef = { get: jest.fn().mockReturnValue(eventEmitter) } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendEmailProcessor,
        { provide: ModuleRef, useValue: moduleRef },
      ],
    }).compile();

    processor = module.get<SendEmailProcessor>(SendEmailProcessor);
  });

  it('should process job and emit email.requested event', async () => {
    const jobData = {
      template: 'welcome',
      payload: { name: 'John' },
      meta: { to: 'john@example.com', sessionId: 's1', voucherId: 'v1' },
      jobId: 'j1',
    };

    const mockJob = { data: jobData } as Job<any, any, string>;

    const result = await processor.process(mockJob);

    expect(result).toBe(true);
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      'email.requested',
      expect.any(EmailRequestedEvent),
    );
  });
});

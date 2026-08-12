import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { BullMQQueueAdapter } from './bullmq-queue.adapter.js';
import { InMemoryQueueAdapter } from './in-memory-queue.adapter.js';
import { Queue } from 'bullmq';

describe('BullMQQueueAdapter', () => {
  let adapter: BullMQQueueAdapter;
  let emailQueue: jest.Mocked<Queue>;
  let pdfQueue: jest.Mocked<Queue>;
  let reportsQueue: jest.Mocked<Queue>;
  let fallbackAdapter: jest.Mocked<InMemoryQueueAdapter>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    emailQueue = { add: jest.fn() } as any;
    pdfQueue = { add: jest.fn() } as any;
    reportsQueue = { add: jest.fn() } as any;
    fallbackAdapter = { enqueue: jest.fn() } as any;
    configService = { get: jest.fn() } as any;
    process.env.ENABLE_BULLMQ = 'true';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BullMQQueueAdapter,
        { provide: ConfigService, useValue: configService },
        { provide: InMemoryQueueAdapter, useValue: fallbackAdapter },
        { provide: getQueueToken('email'), useValue: emailQueue },
        { provide: getQueueToken('pdf'), useValue: pdfQueue },
        { provide: getQueueToken('reports'), useValue: reportsQueue },
        { provide: getQueueToken('metrics'), useValue: { add: jest.fn() } },
      ],
    }).compile();

    adapter = module.get<BullMQQueueAdapter>(BullMQQueueAdapter);
  });

  afterEach(() => {
    delete process.env.ENABLE_BULLMQ;
  });

  it('should route send-email to email queue with mapped options', async () => {
    await adapter.enqueue(
      'send-email',
      { foo: 'bar' },
      { attempts: 3, backoffType: 'exponential', backoffMs: 1000 },
    );
    expect(emailQueue.add).toHaveBeenCalledWith(
      'send-email',
      { foo: 'bar' },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
  });

  it('should route generate-pdf to pdf queue', async () => {
    await adapter.enqueue('generate-pdf', { doc: 1 });
    expect(pdfQueue.add).toHaveBeenCalledWith(
      'generate-pdf',
      { doc: 1 },
      undefined,
    );
  });

  it('should route send-report to reports queue', async () => {
    await adapter.enqueue('send-report', { rep: 2 });
    expect(reportsQueue.add).toHaveBeenCalledWith(
      'send-report',
      { rep: 2 },
      undefined,
    );
  });

  it('should fallback to in-memory adapter if bullmq is disabled', async () => {
    process.env.ENABLE_BULLMQ = 'false';
    const disabledAdapter = new BullMQQueueAdapter(
      configService as any,
      fallbackAdapter as any,
      emailQueue,
      pdfQueue,
      reportsQueue,
    );

    await disabledAdapter.enqueue('send-email', { data: 1 });
    expect(fallbackAdapter.enqueue).toHaveBeenCalledWith(
      'send-email',
      { data: 1 },
      undefined,
    );
    expect(emailQueue.add).not.toHaveBeenCalled();
  });
});

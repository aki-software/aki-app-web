import { DataSource, Repository } from 'typeorm';
import { VoucherBatch } from '../vouchers/entities/voucher-batch.entity.js';
import { Voucher } from '../vouchers/entities/voucher.entity.js';
import {
  VoucherBatchStatus,
  VoucherOwnerType,
  VoucherStatus,
} from '../vouchers/entities/voucher.enums.js';
import { PaymentFulfillmentOutbox } from './entities/payment-fulfillment-outbox.entity.js';
import {
  type VoucherFulfillmentQueue,
  VoucherFulfillmentDispatcherService,
} from './services/voucher-fulfillment-dispatcher.service.js';
import type { PaymentNotificationDispatcher } from './services/payment-notification-dispatcher.service.js';
import { VoucherFulfillmentProcessor } from './services/voucher-fulfillment.processor.js';
import { VoucherCodeGenerator } from '../vouchers/services/voucher-code-generator.service.js';

describe('payments security refactor phase 4 RED', () => {
  it('dispatches a committed outbox intent with a stable job ID, retry policy, and safe IDs only', async () => {
    const queue = { add: jest.fn().mockResolvedValue(undefined) };
    const dispatcher = createDispatcher(queue);

    await dispatcher.dispatchAfterCommit({
      id: 'outbox-1',
      voucherBatchId: 'batch-1',
    });

    expect(queue.add).toHaveBeenCalledWith(
      'voucher-fulfillment',
      { outboxId: 'outbox-1' },
      expect.objectContaining({
        jobId: 'outbox-1',
        attempts: expect.any(Number),
        backoff: expect.objectContaining({ type: 'exponential' }),
      }),
    );
    const [, payload] = queue.add.mock.calls[0];
    expect(payload).toEqual({ outboxId: 'outbox-1' });
  });

  it('keeps an already-settled payment durable when queue enqueue fails after commit', async () => {
    const queue = {
      add: jest.fn().mockRejectedValue(new Error('queue unavailable')),
    };
    const dispatcher = createDispatcher(queue);
    const settled = { status: VoucherBatchStatus.PAID, id: 'batch-1' };
    const outbox = {
      id: 'outbox-1',
      voucherBatchId: settled.id,
      processedAt: null,
    };

    await expect(dispatcher.dispatchAfterCommit(outbox)).rejects.toThrow(
      'queue unavailable',
    );

    expect(settled.status).toBe(VoucherBatchStatus.PAID);
    expect(outbox.processedAt).toBeNull();
  });

  it('does not create a duplicate BullMQ job/effect when the same pending outbox is dispatched twice', async () => {
    const queue = { add: jest.fn().mockResolvedValue(undefined) };
    const dispatcher = createDispatcher(queue);
    const outbox = { id: 'outbox-1', voucherBatchId: 'batch-1' };

    await dispatcher.dispatchAfterCommit(outbox);
    await dispatcher.dispatchAfterCommit(outbox);

    expect(
      queue.add.mock.calls.map(
        ([, , options]: [unknown, unknown, { jobId: string }]) => options.jobId,
      ),
    ).toEqual(['outbox-1', 'outbox-1']);
  });

  it('re-enqueues every pending outbox row during bootstrap and ignores completed rows', async () => {
    const queue = { add: jest.fn().mockResolvedValue(undefined) };
    const outboxRepository = {
      find: jest.fn().mockResolvedValue([
        { id: 'outbox-pending', voucherBatchId: 'batch-1', processedAt: null },
        {
          id: 'outbox-completed',
          voucherBatchId: 'batch-2',
          processedAt: new Date(),
        },
      ]),
    };
    const dispatcher = createDispatcher(queue, outboxRepository);

    await dispatcher.recoverPending();

    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith(
      'voucher-fulfillment',
      { outboxId: 'outbox-pending' },
      expect.objectContaining({ jobId: 'outbox-pending' }),
    );
  });

  it('uses a stable keyset cursor so recovery does not skip pending rows after an earlier page changes', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `outbox-${String(index).padStart(3, '0')}`,
      voucherBatchId: `batch-${index}`,
      processedAt: null,
    }));
    const queue = { add: jest.fn().mockResolvedValue(undefined) };
    let scanCount = 0;
    const outboxRepository = {
      find: jest
        .fn()
        .mockImplementation((options: { where: { id?: unknown } }) => {
          scanCount++;
          if (options.where.id) {
            return Promise.resolve([
              {
                id: 'outbox-100',
                voucherBatchId: 'batch-100',
                processedAt: null,
              },
            ]);
          }
          return Promise.resolve(scanCount === 1 ? firstPage : []);
        }),
    };
    const dispatcher = createDispatcher(queue, outboxRepository);

    await dispatcher.recoverPending();

    expect(queue.add).toHaveBeenCalledTimes(101);
    expect(outboxRepository.find.mock.calls[1][0].where.id).toBeDefined();
    expect(outboxRepository.find.mock.calls[1][0]).not.toHaveProperty('skip');
  });

  it('creates exactly the PAID batch quantity using the existing available-voucher ownership and code rules', async () => {
    const fixture = createWorkerFixture();

    await fixture.processor.process({ data: { outboxId: 'outbox-1' } });

    expect(fixture.codes.generateUniqueCode).toHaveBeenCalledTimes(3);
    expect(fixture.transaction.manager.create).toHaveBeenCalledWith(
      Voucher,
      expect.objectContaining({
        batchId: 'batch-1',
        ownerType: VoucherOwnerType.INSTITUTION,
        ownerInstitutionId: 'institution-1',
        ownerUserId: null,
        status: VoucherStatus.AVAILABLE,
      }),
    );
    expect(fixture.transaction.manager.save).toHaveBeenCalledWith(
      Voucher,
      expect.arrayContaining([
        expect.objectContaining({ code: 'VOUCHER1' }),
        expect.objectContaining({ code: 'VOUCHER2' }),
        expect.objectContaining({ code: 'VOUCHER3' }),
      ]),
    );
    expect(fixture.batch.fulfilledAt).toBeInstanceOf(Date);
    expect(fixture.outbox.processedAt).toBeInstanceOf(Date);
    expect(fixture.transaction.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('dispatches every inserted notification only after commit and release, even when one throws synchronously', async () => {
    const fixture = createWorkerFixture({
      notificationDeliveryIds: ['delivery-1', 'delivery-2'],
    });
    fixture.dispatcher.dispatchAfterCommit.mockImplementation((id: string) => {
      expect(fixture.transaction.commitTransaction).toHaveBeenCalled();
      expect(fixture.transaction.release).toHaveBeenCalled();
      if (id === 'delivery-1') throw new Error('queue unavailable');
      return Promise.resolve();
    });

    await expect(
      fixture.processor.process({ data: { outboxId: 'outbox-1' } }),
    ).resolves.toBeUndefined();

    expect(fixture.dispatcher.dispatchAfterCommit).toHaveBeenCalledTimes(2);
    expect(fixture.dispatcher.dispatchAfterCommit).toHaveBeenCalledWith(
      'delivery-1',
    );
    expect(fixture.dispatcher.dispatchAfterCommit).toHaveBeenCalledWith(
      'delivery-2',
    );
  });

  it('creates only the missing vouchers when a PAID batch already has a partial set', async () => {
    const fixture = createWorkerFixture({ existingVoucherCount: 1 });

    await fixture.processor.process({ data: { outboxId: 'outbox-1' } });

    expect(fixture.codes.generateUniqueCode).toHaveBeenCalledTimes(2);
    expect(fixture.transaction.manager.save).toHaveBeenCalledWith(
      Voucher,
      expect.arrayContaining([
        expect.objectContaining({ code: 'VOUCHER1' }),
        expect.objectContaining({ code: 'VOUCHER2' }),
      ]),
    );
    expect(fixture.outbox.processedAt).toBeInstanceOf(Date);
  });

  it('marks an exact existing voucher set completed without inserting more vouchers', async () => {
    const fixture = createWorkerFixture({ existingVoucherCount: 3 });

    await fixture.processor.process({ data: { outboxId: 'outbox-1' } });

    expect(fixture.codes.generateUniqueCode).not.toHaveBeenCalled();
    expect(fixture.transaction.manager.save).not.toHaveBeenCalledWith(
      Voucher,
      expect.anything(),
    );
    expect(fixture.batch.fulfilledAt).toBeInstanceOf(Date);
    expect(fixture.outbox.processedAt).toBeInstanceOf(Date);
  });

  it('rejects an over-fulfilled batch without adding vouchers or completion markers', async () => {
    const fixture = createWorkerFixture({ existingVoucherCount: 4 });

    await expect(
      fixture.processor.process({ data: { outboxId: 'outbox-1' } }),
    ).rejects.toThrow('Voucher batch is over-fulfilled');

    expect(fixture.codes.generateUniqueCode).not.toHaveBeenCalled();
    expect(fixture.transaction.manager.save).not.toHaveBeenCalledWith(
      Voucher,
      expect.anything(),
    );
    expect(fixture.batch.fulfilledAt).toBeNull();
    expect(fixture.outbox.processedAt).toBeNull();
  });

  it.each([
    VoucherBatchStatus.PENDING,
    VoucherBatchStatus.FAILED,
    VoucherBatchStatus.CANCELLED,
  ])('does not fulfill a %s batch before paid settlement', async (status) => {
    const fixture = createWorkerFixture({ batch: { status } });

    await expect(
      fixture.processor.process({ data: { outboxId: 'outbox-1' } }),
    ).rejects.toThrow('Voucher fulfillment requires a paid batch');

    expect(fixture.transaction.manager.save).not.toHaveBeenCalledWith(
      Voucher,
      expect.anything(),
    );
    expect(fixture.transaction.commitTransaction).not.toHaveBeenCalled();
  });

  it('rolls back all voucher and completion writes when the worker fails before commit, then allows retry', async () => {
    const fixture = createWorkerFixture({
      saveError: new Error('write interrupted'),
    });

    await expect(
      fixture.processor.process({ data: { outboxId: 'outbox-1' } }),
    ).rejects.toThrow('write interrupted');

    expect(fixture.transaction.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(fixture.transaction.commitTransaction).not.toHaveBeenCalled();
    expect(fixture.outbox.processedAt).toBeNull();
    expect(fixture.batch.fulfilledAt).toBeNull();
  });

  it('treats a completed outbox delivery as an idempotent no-op', async () => {
    const fixture = createWorkerFixture({
      outbox: { processedAt: new Date() },
    });

    await fixture.processor.process({ data: { outboxId: 'outbox-1' } });

    expect(fixture.codes.generateUniqueCode).not.toHaveBeenCalled();
    expect(fixture.transaction.manager.save).not.toHaveBeenCalled();
    expect(fixture.transaction.commitTransaction).not.toHaveBeenCalled();
  });

  it('keeps the in-process payment.completed email event non-authoritative for voucher creation', async () => {
    const fixture = createWorkerFixture();

    await fixture.processor.handleCompatibilityPaymentCompleted();

    expect(fixture.codes.generateUniqueCode).not.toHaveBeenCalled();
    expect(fixture.transaction.manager.save).not.toHaveBeenCalled();
  });
});

function createWorkerFixture(
  overrides: {
    batch?: Partial<VoucherBatch>;
    outbox?: Partial<PaymentFulfillmentOutbox>;
    saveError?: Error;
    existingVoucherCount?: number;
    notificationDeliveryIds?: string[];
  } = {},
) {
  const batch = {
    id: 'batch-1',
    quantity: 3,
    status: VoucherBatchStatus.PAID,
    ownerType: VoucherOwnerType.INSTITUTION,
    ownerInstitutionId: 'institution-1',
    ownerUserId: null,
    fulfilledAt: null,
    ...overrides.batch,
  } as VoucherBatch;
  const outbox = {
    id: 'outbox-1',
    voucherBatchId: batch.id,
    processedAt: null,
    ...overrides.outbox,
  } as PaymentFulfillmentOutbox;
  const transaction = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      findOne: jest.fn().mockImplementation((entity: unknown) => {
        if (entity === PaymentFulfillmentOutbox) return Promise.resolve(outbox);
        if (entity === VoucherBatch) return Promise.resolve(batch);
        return Promise.resolve(null);
      }),
      count: jest.fn().mockResolvedValue(overrides.existingVoucherCount ?? 0),
      create: jest.fn((_: unknown, value: unknown) => value),
      save: overrides.saveError
        ? jest.fn().mockRejectedValue(overrides.saveError)
        : jest.fn().mockResolvedValue(undefined),
    },
  };
  const notificationIntents = {
    createForFirstFulfillment: jest
      .fn()
      .mockResolvedValue(overrides.notificationDeliveryIds ?? []),
  };
  const dispatcher = {
    dispatchAfterCommit: jest.fn().mockResolvedValue(undefined),
  } as jest.Mocked<PaymentNotificationDispatcher>;
  const codes = {
    generateUniqueCode: jest
      .fn()
      .mockResolvedValueOnce('VOUCHER1')
      .mockResolvedValueOnce('VOUCHER2')
      .mockResolvedValueOnce('VOUCHER3'),
  };

  return {
    batch,
    outbox,
    codes,
    transaction,
    dispatcher,
    processor: createProcessor(
      {
        createQueryRunner: jest.fn().mockReturnValue(transaction),
      } as unknown as DataSource,
      codes,
      notificationIntents,
      dispatcher,
    ),
  };
}

function createDispatcher(
  queue: VoucherFulfillmentQueue,
  outboxRepository?: Pick<Repository<PaymentFulfillmentOutbox>, 'find'>,
) {
  const { VoucherFulfillmentDispatcherService } = fulfillmentContracts();
  expect(VoucherFulfillmentDispatcherService).toBeDefined();
  return new VoucherFulfillmentDispatcherService!(queue, outboxRepository);
}

function createProcessor(
  dataSource: DataSource,
  codes: Pick<VoucherCodeGenerator, 'generateUniqueCode'>,
  notificationIntents: { createForFirstFulfillment: jest.Mock },
  dispatcher: PaymentNotificationDispatcher,
) {
  const { VoucherFulfillmentProcessor } = fulfillmentContracts();
  expect(VoucherFulfillmentProcessor).toBeDefined();
  return new VoucherFulfillmentProcessor!(
    dataSource,
    codes,
    notificationIntents,
    dispatcher,
  );
}

function fulfillmentContracts(): {
  VoucherFulfillmentDispatcherService?: typeof VoucherFulfillmentDispatcherService;
  VoucherFulfillmentProcessor?: typeof VoucherFulfillmentProcessor;
} {
  return {
    VoucherFulfillmentDispatcherService,
    VoucherFulfillmentProcessor,
  };
}

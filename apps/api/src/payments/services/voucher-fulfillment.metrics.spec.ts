import { LocalMetricsService } from '../../common/metrics/local-metrics.service';
import { VoucherBatchStatus } from '../../vouchers/entities/voucher.enums';
import { PaymentFulfillmentOutbox } from '../entities/payment-fulfillment-outbox.entity';
import { VoucherFulfillmentProcessor } from './voucher-fulfillment.processor';

describe('VoucherFulfillmentProcessor local domain metrics', () => {
  it('counts only the committed first fulfillment, not an outbox replay', async () => {
    const metrics = new LocalMetricsService();
    const outbox = {
      id: 'outbox-private',
      voucherBatchId: 'batch-private',
      processedAt: null as Date | null,
    };
    const batch = {
      id: 'batch-private',
      status: VoucherBatchStatus.PAID,
      quantity: 0,
      fulfilledAt: null as Date | null,
    };
    const manager = {
      findOne: jest.fn((entity: unknown) =>
        Promise.resolve(entity === PaymentFulfillmentOutbox ? outbox : batch),
      ),
      count: jest.fn(() => Promise.resolve(0)),
      save: jest.fn((_entity: unknown, value: unknown) =>
        Promise.resolve(value),
      ),
    };
    const queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      isReleased: false,
      manager,
    };
    const processor = new VoucherFulfillmentProcessor(
      { createQueryRunner: jest.fn(() => queryRunner) } as never,
      { generateUniqueCode: jest.fn() } as never,
      { createForFirstFulfillment: jest.fn().mockResolvedValue([]) } as never,
      { dispatchAfterCommit: jest.fn() } as never,
      metrics,
    );
    await processor.process({ data: { outboxId: outbox.id } } as never);
    await processor.process({ data: { outboxId: outbox.id } } as never);
    const body = await metrics.scrape();
    expect(body).toContain(
      'akit_domain_transitions_total{transition="fulfillment_completed"} 1',
    );
    expect(body).toContain(
      'akit_domain_attempts_total{operation="fulfillment",outcome="success"} 2',
    );
    expect(body).not.toContain(outbox.id);
    expect(body).not.toContain(batch.id);
    expect(manager.count).toHaveBeenCalledTimes(1);
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
  });
});

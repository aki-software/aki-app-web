import { PaymentNotificationDispatcherService } from './payment-notification-dispatcher.service.js';

const delivery = (overrides = {}) => ({
  id: 'delivery-1',
  status: 'PENDING',
  enqueueAttemptCount: 0,
  ...overrides,
});

describe('PaymentNotificationDispatcherService', () => {
  const queue = { getJob: jest.fn(), add: jest.fn() };
  const manager = {
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const dataSource = { transaction: jest.fn() };

  beforeEach(() => {
    delete process.env.PAYMENT_NOTIFICATION_DELIVERY_ENABLED;
    jest.resetAllMocks();
    dataSource.transaction.mockImplementation((work) =>
      Promise.resolve(work(manager)),
    );
  });

  const subject = () =>
    new PaymentNotificationDispatcherService(queue, dataSource as never);

  it('is disabled by default and does not touch durable rows', async () => {
    await subject().dispatchAfterCommit('delivery-1');

    expect(queue.getJob).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('adds the exact delivery job after reserving an enqueue attempt', async () => {
    process.env.PAYMENT_NOTIFICATION_DELIVERY_ENABLED = 'true';
    queue.getJob.mockResolvedValue(null);
    manager.findOne.mockResolvedValue(delivery());
    manager.save.mockResolvedValue(undefined);
    manager.createQueryBuilder.mockReturnValue(updateBuilder());

    await subject().dispatchAfterCommit('delivery-1');

    expect(queue.add).toHaveBeenCalledWith(
      'payment-notification-delivery',
      { deliveryId: 'delivery-1' },
      {
        jobId: 'delivery-1',
        attempts: 8,
        backoff: { type: 'exponential', delay: 60_000 },
      },
    );
    expect(manager.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ enqueueAttemptCount: 1 }),
    );
  });

  it('does nothing when the queue already has the delivery job', async () => {
    process.env.PAYMENT_NOTIFICATION_DELIVERY_ENABLED = 'true';
    queue.getJob.mockResolvedValue({ id: 'delivery-1' });

    await subject().dispatchAfterCommit('delivery-1');

    expect(queue.add).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it.each([undefined, 'SENT', 'DEAD_LETTER'])(
    'does nothing for a missing or terminal delivery (%s)',
    async (status) => {
      process.env.PAYMENT_NOTIFICATION_DELIVERY_ENABLED = 'true';
      queue.getJob.mockResolvedValue(null);
      manager.findOne.mockResolvedValue(
        status === undefined ? null : delivery({ status }),
      );

      await subject().dispatchAfterCommit('delivery-1');

      expect(manager.save).not.toHaveBeenCalled();
      expect(queue.add).not.toHaveBeenCalled();
    },
  );

  it('conditionally marks a queued delivery and clears queue failures', async () => {
    process.env.PAYMENT_NOTIFICATION_DELIVERY_ENABLED = 'true';
    queue.getJob.mockResolvedValue(null);
    manager.findOne.mockResolvedValue(delivery());
    manager.createQueryBuilder.mockReturnValue(updateBuilder());

    await subject().dispatchAfterCommit('delivery-1');

    const builder = manager.createQueryBuilder.mock.results[0].value;
    expect(builder.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'QUEUED',
        lastErrorClassification: null,
        lastErrorMessage: null,
        nextAttemptAt: null,
      }),
    );
    expect(builder.andWhere).toHaveBeenCalledWith(
      'status NOT IN (:...terminalStatuses)',
      { terminalStatuses: ['SENT', 'DEAD_LETTER'] },
    );
  });

  it('records a safe retryable queue failure and rejects', async () => {
    process.env.PAYMENT_NOTIFICATION_DELIVERY_ENABLED = 'true';
    queue.getJob.mockResolvedValue(null);
    queue.add.mockRejectedValue(new Error('secret provider response'));
    manager.findOne.mockResolvedValue(delivery());
    manager.createQueryBuilder.mockReturnValue(updateBuilder());

    await expect(subject().dispatchAfterCommit('delivery-1')).rejects.toThrow(
      'Delivery could not be queued',
    );

    const builder = manager.createQueryBuilder.mock.results[0].value;
    expect(builder.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'RETRYABLE_FAILED',
        lastErrorClassification: 'QUEUE_FAILURE',
        lastErrorMessage: 'Delivery could not be queued',
        nextAttemptAt: expect.any(Date),
      }),
    );
  });

  it('dead-letters an eighth failed reservation', async () => {
    process.env.PAYMENT_NOTIFICATION_DELIVERY_ENABLED = 'true';
    queue.getJob.mockResolvedValue(null);
    queue.add.mockRejectedValue(new Error('secret provider response'));
    manager.findOne.mockResolvedValue(delivery({ enqueueAttemptCount: 7 }));
    manager.createQueryBuilder.mockReturnValue(updateBuilder());

    await expect(subject().dispatchAfterCommit('delivery-1')).rejects.toThrow(
      'Delivery could not be queued',
    );

    const builder = manager.createQueryBuilder.mock.results[0].value;
    expect(builder.set).toHaveBeenCalledWith({
      status: 'DEAD_LETTER',
      lastErrorClassification: 'QUEUE_FAILURE',
      lastErrorMessage: 'Delivery could not be queued',
      nextAttemptAt: null,
    });
  });
});

function updateBuilder() {
  const builder = {
    update: jest.fn(),
    set: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    execute: jest.fn(),
  };
  builder.update.mockReturnValue(builder);
  builder.set.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.andWhere.mockReturnValue(builder);
  builder.execute.mockResolvedValue(undefined);
  return builder;
}

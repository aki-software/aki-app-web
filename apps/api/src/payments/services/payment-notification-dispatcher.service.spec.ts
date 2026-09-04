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
  const dataSource = { transaction: jest.fn(), createQueryBuilder: jest.fn() };

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

  it('runs recovery immediately on bootstrap and schedules an unrefed interval', () => {
    process.env.PAYMENT_NOTIFICATION_DELIVERY_ENABLED = 'true';
    const builder = recoveryBuilder([]);
    dataSource.createQueryBuilder.mockReturnValue(builder);
    const timer = { unref: jest.fn() };
    const setIntervalSpy = jest
      .spyOn(global, 'setInterval')
      .mockReturnValue(timer as never);

    subject().onApplicationBootstrap();

    expect(dataSource.createQueryBuilder).toHaveBeenCalled();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60_000);
    expect(timer.unref).toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });

  it('does not recover or schedule work while delivery is disabled', () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');

    subject().onApplicationBootstrap();

    expect(dataSource.createQueryBuilder).not.toHaveBeenCalled();
    expect(setIntervalSpy).not.toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });

  it('cleans up its recovery interval on shutdown', () => {
    process.env.PAYMENT_NOTIFICATION_DELIVERY_ENABLED = 'true';
    dataSource.createQueryBuilder.mockReturnValue(recoveryBuilder([]));
    const timer = { unref: jest.fn() };
    jest.spyOn(global, 'setInterval').mockReturnValue(timer as never);
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const dispatcher = subject();

    dispatcher.onApplicationBootstrap();
    dispatcher.onModuleDestroy();

    expect(clearIntervalSpy).toHaveBeenCalledWith(timer);
    jest.restoreAllMocks();
  });

  it('selects only eligible deliveries in created-at/id pages of 100', async () => {
    process.env.PAYMENT_NOTIFICATION_DELIVERY_ENABLED = 'true';
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `delivery-${index}`,
      createdAt: new Date(
        `2026-01-01T00:00:${String(index % 60).padStart(2, '0')}Z`,
      ),
    }));
    const firstBuilder = recoveryBuilder(firstPage);
    const secondBuilder = recoveryBuilder([]);
    dataSource.createQueryBuilder
      .mockReturnValueOnce(firstBuilder)
      .mockReturnValueOnce(secondBuilder);
    const dispatcher = subject();
    jest.spyOn(dispatcher, 'dispatchAfterCommit').mockResolvedValue();

    await dispatcher.recoverPending();

    expect(firstBuilder.where).toHaveBeenCalledWith(
      expect.stringContaining('delivery.status = :pendingStatus'),
      expect.objectContaining({
        pendingStatus: 'PENDING',
        retryableFailedStatus: 'RETRYABLE_FAILED',
        queuedStatus: 'QUEUED',
        now: expect.any(Date),
        staleQueuedAt: expect.any(Date),
      }),
    );
    expect(firstBuilder.where.mock.calls[0][0]).toContain(
      'delivery.nextAttemptAt <= :now',
    );
    expect(firstBuilder.where.mock.calls[0][0]).toContain(
      'delivery.queuedAt <= :staleQueuedAt',
    );
    expect(firstBuilder.orderBy).toHaveBeenCalledWith(
      'delivery.createdAt',
      'ASC',
    );
    expect(firstBuilder.addOrderBy).toHaveBeenCalledWith('delivery.id', 'ASC');
    expect(firstBuilder.take).toHaveBeenCalledWith(100);
    expect(secondBuilder.andWhere).toHaveBeenCalledWith(
      '(delivery.createdAt > :cursorCreatedAt OR (delivery.createdAt = :cursorCreatedAt AND delivery.id > :cursorId))',
      { cursorCreatedAt: firstPage[99].createdAt, cursorId: 'delivery-99' },
    );
  });

  it('isolates recovery dispatch failures with allSettled', async () => {
    process.env.PAYMENT_NOTIFICATION_DELIVERY_ENABLED = 'true';
    dataSource.createQueryBuilder.mockReturnValue(
      recoveryBuilder([
        { id: 'delivery-1', createdAt: new Date() },
        { id: 'delivery-2', createdAt: new Date() },
      ]),
    );
    const dispatcher = subject();
    const dispatch = jest
      .spyOn(dispatcher, 'dispatchAfterCommit')
      .mockRejectedValueOnce(new Error('secret'))
      .mockResolvedValueOnce();

    await expect(dispatcher.recoverPending()).resolves.toBeUndefined();

    expect(dispatch).toHaveBeenCalledWith('delivery-1');
    expect(dispatch).toHaveBeenCalledWith('delivery-2');
  });

  it('does not overlap concurrent recovery sweepers', async () => {
    process.env.PAYMENT_NOTIFICATION_DELIVERY_ENABLED = 'true';
    let resolveRows: (rows: []) => void;
    dataSource.createQueryBuilder.mockReturnValue(
      recoveryBuilder(new Promise((resolve) => (resolveRows = resolve))),
    );
    const dispatcher = subject();

    const first = dispatcher.recoverPending();
    const second = dispatcher.recoverPending();
    resolveRows!([]);
    await Promise.all([first, second]);

    expect(dataSource.createQueryBuilder).toHaveBeenCalledTimes(1);
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

function recoveryBuilder(rows: unknown[] | Promise<unknown[]>) {
  const builder = {
    select: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    take: jest.fn(),
    getRawMany: jest.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.andWhere.mockReturnValue(builder);
  builder.orderBy.mockReturnValue(builder);
  builder.addOrderBy.mockReturnValue(builder);
  builder.take.mockReturnValue(builder);
  builder.getRawMany.mockReturnValue(Promise.resolve(rows));
  return builder;
}

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

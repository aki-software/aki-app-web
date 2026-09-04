import { PaymentNotificationDeliveryStateService } from './payment-notification-delivery-state.service.js';

// prettier-ignore
const delivery = (overrides = {}) => ({ id: 'delivery-1', voucherBatchId: 'batch-1', recipientKind: 'PLATFORM_ADMIN', status: 'PENDING', attemptCount: 0, lastAttemptAt: null, nextAttemptAt: null, recipientUserId: null, recipientEmailSnapshot: null, recipientNameSnapshot: null, recipientResolvedAt: null, contextSnapshot: { buyer: null }, ...overrides });

describe('PaymentNotificationDeliveryStateService', () => {
  // prettier-ignore
  const manager = { findOne: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn() };
  const dataSource = { transaction: jest.fn() };
  // prettier-ignore
  const subject = () => new PaymentNotificationDeliveryStateService(dataSource as never);

  beforeEach(() => {
    jest.resetAllMocks();
    // prettier-ignore
    dataSource.transaction.mockImplementation((work) => Promise.resolve(work(manager)));
  });

  it('skips missing, terminal, and non-due retryable deliveries', async () => {
    const now = new Date('2026-03-01T10:00:00Z');
    for (const row of [
      null,
      delivery({ status: 'SENT' }),
      delivery({ status: 'DEAD_LETTER' }),
      delivery({
        status: 'RETRYABLE_FAILED',
        nextAttemptAt: new Date('2026-03-01T10:00:01Z'),
      }),
    ]) {
      manager.findOne.mockResolvedValue(row);
      await expect(subject().claim('delivery-1', now)).resolves.toBeUndefined();
    }
  });

  it('claims a due retry despite a recent attempt but leases fresh pending work', async () => {
    const now = new Date('2026-03-01T10:00:00Z');
    manager.findOne.mockResolvedValue(
      delivery({
        status: 'RETRYABLE_FAILED',
        attemptCount: 2,
        lastAttemptAt: new Date('2026-03-01T09:59:59Z'),
        nextAttemptAt: new Date('2026-03-01T09:59:00Z'),
        lastErrorClassification: 'RECIPIENT_UNRESOLVED',
        lastErrorMessage: 'No eligible platform administrator',
      }),
    );
    await expect(subject().claim('delivery-1', now)).resolves.toMatchObject({
      attemptCount: 3,
    });
    expect(manager.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'QUEUED',
        lastAttemptAt: now,
        nextAttemptAt: null,
        lastErrorClassification: null,
        lastErrorMessage: null,
      }),
    );

    manager.findOne.mockResolvedValue(
      delivery({ lastAttemptAt: new Date('2026-03-01T09:59:59Z') }),
    );
    await expect(subject().claim('delivery-1', now)).resolves.toBeUndefined();
  });

  it('records retry backoff and dead-letters attempt eight', async () => {
    manager.createQueryBuilder.mockReturnValue(updateBuilder());
    await subject().recordFailure(
      'delivery-1',
      2,
      'RECIPIENT_UNRESOLVED',
      'No eligible platform administrator',
    );
    await subject().recordFailure(
      'delivery-1',
      8,
      'RECIPIENT_UNRESOLVED',
      'No eligible platform administrator',
    );
    // prettier-ignore
    expect(manager.createQueryBuilder.mock.results[0].value.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'RETRYABLE_FAILED', nextAttemptAt: expect.any(Date) }));
    // prettier-ignore
    expect(manager.createQueryBuilder.mock.results[1].value.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'DEAD_LETTER', nextAttemptAt: null }));
  });

  it('maps immutable BUYER userId values without a fallback lookup', async () => {
    for (const buyer of [
      { userId: 'buyer-1', name: 'Buyer', email: 'buyer@example.com' },
      { userId: 'buyer-2', name: 'Other', email: 'other@example.com' },
    ]) {
      manager.findOne.mockResolvedValue(
        delivery({
          recipientKind: 'BUYER',
          status: 'QUEUED',
          attemptCount: 1,
          contextSnapshot: { buyer },
        }),
      );
      await expect(
        subject().resolveRecipient('delivery-1', 1),
      ).resolves.toMatchObject({
        recipientUserId: buyer.userId,
        recipientEmailSnapshot: buyer.email,
      });
    }
    expect(manager.save).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        recipientUserId: 'buyer-2',
        recipientNameSnapshot: 'Other',
      }),
    );
    expect(manager.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('resolves exactly one admin but never chooses among multiple admins', async () => {
    manager.findOne.mockResolvedValue(
      delivery({ status: 'QUEUED', attemptCount: 1 }),
    );
    manager.createQueryBuilder.mockReturnValue(
      adminQuery([
        { id: 'admin-1', email: 'admin@example.com', name: 'Admin' },
      ]),
    );
    await expect(
      subject().resolveRecipient('delivery-1', 1),
    ).resolves.toMatchObject({ recipientUserId: 'admin-1' });

    manager.findOne.mockResolvedValue(
      delivery({ status: 'QUEUED', attemptCount: 1 }),
    );
    manager.createQueryBuilder
      .mockReturnValueOnce(
        adminQuery([
          { id: 'admin-1', email: 'one@example.com', name: 'One' },
          { id: 'admin-2', email: 'two@example.com', name: 'Two' },
        ]),
      )
      .mockReturnValueOnce(updateBuilder());
    await expect(
      subject().resolveRecipient('delivery-1', 1),
    ).resolves.toBeUndefined();
    expect(
      manager.createQueryBuilder.mock.results[2].value.set,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        lastErrorMessage: 'Multiple eligible platform administrators',
      }),
    );
  });
});

function updateBuilder() {
  // prettier-ignore
  const builder = { update: jest.fn(), set: jest.fn(), where: jest.fn(), andWhere: jest.fn(), execute: jest.fn() };
  // prettier-ignore
  [builder.update, builder.set, builder.where, builder.andWhere].forEach((mock) => mock.mockReturnValue(builder));
  builder.execute.mockResolvedValue(undefined);
  return builder;
}

function adminQuery(users: unknown[]) {
  // prettier-ignore
  const query = { where: jest.fn(), take: jest.fn(), getMany: jest.fn() };
  // prettier-ignore
  query.where.mockReturnValue(query);
  query.take.mockReturnValue(query);
  query.getMany.mockResolvedValue(users);
  return query;
}

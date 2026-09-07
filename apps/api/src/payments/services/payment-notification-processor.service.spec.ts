import {
  PAYMENT_NOTIFICATION_DELIVERY_EXECUTOR,
  PaymentNotificationProcessor,
} from './payment-notification-processor.service.js';

const claimed = (overrides = {}) => ({
  id: 'delivery-1',
  voucherBatchId: 'batch-1',
  recipientKind: 'BUYER',
  contextSnapshot: { buyer: null },
  recipientUserId: 'user-1',
  recipientEmailSnapshot: 'buyer@example.com',
  recipientNameSnapshot: 'Buyer',
  attemptCount: 1,
  ...overrides,
});

describe('PaymentNotificationProcessor', () => {
  const state = {
    claim: jest.fn(),
    resolveRecipient: jest.fn(),
    markSent: jest.fn(),
    recordFailure: jest.fn(),
  };
  const executor = { execute: jest.fn() };
  const subject = () => new PaymentNotificationProcessor(state, executor);

  beforeEach(() => {
    delete process.env.PAYMENT_NOTIFICATION_DELIVERY_ENABLED;
    jest.resetAllMocks();
  });

  it('exports the executor token and leaves durable state untouched while disabled', async () => {
    expect(typeof PAYMENT_NOTIFICATION_DELIVERY_EXECUTOR).toBe('symbol');

    await subject().process({ data: { deliveryId: 'delivery-1' } });

    expect(state.claim).not.toHaveBeenCalled();
    expect(executor.execute).not.toHaveBeenCalled();
  });

  it.each([undefined, claimed()])(
    'does not execute when claim or recipient resolution has no work',
    async (claim) => {
      process.env.PAYMENT_NOTIFICATION_DELIVERY_ENABLED = 'true';
      state.claim.mockResolvedValue(claim);
      state.resolveRecipient.mockResolvedValue(undefined);

      await subject().process({ data: { deliveryId: 'delivery-1' } });

      if (claim) {
        expect(state.resolveRecipient).toHaveBeenCalledWith('delivery-1', 1);
      }
      expect(executor.execute).not.toHaveBeenCalled();
      expect(state.markSent).not.toHaveBeenCalled();
      expect(state.recordFailure).not.toHaveBeenCalled();
    },
  );

  it('executes only the resolved snapshot and marks its database attempt sent', async () => {
    process.env.PAYMENT_NOTIFICATION_DELIVERY_ENABLED = 'true';
    const delivery = claimed({ attemptCount: 3 });
    state.claim.mockResolvedValue(delivery);
    state.resolveRecipient.mockResolvedValue(delivery);
    executor.execute.mockResolvedValue({ status: 'SENT' });

    await subject().process({ data: { deliveryId: 'delivery-1' } });

    expect(executor.execute).toHaveBeenCalledWith(delivery);
    expect(state.markSent).toHaveBeenCalledWith('delivery-1', 3);
  });

  it('records known retryable failure with fixed safe data and throws a new safe error', async () => {
    process.env.PAYMENT_NOTIFICATION_DELIVERY_ENABLED = 'true';
    const delivery = claimed({ attemptCount: 2 });
    state.claim.mockResolvedValue(delivery);
    state.resolveRecipient.mockResolvedValue(delivery);
    executor.execute.mockResolvedValue({
      status: 'RETRYABLE_FAILURE',
      classification: 'TRANSPORT_TRANSIENT',
      message: 'Email provider is temporarily unavailable',
    });

    await expect(
      subject().process({ data: { deliveryId: 'delivery-1' } }),
    ).rejects.toThrow('Payment notification delivery retry requested');

    expect(state.recordFailure).toHaveBeenCalledWith(
      'delivery-1',
      2,
      'TRANSPORT_TRANSIENT',
      'Email provider is temporarily unavailable',
    );
  });

  it('records permanent failure without retrying BullMQ', async () => {
    process.env.PAYMENT_NOTIFICATION_DELIVERY_ENABLED = 'true';
    const delivery = claimed();
    state.claim.mockResolvedValue(delivery);
    state.resolveRecipient.mockResolvedValue(delivery);
    executor.execute.mockResolvedValue({
      status: 'PERMANENT_FAILURE',
      classification: 'TRANSPORT_PERMANENT',
      message: 'Email provider rejected the recipient',
    });

    await expect(
      subject().process({ data: { deliveryId: 'delivery-1' } }),
    ).resolves.toBeUndefined();

    expect(state.recordFailure).toHaveBeenCalledWith(
      'delivery-1',
      1,
      'TRANSPORT_PERMANENT',
      'Email provider rejected the recipient',
      true,
    );
  });

  it('maps unknown executor errors to fixed transient data without exposing their message', async () => {
    process.env.PAYMENT_NOTIFICATION_DELIVERY_ENABLED = 'true';
    const delivery = claimed();
    state.claim.mockResolvedValue(delivery);
    state.resolveRecipient.mockResolvedValue(delivery);
    executor.execute.mockRejectedValue(
      new Error('provider secret and recipient'),
    );

    await expect(
      subject().process({ data: { deliveryId: 'delivery-1' } }),
    ).rejects.toThrow('Payment notification delivery retry requested');

    expect(state.recordFailure).toHaveBeenCalledWith(
      'delivery-1',
      1,
      'TRANSPORT_TRANSIENT',
      'Email provider is temporarily unavailable',
    );
  });

  it('records attempt eight but does not deliberately retry BullMQ', async () => {
    process.env.PAYMENT_NOTIFICATION_DELIVERY_ENABLED = 'true';
    const delivery = claimed({ attemptCount: 8 });
    state.claim.mockResolvedValue(delivery);
    state.resolveRecipient.mockResolvedValue(delivery);
    executor.execute.mockResolvedValue({
      status: 'RETRYABLE_FAILURE',
      classification: 'RENDER_FAILURE',
      message: 'Email content could not be rendered',
    });

    await expect(
      subject().process({ data: { deliveryId: 'delivery-1' } }),
    ).resolves.toBeUndefined();

    expect(state.recordFailure).toHaveBeenCalledWith(
      'delivery-1',
      8,
      'RENDER_FAILURE',
      'Email content could not be rendered',
    );
  });
});

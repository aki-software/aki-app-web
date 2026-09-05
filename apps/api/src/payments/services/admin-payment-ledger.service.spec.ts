import { NotFoundException } from '@nestjs/common';
import { AdminPaymentLedgerService } from './admin-payment-ledger.service';

const id = '11111111-1111-4111-8111-111111111111';
const row = {
  voucherBatchId: id,
  totalPrice: '100.00',
  currency: 'ARS',
  fulfilledAt: new Date('2026-01-02T00:00:00.000Z'),
  expectedVoucherCount: '3',
  actualVoucherCount: '2',
  institutionId: '22222222-2222-4222-8222-222222222222',
  institutionName: ' Institution ',
  checkoutAttemptId: null,
  pricingPlanId: null,
  planName: null,
  buyerId: null,
  buyerName: null,
  buyerEmail: null,
  paymentEventId: '33333333-3333-4333-8333-333333333333',
  gateway: 'STRIPE' as const,
  externalReference: 'payment_123',
  settledAt: new Date('2026-01-01T00:00:00.000Z'),
  buyerDeliveryId: null,
  buyerDeliveryStatus: null,
  buyerAttemptCount: null,
  buyerEnqueueAttemptCount: null,
  buyerRecipientId: null,
  buyerRecipientName: null,
  buyerRecipientEmail: null,
  buyerQueuedAt: null,
  buyerLastAttemptAt: null,
  buyerSentAt: null,
  buyerErrorClassification: null,
  buyerErrorMessage: null,
  adminDeliveryId: null,
  adminDeliveryStatus: null,
  adminAttemptCount: null,
  adminEnqueueAttemptCount: null,
  adminRecipientId: null,
  adminRecipientName: null,
  adminRecipientEmail: null,
  adminQueuedAt: null,
  adminLastAttemptAt: null,
  adminSentAt: null,
  adminErrorClassification: null,
  adminErrorMessage: null,
};

describe('AdminPaymentLedgerService', () => {
  it('maps only the safe ledger shape and keeps historical missing notifications null', () => {
    const service = new AdminPaymentLedgerService({} as never);
    const entry = (
      Reflect.get(service, 'entry') as (value: typeof row) => unknown
    ).call(service, row);
    expect(entry).toMatchObject({
      voucherBatchId: id,
      institution: { name: 'Institution' },
      fulfillment: {
        state: 'FULFILLED',
        expectedVoucherCount: 3,
        actualVoucherCount: 2,
        discrepancy: -1,
      },
      operationalState: 'PENDING_ACCREDITATION',
      notifications: { buyer: null, platformAdmin: null },
    });
    expect(entry).not.toHaveProperty('contextSnapshot');
  });

  it('maps authoritative fulfillment and notification facts to operational state', () => {
    const service = new AdminPaymentLedgerService({} as never);
    const map = (value: typeof row) =>
      (
        Reflect.get(service, 'entry') as (input: typeof row) => {
          operationalState: string;
        }
      ).call(service, value).operationalState;

    expect(map({ ...row, fulfilledAt: null } as never)).toBe(
      'PENDING_ACCREDITATION',
    );
    expect(
      map({
        ...row,
        actualVoucherCount: '3',
        buyerDeliveryStatus: 'DEAD_LETTER',
      } as never),
    ).toBe('ACCREDITED_NOTIFICATION_ATTENTION');
    expect(map({ ...row, actualVoucherCount: '1' } as never)).toBe(
      'PENDING_ACCREDITATION',
    );
  });

  it('returns 404 when the paid batch is absent', async () => {
    const builder = {
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AdminPaymentLedgerService({
      createQueryBuilder: jest.fn().mockReturnValue(builder),
    } as never);
    await expect(service.detail(id)).rejects.toBeInstanceOf(NotFoundException);
  });
});

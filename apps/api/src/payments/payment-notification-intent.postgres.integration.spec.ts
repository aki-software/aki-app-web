import { UserRole } from '@akit/contracts';
import { DataSource } from 'typeorm';
import { typeOrmConfig } from '../config/typeorm.config.js';
import { Institution } from '../institutions/entities/institution.entity.js';
import { PaymentNotificationDeliveries1787380000000 } from '../migrations/1787380000000-PaymentNotificationDeliveries.js';
import { User } from '../users/entities/user.entity.js';
import { VoucherBatch } from '../vouchers/entities/voucher-batch.entity.js';
import {
  VoucherBatchStatus,
  VoucherOwnerType,
} from '../vouchers/entities/voucher.enums.js';
import { CheckoutAttempt } from './entities/checkout-attempt.entity.js';
import { PaymentEvent } from './entities/payment-event.entity.js';
import { PaymentNotificationDelivery } from './entities/payment-notification-delivery.entity.js';
import { PaymentNotificationIntentService } from './services/payment-notification-intent.service.js';
const describePostgres =
  process.env.PAYMENT_POSTGRES_INTEGRATION === 'true' &&
  process.env.PAYMENT_TEST_DATABASE_URL
    ? describe
    : describe.skip;
const fulfilledAt = new Date('2026-03-10T12:00:00.000Z');
describePostgres('PaymentNotificationIntentService PostgreSQL', () => {
  let dataSource: DataSource;
  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: process.env.PAYMENT_TEST_DATABASE_URL,
      entities: typeOrmConfig.entities,
      synchronize: true,
      dropSchema: true,
    });
    await dataSource.initialize();
    await dataSource.query('DROP TABLE "payment_notification_deliveries"');
    await dataSource.query(
      'DROP FUNCTION IF EXISTS "payment_notification_deliveries_prevent_snapshot_updates"() CASCADE',
    );
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await new PaymentNotificationDeliveries1787380000000().up(runner);
    await runner.release();
  });
  beforeEach(() =>
    dataSource.query(
      'TRUNCATE "payment_notification_deliveries", "payment_event", "checkout_attempts", "voucher_batches", "users", "institutions" CASCADE',
    ),
  );
  afterAll(() => dataSource?.isInitialized && dataSource.destroy());
  it('creates only safe, resolved buyer and admin intents from canonical facts and replays idempotently', async () => {
    const { batch, buyer, admin, checkout, payment } = await fixture();
    const service = new PaymentNotificationIntentService();
    await expect(deliveries().count()).resolves.toBe(0);
    await dataSource.transaction((manager) =>
      service.createForFirstFulfillment(manager, batch, fulfilledAt),
    );
    const rows = await deliveries().find({ order: { recipientKind: 'ASC' } });
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row).toMatchObject({
        status: 'PENDING',
        attemptCount: 0,
        enqueueAttemptCount: 0,
        nextAttemptAt: null,
        lastErrorClassification: null,
        lastErrorMessage: null,
        recipientResolvedAt: fulfilledAt,
      });
      expect(row.contextSnapshot).toEqual({
        version: 1,
        voucherBatchId: batch.id,
        checkoutAttemptId: checkout!.id,
        paymentEventId: payment.id,
        institution: { id: batch.ownerInstitutionId, name: 'Clinic' },
        buyer: { userId: buyer.id, email: buyer.email, name: buyer.name },
        commercial: {
          pricingPlanId: '00000000-0000-0000-0000-000000000100',
          planName: 'Plan',
          voucherQuantity: 2,
        },
        charged: { amountMinor: '1000', currency: 'USD' },
        payment: {
          gateway: 'STRIPE',
          externalReference: 'latest-payment-reference',
          settledAt: '2026-03-10T11:59:00.000Z',
        },
        fulfilledAt: fulfilledAt.toISOString(),
      });
    }
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recipientKind: 'BUYER',
          recipientUserId: buyer.id,
          recipientEmailSnapshot: buyer.email,
          recipientNameSnapshot: buyer.name,
        }),
        expect.objectContaining({
          recipientKind: 'PLATFORM_ADMIN',
          recipientUserId: admin.id,
          recipientEmailSnapshot: admin.email,
          recipientNameSnapshot: admin.name,
        }),
      ]),
    );
    await dataSource.transaction((manager) =>
      service.createForFirstFulfillment(manager, batch, fulfilledAt),
    );
    await expect(deliveries().count()).resolves.toBe(2);
  });
  it('writes fixed unresolved admin intents for zero or multiple active admins', async () => {
    for (const [adminCount, lastErrorMessage] of [
      [0, 'No eligible platform administrator'],
      [2, 'Multiple eligible platform administrators'],
    ] as const) {
      const { batch } = await fixture({ adminCount });
      await create(batch);
      await expect(
        deliveries().findOneByOrFail({ recipientKind: 'PLATFORM_ADMIN' }),
      ).resolves.toMatchObject({
        status: 'RETRYABLE_FAILED',
        recipientUserId: null,
        recipientEmailSnapshot: null,
        recipientNameSnapshot: null,
        recipientResolvedAt: null,
        lastErrorClassification: 'RECIPIENT_UNRESOLVED',
        lastErrorMessage,
        nextAttemptAt: fulfilledAt,
      });
      await dataSource.query(
        'TRUNCATE "payment_notification_deliveries", "payment_event", "checkout_attempts", "voucher_batches", "users", "institutions" CASCADE',
      );
    }
  });
  it('writes the fixed unresolved buyer intent without checkout provenance', async () => {
    const { batch } = await fixture({ buyer: false });
    await create(batch);
    await expect(
      deliveries().findOneByOrFail({ recipientKind: 'BUYER' }),
    ).resolves.toMatchObject({
      status: 'RETRYABLE_FAILED',
      recipientUserId: null,
      recipientEmailSnapshot: null,
      recipientNameSnapshot: null,
      recipientResolvedAt: null,
      lastErrorClassification: 'RECIPIENT_UNRESOLVED',
      lastErrorMessage: 'Buyer recipient is unavailable',
      nextAttemptAt: fulfilledAt,
    });
  });
  it('rejects missing canonical institution context without persisting a snapshot', async () => {
    const { batch } = await fixture({ ownerInstitutionId: null });
    await expect(
      dataSource.transaction((manager) =>
        new PaymentNotificationIntentService().createForFirstFulfillment(
          manager,
          batch,
          fulfilledAt,
        ),
      ),
    ).rejects.toThrow('Payment notification intent requires an institution');
    await expect(deliveries().count()).resolves.toBe(0);
  });
  const create = (batch: VoucherBatch) =>
    dataSource.transaction((manager) =>
      new PaymentNotificationIntentService().createForFirstFulfillment(
        manager,
        batch,
        fulfilledAt,
      ),
    );
  const deliveries = () =>
    dataSource.getRepository(PaymentNotificationDelivery);
  async function fixture({
    adminCount = 1,
    ownerInstitutionId,
    buyer: withBuyer = true,
  }: {
    adminCount?: number;
    ownerInstitutionId?: string | null;
    buyer?: boolean;
  } = {}) {
    const institution = await dataSource.getRepository(Institution).save({
      name: 'Clinic',
      billingEmail: 'billing@example.test',
    });
    const buyer = withBuyer
      ? await dataSource.getRepository(User).save({
          name: 'Buyer',
          email: 'buyer@example.test',
          passwordHash: 'x',
          role: UserRole.THERAPIST,
          institutionId: institution.id,
        })
      : null;
    const admins = await Promise.all(
      Array.from({ length: adminCount }, (_, index) =>
        dataSource.getRepository(User).save({
          name: `Admin ${index}`,
          email: `platform-${index}@example.test`,
          passwordHash: 'x',
          role: UserRole.ADMIN,
          institutionId: null,
        }),
      ),
    );
    const batch = await dataSource.getRepository(VoucherBatch).save({
      shortCode: `INTENT${adminCount}${withBuyer ? 'B' : 'N'}`,
      ownerType: VoucherOwnerType.INSTITUTION,
      ownerInstitutionId:
        ownerInstitutionId === undefined ? institution.id : ownerInstitutionId,
      ownerUserId: null,
      quantity: 2,
      unitPrice: '5',
      totalPrice: '10',
      currency: 'USD',
      expectedAmountMinor: '1000',
      idempotencyKey: null,
      paymentProvider: 'STRIPE',
      paymentReference: 'reference',
      status: VoucherBatchStatus.PAID,
      paidAt: fulfilledAt,
    });
    const checkout = withBuyer
      ? await dataSource.getRepository(CheckoutAttempt).save({
          ownerInstitutionId: institution.id,
          buyerUserId: buyer.id,
          gateway: 'STRIPE',
          state: 'READY',
          requestFingerprint: 'fingerprint',
          providerIdempotencyKey: 'provider-key',
          voucherBatchId: batch.id,
          providerCheckoutUrl: 'https://checkout.example.test/private',
          commercialSnapshot: {
            kind: 'COMPLETE',
            pricingPlanId: '00000000-0000-0000-0000-000000000100',
            planName: 'Plan',
            voucherQuantity: 2,
            listedUsd: { amountMinor: '1000', currency: 'USD' },
            charged: { amountMinor: '1000', currency: 'USD' },
            gateway: 'STRIPE',
          },
        })
      : null;
    const payment = await dataSource.getRepository(PaymentEvent).save({
      gateway: 'STRIPE',
      externalPaymentId: 'latest-payment-reference',
      status: 'APPROVED',
      payloadDigest: 'not-a-snapshot-field',
      voucherBatchId: batch.id,
      checkoutAttemptId: checkout?.id ?? null,
      createdAt: new Date('2026-03-10T11:59:00.000Z'),
    });
    return { batch, buyer, admin: admins[0], checkout, payment };
  }
});

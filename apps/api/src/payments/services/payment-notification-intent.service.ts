import { Injectable } from '@nestjs/common';
import {
  PaymentNotificationContextSnapshotV1,
  type PaymentNotificationContextSnapshotV1 as ContextSnapshot,
} from '@akit/contracts';
import { EntityManager } from 'typeorm';
import { Institution } from '../../institutions/entities/institution.entity.js';
import { User, UserRole } from '../../users/entities/user.entity.js';
import { VoucherBatch } from '../../vouchers/entities/voucher-batch.entity.js';
import { CheckoutAttempt } from '../entities/checkout-attempt.entity.js';
import { PaymentEvent } from '../entities/payment-event.entity.js';
import { PaymentNotificationDelivery } from '../entities/payment-notification-delivery.entity.js';
const unresolved = (message: string) => ({
  recipientUserId: null,
  recipientEmailSnapshot: null,
  recipientNameSnapshot: null,
  recipientResolvedAt: null,
  status: 'RETRYABLE_FAILED' as const,
  lastErrorClassification: 'RECIPIENT_UNRESOLVED' as const,
  lastErrorMessage: message,
});
@Injectable()
export class PaymentNotificationIntentService {
  async createForFirstFulfillment(
    manager: EntityManager,
    batch: VoucherBatch,
    fulfilledAt: Date,
  ): Promise<void> {
    if (!batch.ownerInstitutionId) {
      throw new Error('Payment notification intent requires an institution');
    }
    const [checkout, institution, payment, admins] = await Promise.all([
      manager.findOne(CheckoutAttempt, {
        where: { voucherBatchId: batch.id },
        relations: { buyerUser: true },
      }),
      manager.findOneByOrFail(Institution, { id: batch.ownerInstitutionId }),
      manager.findOne(PaymentEvent, {
        where: { voucherBatchId: batch.id, status: 'APPROVED' },
        order: { createdAt: 'DESC', id: 'DESC' },
      }),
      manager
        .createQueryBuilder(User, 'user')
        .where('user.role = :role AND user.deleted_at IS NULL', {
          role: UserRole.ADMIN,
        })
        .take(2)
        .getMany(),
    ]);
    const buyer = checkout?.buyerUser;
    const context = this.context(
      batch,
      checkout,
      institution,
      payment,
      fulfilledAt,
    );
    const recipient = (user: User | null | undefined, missing: string) =>
      user?.email.trim() && user.name.trim()
        ? {
            recipientUserId: user.id,
            recipientEmailSnapshot: user.email.trim(),
            recipientNameSnapshot: user.name.trim(),
            recipientResolvedAt: fulfilledAt,
            status: 'PENDING' as const,
            lastErrorClassification: null,
            lastErrorMessage: null,
          }
        : unresolved(missing);
    const admin =
      admins.length === 1
        ? recipient(admins[0], 'No eligible platform administrator')
        : unresolved(
            admins.length === 0
              ? 'No eligible platform administrator'
              : 'Multiple eligible platform administrators',
          );
    await manager
      .createQueryBuilder()
      .insert()
      .into(PaymentNotificationDelivery)
      .values([
        {
          voucherBatchId: batch.id,
          recipientKind: 'BUYER',
          contextSnapshot: context,
          attemptCount: 0,
          enqueueAttemptCount: 0,
          nextAttemptAt:
            buyer?.email.trim() && buyer.name.trim() ? null : fulfilledAt,
          ...recipient(buyer, 'Buyer recipient is unavailable'),
        },
        {
          voucherBatchId: batch.id,
          recipientKind: 'PLATFORM_ADMIN',
          contextSnapshot: context,
          attemptCount: 0,
          enqueueAttemptCount: 0,
          nextAttemptAt: admin.status === 'PENDING' ? null : fulfilledAt,
          ...admin,
        },
      ])
      .orIgnore()
      .returning('id')
      .execute();
  }
  private context(
    batch: VoucherBatch,
    checkout: CheckoutAttempt | null,
    institution: Institution,
    payment: PaymentEvent | null,
    fulfilledAt: Date,
  ): ContextSnapshot {
    const commercial = checkout?.commercialSnapshot;
    return PaymentNotificationContextSnapshotV1.parse({
      version: 1,
      voucherBatchId: batch.id,
      checkoutAttemptId: checkout?.id ?? null,
      paymentEventId: payment?.id ?? null,
      institution: { id: institution.id, name: institution.name.trim() },
      buyer:
        checkout?.buyerUser?.email.trim() && checkout.buyerUser.name.trim()
          ? {
              userId: checkout.buyerUser.id,
              email: checkout.buyerUser.email.trim(),
              name: checkout.buyerUser.name.trim(),
            }
          : null,
      commercial: {
        pricingPlanId: commercial?.pricingPlanId ?? null,
        planName: commercial?.planName ?? null,
        voucherQuantity: batch.quantity,
      },
      charged: commercial?.charged ?? null,
      payment: payment
        ? {
            gateway: payment.gateway,
            externalReference: payment.externalPaymentId,
            settledAt: payment.createdAt.toISOString(),
          }
        : null,
      fulfilledAt: fulfilledAt.toISOString(),
    });
  }
}

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import { User, UserRole } from '../../users/entities/user.entity.js';
import { PaymentNotificationDelivery } from '../entities/payment-notification-delivery.entity.js';

const MAX_ATTEMPTS = 8;
const CLAIM_LEASE_MS = 15 * 60_000;
const RETRY_DELAY_MS = 60_000;
const TERMINAL = ['SENT', 'DEAD_LETTER'];
const BUYER_UNRESOLVED = 'Buyer recipient is unavailable';
const ADMIN_UNRESOLVED = 'No eligible platform administrator';
const ADMINS_UNRESOLVED = 'Multiple eligible platform administrators';

type ClaimedDelivery = Pick<
  PaymentNotificationDelivery,
  | 'id'
  | 'voucherBatchId'
  | 'recipientKind'
  | 'contextSnapshot'
  | 'recipientUserId'
  | 'recipientEmailSnapshot'
  | 'recipientNameSnapshot'
  | 'attemptCount'
>;

@Injectable()
export class PaymentNotificationDeliveryStateService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async claim(
    id: string,
    now = new Date(),
  ): Promise<ClaimedDelivery | undefined> {
    return this.dataSource.transaction(async (manager) => {
      const delivery = await manager.findOne(PaymentNotificationDelivery, {
        where: { id },
        lock: {
          mode: 'pessimistic_write',
          tables: ['payment_notification_deliveries'],
        },
      });
      if (
        !delivery ||
        TERMINAL.includes(delivery.status) ||
        (delivery.status === 'RETRYABLE_FAILED' &&
          (!delivery.nextAttemptAt || delivery.nextAttemptAt > now)) ||
        (delivery.status !== 'RETRYABLE_FAILED' &&
          delivery.lastAttemptAt &&
          delivery.lastAttemptAt.getTime() > now.getTime() - CLAIM_LEASE_MS) ||
        delivery.attemptCount >= MAX_ATTEMPTS
      ) {
        return undefined;
      }

      delivery.status = 'QUEUED';
      delivery.attemptCount += 1;
      delivery.lastAttemptAt = now;
      delivery.nextAttemptAt = null;
      delivery.lastErrorClassification = null;
      delivery.lastErrorMessage = null;
      await manager.save(PaymentNotificationDelivery, delivery);
      return this.executionInput(delivery);
    });
  }

  async resolveRecipient(
    id: string,
    expectedAttempt: number,
  ): Promise<ClaimedDelivery | undefined> {
    return this.dataSource.transaction(async (manager) => {
      const delivery = await manager.findOne(PaymentNotificationDelivery, {
        where: { id },
        lock: {
          mode: 'pessimistic_write',
          tables: ['payment_notification_deliveries'],
        },
      });
      if (
        !delivery ||
        delivery.status !== 'QUEUED' ||
        delivery.attemptCount !== expectedAttempt
      )
        return undefined;
      if (delivery.recipientResolvedAt) return this.executionInput(delivery);

      const resolution = await this.recipient(manager, delivery);
      if (!resolution.recipient) {
        await this.failure(
          manager,
          id,
          expectedAttempt,
          'RECIPIENT_UNRESOLVED',
          resolution.message,
        );
        return undefined;
      }
      delivery.recipientUserId = resolution.recipient.id;
      delivery.recipientEmailSnapshot = resolution.recipient.email;
      delivery.recipientNameSnapshot = resolution.recipient.name;
      delivery.recipientResolvedAt = new Date();
      await manager.save(PaymentNotificationDelivery, delivery);
      return this.executionInput(delivery);
    });
  }

  async markSent(id: string, expectedAttempt: number): Promise<void> {
    await this.dataSource.transaction((manager) =>
      this.conditionalUpdate(manager, id, expectedAttempt, {
        status: 'SENT',
        sentAt: new Date(),
        nextAttemptAt: null,
        lastErrorClassification: null,
        lastErrorMessage: null,
      }),
    );
  }

  async recordFailure(
    id: string,
    expectedAttempt: number,
    classification: PaymentNotificationDelivery['lastErrorClassification'],
    message: string,
    permanent = false,
  ): Promise<void> {
    await this.dataSource.transaction((manager) =>
      this.failure(
        manager,
        id,
        expectedAttempt,
        classification,
        message,
        permanent,
      ),
    );
  }

  private async recipient(
    manager: EntityManager,
    delivery: PaymentNotificationDelivery,
  ): Promise<{
    recipient?: { id: string; email: string; name: string };
    message: string;
  }> {
    if (delivery.recipientKind === 'BUYER') {
      const buyer = delivery.contextSnapshot.buyer;
      return {
        recipient:
          buyer && validRecipient({ id: buyer.userId, ...buyer })
            ? { id: buyer.userId, ...buyer }
            : undefined,
        message: BUYER_UNRESOLVED,
      };
    }
    const admins = await manager
      .createQueryBuilder(User, 'user')
      .where('user.role = :role AND user.deleted_at IS NULL', {
        role: UserRole.ADMIN,
      })
      .take(2)
      .getMany();
    return {
      recipient:
        admins.length === 1 && validRecipient(admins[0])
          ? admins[0]
          : undefined,
      message: admins.length > 1 ? ADMINS_UNRESOLVED : ADMIN_UNRESOLVED,
    };
  }

  private async failure(
    manager: EntityManager,
    id: string,
    expectedAttempt: number,
    classification: PaymentNotificationDelivery['lastErrorClassification'],
    message: string,
    permanent = false,
  ): Promise<void> {
    const deadLetter = permanent || expectedAttempt >= MAX_ATTEMPTS;
    await this.conditionalUpdate(manager, id, expectedAttempt, {
      status: deadLetter ? 'DEAD_LETTER' : 'RETRYABLE_FAILED',
      lastErrorClassification: classification,
      lastErrorMessage: message,
      nextAttemptAt: deadLetter
        ? null
        : new Date(Date.now() + RETRY_DELAY_MS * 2 ** (expectedAttempt - 1)),
    });
  }

  private async conditionalUpdate(
    manager: EntityManager,
    id: string,
    expectedAttempt: number,
    update: Partial<PaymentNotificationDelivery>,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(PaymentNotificationDelivery)
      .set(update)
      .where('id = :id', { id })
      .andWhere('attempt_count = :expectedAttempt', { expectedAttempt })
      .andWhere('status NOT IN (:...terminal)', { terminal: TERMINAL })
      .execute();
  }

  private executionInput(
    delivery: PaymentNotificationDelivery,
  ): ClaimedDelivery {
    return {
      id: delivery.id,
      voucherBatchId: delivery.voucherBatchId,
      recipientKind: delivery.recipientKind,
      contextSnapshot: delivery.contextSnapshot,
      recipientUserId: delivery.recipientUserId,
      recipientEmailSnapshot: delivery.recipientEmailSnapshot,
      recipientNameSnapshot: delivery.recipientNameSnapshot,
      attemptCount: delivery.attemptCount,
    };
  }
}

function validRecipient(user: Pick<User, 'id' | 'email' | 'name'>): boolean {
  return Boolean(user.id && user.email.trim() && user.name.trim());
}

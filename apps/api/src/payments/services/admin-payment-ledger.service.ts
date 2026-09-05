import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AdminPaymentLedgerDetail,
  AdminPaymentLedgerPage,
  type AdminPaymentLedgerEntry,
  type AdminPaymentLedgerQuery,
} from '@akit/contracts';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Institution } from '../../institutions/entities/institution.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { VoucherBatch } from '../../vouchers/entities/voucher-batch.entity.js';
import { CheckoutAttempt } from '../entities/checkout-attempt.entity.js';
import { PaymentEvent } from '../entities/payment-event.entity.js';
import { PaymentNotificationDelivery } from '../entities/payment-notification-delivery.entity.js';

interface LedgerRow {
  voucherBatchId: string;
  totalPrice: string;
  currency: string;
  fulfilledAt: Date | null;
  expectedVoucherCount: string;
  actualVoucherCount: string;
  institutionId: string;
  institutionName: string;
  checkoutAttemptId: string | null;
  pricingPlanId: string | null;
  planName: string | null;
  buyerId: string | null;
  buyerName: string | null;
  buyerEmail: string | null;
  paymentEventId: string | null;
  gateway: 'MERCADO_PAGO' | 'STRIPE' | null;
  externalReference: string | null;
  settledAt: Date | null;
  operationalState:
    | 'ACCREDITED'
    | 'PENDING_ACCREDITATION'
    | 'ACCREDITED_NOTIFICATION_ATTENTION';
  buyerDeliveryId: string | null;
  buyerDeliveryStatus:
    | 'PENDING'
    | 'QUEUED'
    | 'SENT'
    | 'RETRYABLE_FAILED'
    | 'DEAD_LETTER'
    | null;
  buyerAttemptCount: string | null;
  buyerEnqueueAttemptCount: string | null;
  buyerRecipientId: string | null;
  buyerRecipientName: string | null;
  buyerRecipientEmail: string | null;
  buyerQueuedAt: Date | null;
  buyerLastAttemptAt: Date | null;
  buyerSentAt: Date | null;
  buyerErrorClassification:
    | 'RECIPIENT_UNRESOLVED'
    | 'QUEUE_FAILURE'
    | 'RENDER_FAILURE'
    | 'TRANSPORT_TRANSIENT'
    | 'TRANSPORT_PERMANENT'
    | null;
  buyerErrorMessage: string | null;
  adminDeliveryId: string | null;
  adminDeliveryStatus: LedgerRow['buyerDeliveryStatus'];
  adminAttemptCount: string | null;
  adminEnqueueAttemptCount: string | null;
  adminRecipientId: string | null;
  adminRecipientName: string | null;
  adminRecipientEmail: string | null;
  adminQueuedAt: Date | null;
  adminLastAttemptAt: Date | null;
  adminSentAt: Date | null;
  adminErrorClassification: LedgerRow['buyerErrorClassification'];
  adminErrorMessage: string | null;
}

@Injectable()
export class AdminPaymentLedgerService {
  constructor(
    @InjectRepository(VoucherBatch)
    private readonly batches: Repository<VoucherBatch>,
  ) {}

  async list(query: AdminPaymentLedgerQuery) {
    const builder = this.query(query);
    const total = await builder.clone().getCount();
    const rows = await builder
      .offset((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .getRawMany<LedgerRow>();
    return AdminPaymentLedgerPage.parse({
      items: rows.map((row) => this.entry(row)),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
      sort: query.sort,
    });
  }

  async detail(voucherBatchId: string) {
    const row = await this.query()
      .andWhere('batch.id = :voucherBatchId', { voucherBatchId })
      .getRawOne<LedgerRow>();
    if (!row) throw new NotFoundException('Payment ledger batch not found');
    return AdminPaymentLedgerDetail.parse(this.entry(row));
  }

  private query(
    query?: AdminPaymentLedgerQuery,
  ): SelectQueryBuilder<VoucherBatch> {
    const builder = this.batches
      .createQueryBuilder('batch')
      .innerJoin(
        Institution,
        'institution',
        'institution.id = batch.ownerInstitutionId',
      )
      .leftJoin(
        CheckoutAttempt,
        'checkout',
        'checkout.voucherBatchId = batch.id',
      )
      .leftJoin(User, 'buyer', 'buyer.id = checkout.buyerUserId')
      .leftJoin(
        PaymentEvent,
        'payment',
        `payment.id = (SELECT event.id FROM payment_event event WHERE event."voucherBatchId" = batch.id AND event.status = 'APPROVED' ORDER BY event."createdAt" DESC, event.id DESC LIMIT 1)`,
      )
      .leftJoin(
        PaymentNotificationDelivery,
        'buyerDelivery',
        "buyerDelivery.voucherBatchId = batch.id AND buyerDelivery.recipientKind = 'BUYER'",
      )
      .leftJoin(
        PaymentNotificationDelivery,
        'adminDelivery',
        "adminDelivery.voucherBatchId = batch.id AND adminDelivery.recipientKind = 'PLATFORM_ADMIN'",
      )
      .where("batch.status = 'PAID'")
      .select([
        'batch.id AS "voucherBatchId"',
        'batch.totalPrice AS "totalPrice"',
        'batch.currency AS "currency"',
        'batch.fulfilledAt AS "fulfilledAt"',
        'batch.quantity AS "expectedVoucherCount"',
        '(SELECT COUNT(*) FROM vouchers voucher WHERE voucher.batch_id = batch.id) AS "actualVoucherCount"',
        'institution.id AS "institutionId"',
        'institution.name AS "institutionName"',
        'checkout.id AS "checkoutAttemptId"',
        'checkout.commercialSnapshot ->> \'pricingPlanId\' AS "pricingPlanId"',
        'checkout.commercialSnapshot ->> \'planName\' AS "planName"',
        'buyer.id AS "buyerId"',
        'buyer.name AS "buyerName"',
        'buyer.email AS "buyerEmail"',
        'payment.id AS "paymentEventId"',
        'payment.gateway AS "gateway"',
        'payment.externalPaymentId AS "externalReference"',
        'payment.createdAt AS "settledAt"',
        `${this.operationalStateExpression()} AS "operationalState"`,
        ...this.deliverySelect('buyer'),
        ...this.deliverySelect('admin'),
      ]);

    if (!query) return builder;
    if (query.institutionId)
      builder.andWhere('batch.ownerInstitutionId = :institutionId', {
        institutionId: query.institutionId,
      });
    if (query.institutionName) {
      const institutionName = query.institutionName.replace(/[\\%_]/g, '\\$&');
      builder.andWhere("institution.name ILIKE :institutionName ESCAPE '\\'", {
        institutionName: `%${institutionName}%`,
      });
    }
    if (query.fulfillmentState === 'FULFILLED')
      builder.andWhere('batch.fulfilledAt IS NOT NULL');
    if (query.fulfillmentState === 'PENDING')
      builder.andWhere('batch.fulfilledAt IS NULL');
    this.range(builder, 'payment.createdAt', 'settled', query);
    this.range(builder, 'batch.fulfilledAt', 'fulfilled', query);
    if (query.notificationStatus) this.notificationFilter(builder, query);
    this.order(builder, query);
    return builder;
  }

  private operationalStateExpression() {
    const actualVoucherCount =
      '(SELECT COUNT(*) FROM vouchers voucher WHERE voucher.batch_id = batch.id)';
    return `CASE
      WHEN payment.id IS NOT NULL
        AND batch.fulfilledAt IS NOT NULL
        AND ${actualVoucherCount} = batch.quantity
        AND (buyerDelivery.status IN ('RETRYABLE_FAILED', 'DEAD_LETTER') OR adminDelivery.status IN ('RETRYABLE_FAILED', 'DEAD_LETTER'))
        THEN 'ACCREDITED_NOTIFICATION_ATTENTION'
      WHEN payment.id IS NOT NULL
        AND batch.fulfilledAt IS NOT NULL
        AND ${actualVoucherCount} = batch.quantity
        THEN 'ACCREDITED'
      ELSE 'PENDING_ACCREDITATION'
    END`;
  }

  private order(
    builder: SelectQueryBuilder<VoucherBatch>,
    query: AdminPaymentLedgerQuery,
  ) {
    const sorts = {
      SETTLED: 'payment.createdAt',
      INSTITUTION: 'institution.name',
      PLAN: "checkout.commercialSnapshot ->> 'planName'",
      AMOUNT: 'batch.totalPrice',
      GATEWAY: 'payment.gateway',
      OPERATIONAL_STATE: this.operationalStateExpression(),
    } as const;
    const [field, direction] = query.sort.split(/_(?=[^_]+$)/) as [
      keyof typeof sorts,
      'ASC' | 'DESC',
    ];
    builder
      .orderBy(sorts[field], direction, 'NULLS LAST')
      .addOrderBy('batch.id', 'ASC');
  }

  private deliverySelect(prefix: 'buyer' | 'admin') {
    const delivery = `${prefix}Delivery`;
    const title = prefix === 'admin' ? 'admin' : 'buyer';
    return [
      `${delivery}.id AS "${title}DeliveryId"`,
      `${delivery}.status AS "${title}DeliveryStatus"`,
      `${delivery}.attemptCount AS "${title}AttemptCount"`,
      `${delivery}.enqueueAttemptCount AS "${title}EnqueueAttemptCount"`,
      `${delivery}.recipientUserId AS "${title}RecipientId"`,
      `${delivery}.recipientNameSnapshot AS "${title}RecipientName"`,
      `${delivery}.recipientEmailSnapshot AS "${title}RecipientEmail"`,
      `${delivery}.queuedAt AS "${title}QueuedAt"`,
      `${delivery}.lastAttemptAt AS "${title}LastAttemptAt"`,
      `${delivery}.sentAt AS "${title}SentAt"`,
      `${delivery}.lastErrorClassification AS "${title}ErrorClassification"`,
      `${delivery}.lastErrorMessage AS "${title}ErrorMessage"`,
    ];
  }

  private range(
    builder: SelectQueryBuilder<VoucherBatch>,
    column: string,
    prefix: 'settled' | 'fulfilled',
    query: AdminPaymentLedgerQuery,
  ) {
    const from = query[`${prefix}From`];
    const to = query[`${prefix}To`];
    if (from)
      builder.andWhere(`${column} >= :${prefix}From`, {
        [`${prefix}From`]: from,
      });
    if (to)
      builder.andWhere(`${column} <= :${prefix}To`, { [`${prefix}To`]: to });
  }

  private notificationFilter(
    builder: SelectQueryBuilder<VoucherBatch>,
    query: AdminPaymentLedgerQuery,
  ) {
    const deliveries =
      query.notificationRecipient === 'BUYER'
        ? ['buyerDelivery']
        : query.notificationRecipient === 'PLATFORM_ADMIN'
          ? ['adminDelivery']
          : ['buyerDelivery', 'adminDelivery'];
    if (query.notificationStatus === 'ABSENT') {
      builder.andWhere(
        deliveries.map((delivery) => `${delivery}.id IS NULL`).join(' AND '),
      );
      return;
    }
    builder.andWhere(
      deliveries
        .map((delivery) => `${delivery}.status = :notificationStatus`)
        .join(' OR '),
      { notificationStatus: query.notificationStatus },
    );
  }

  private entry(row: LedgerRow): AdminPaymentLedgerEntry {
    const actualVoucherCount = Number(row.actualVoucherCount);
    const expectedVoucherCount = Number(row.expectedVoucherCount);
    return {
      voucherBatchId: row.voucherBatchId,
      checkoutAttemptId: row.checkoutAttemptId,
      paymentEventId: row.paymentEventId,
      institution: { id: row.institutionId, name: row.institutionName.trim() },
      buyer: this.recipient(row.buyerId, row.buyerName, row.buyerEmail),
      commercial: {
        pricingPlanId: this.uuid(row.pricingPlanId),
        planName: this.text(row.planName),
      },
      amount: { value: row.totalPrice, currency: row.currency },
      payment:
        row.paymentEventId &&
        row.gateway &&
        row.externalReference &&
        row.settledAt
          ? {
              gateway: row.gateway,
              externalReference: row.externalReference,
              settledAt: row.settledAt.toISOString(),
            }
          : null,
      fulfillment: {
        state: row.fulfilledAt ? 'FULFILLED' : 'PENDING',
        fulfilledAt: row.fulfilledAt?.toISOString() ?? null,
        expectedVoucherCount,
        actualVoucherCount,
        discrepancy: actualVoucherCount - expectedVoucherCount,
      },
      operationalState: this.operationalState(
        row,
        actualVoucherCount,
        expectedVoucherCount,
      ),
      notifications: {
        buyer: this.delivery(row, 'buyer'),
        platformAdmin: this.delivery(row, 'admin'),
      },
    };
  }

  private delivery(row: LedgerRow, prefix: 'buyer' | 'admin') {
    const title = prefix === 'admin' ? 'admin' : 'buyer';
    const id = row[`${title}DeliveryId`];
    if (!id) return null;
    const errorClassification = row[`${title}ErrorClassification`];
    const errorMessage = row[`${title}ErrorMessage`];
    return {
      deliveryId: id,
      status: row[`${title}DeliveryStatus`]!,
      attemptCount: Number(row[`${title}AttemptCount`]),
      enqueueAttemptCount: Number(row[`${title}EnqueueAttemptCount`]),
      recipient: this.recipient(
        row[`${title}RecipientId`],
        row[`${title}RecipientName`],
        row[`${title}RecipientEmail`],
      ),
      queuedAt: row[`${title}QueuedAt`]?.toISOString() ?? null,
      lastAttemptAt: row[`${title}LastAttemptAt`]?.toISOString() ?? null,
      sentAt: row[`${title}SentAt`]?.toISOString() ?? null,
      error:
        errorClassification && errorMessage
          ? {
              classification: errorClassification,
              message: errorMessage.slice(0, 256),
            }
          : null,
    };
  }

  private operationalState(
    row: LedgerRow,
    actualVoucherCount: number,
    expectedVoucherCount: number,
  ): AdminPaymentLedgerEntry['operationalState'] {
    if (
      !row.paymentEventId ||
      !row.fulfilledAt ||
      actualVoucherCount !== expectedVoucherCount
    ) {
      return 'PENDING_ACCREDITATION';
    }
    if (
      row.buyerDeliveryStatus === 'RETRYABLE_FAILED' ||
      row.buyerDeliveryStatus === 'DEAD_LETTER' ||
      row.adminDeliveryStatus === 'RETRYABLE_FAILED' ||
      row.adminDeliveryStatus === 'DEAD_LETTER'
    ) {
      return 'ACCREDITED_NOTIFICATION_ATTENTION';
    }
    return 'ACCREDITED';
  }

  private recipient(
    id: string | null,
    name: string | null,
    email: string | null,
  ) {
    return id && name?.trim() && email?.trim()
      ? { userId: id, name: name.trim(), email: email.trim() }
      : null;
  }

  private uuid(value: string | null) {
    return value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
      ? value
      : null;
  }

  private text(value: string | null) {
    return value?.trim() || null;
  }
}

import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  PurchaseSummaryResponse,
  type PurchaseSummaryQuery,
  type PurchaseSummaryResponse as PurchaseSummary,
} from '@akit/contracts';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Institution } from '../../institutions/entities/institution.entity.js';
import { VoucherBatch } from '../../vouchers/entities/voucher-batch.entity.js';

export type PurchaseSummaryScope =
  | { scope: 'PLATFORM' }
  | { scope: 'INSTITUTION'; institutionId: string };

type MetricRow = {
  currency: string;
  accreditedPurchaseCount: string;
  accreditedVoucherCount: string;
  amount: string;
  purchasingInstitutionCount?: string;
};
type CountRow = { count: string };
type LatestRow = {
  institutionName: string;
  fulfilledAt: Date;
  quantity: string;
  currency: string;
  amount: string;
};

@Injectable()
export class PurchaseSummaryService {
  constructor(
    @InjectRepository(VoucherBatch)
    private readonly batches: Repository<VoucherBatch>,
    @InjectRepository(Institution)
    private readonly institutions: Repository<Institution>,
  ) {}

  async get(
    query: PurchaseSummaryQuery,
    scope: PurchaseSummaryScope,
  ): Promise<PurchaseSummary> {
    const institution =
      scope.scope === 'INSTITUTION'
        ? await this.institutions.findOne({
            where: { id: scope.institutionId },
          })
        : null;
    if (scope.scope === 'INSTITUTION' && !institution)
      throw new ForbiddenException('Institution scope unavailable');

    const now = this.currentTime();
    const current = this.window(now, query.periodDays, 1);
    const prior = this.window(now, query.periodDays, 2);
    const [
      currentRows,
      currentInstitutionCount,
      priorRows,
      priorInstitutionCount,
      paidAlert,
      notificationAlert,
      latest,
    ] = await Promise.all([
      this.metrics(current, scope),
      this.purchasingInstitutionCount(current, scope),
      this.metrics(prior, scope),
      this.purchasingInstitutionCount(prior, scope),
      this.paidButNotFulfilled(scope),
      this.notificationAttention(scope),
      this.latest(scope),
    ]);
    const base = {
      generatedAt: now.toISOString(),
      currentWindow: this.publicWindow(current, query.periodDays),
      priorWindow: this.publicWindow(prior, query.periodDays),
      alerts: {
        paidButNotFulfilledCount: Number(paidAlert?.count ?? 0),
        notificationAttentionCount: Number(notificationAlert?.count ?? 0),
      },
    };
    if (scope.scope === 'PLATFORM') {
      return PurchaseSummaryResponse.parse({
        ...base,
        scope: 'PLATFORM',
        current: this.metricsResponse(
          currentRows,
          currentInstitutionCount?.count ?? '0',
        ),
        prior: this.metricsResponse(
          priorRows,
          priorInstitutionCount?.count ?? '0',
        ),
        latestAccreditation: latest ? this.latestResponse(latest, true) : null,
      });
    }
    return PurchaseSummaryResponse.parse({
      ...base,
      scope: 'INSTITUTION',
      institutionName: institution!.name,
      current: this.metricsResponse(currentRows),
      prior: this.metricsResponse(priorRows),
      latestAccreditation: latest ? this.latestResponse(latest, false) : null,
    });
  }

  private currentTime(): Date {
    return new Date();
  }

  private metrics(
    window: { from: Date; to: Date },
    scope: PurchaseSummaryScope,
  ) {
    const builder = this.accredited(scope)
      .andWhere(
        'batch.fulfilledAt >= :from AND batch.fulfilledAt < :to',
        window,
      )
      .select([
        'batch.currency AS "currency"',
        'COUNT(*) AS "accreditedPurchaseCount"',
        'COALESCE(SUM(batch.quantity), 0) AS "accreditedVoucherCount"',
        'COALESCE(SUM(batch.totalPrice), 0) AS "amount"',
      ])
      .groupBy('batch.currency');
    return builder.getRawMany<MetricRow>();
  }

  private purchasingInstitutionCount(
    window: { from: Date; to: Date },
    scope: PurchaseSummaryScope,
  ) {
    if (scope.scope === 'INSTITUTION') return Promise.resolve(null);
    return this.accredited(scope)
      .andWhere(
        'batch.fulfilledAt >= :from AND batch.fulfilledAt < :to',
        window,
      )
      .select('COUNT(DISTINCT batch.ownerInstitutionId)', 'count')
      .getRawOne<CountRow>();
  }

  private paidButNotFulfilled(scope: PurchaseSummaryScope) {
    return this.scoped(scope)
      .andWhere("batch.status = 'PAID'")
      .andWhere(
        `(NOT EXISTS (SELECT 1 FROM payment_event payment WHERE payment."voucherBatchId" = batch.id AND payment.status = 'APPROVED') OR batch.fulfilledAt IS NULL OR (SELECT COUNT(*) FROM vouchers voucher WHERE voucher.batch_id = batch.id) <> batch.quantity)`,
      )
      .select('COUNT(*)', 'count')
      .getRawOne<CountRow>();
  }

  private notificationAttention(scope: PurchaseSummaryScope) {
    const recipients =
      scope.scope === 'PLATFORM' ? "'BUYER', 'PLATFORM_ADMIN'" : "'BUYER'";
    return this.accredited(scope)
      .andWhere(
        `EXISTS (SELECT 1 FROM payment_notification_deliveries delivery WHERE delivery.voucher_batch_id = batch.id AND delivery.recipient_kind IN (${recipients}) AND delivery.status IN ('RETRYABLE_FAILED', 'DEAD_LETTER'))`,
      )
      .select('COUNT(*)', 'count')
      .getRawOne<CountRow>();
  }

  private latest(scope: PurchaseSummaryScope) {
    return this.accredited(scope)
      .innerJoin(
        Institution,
        'institution',
        'institution.id = batch.ownerInstitutionId',
      )
      .select([
        'institution.name AS "institutionName"',
        'batch.fulfilledAt AS "fulfilledAt"',
        'batch.quantity AS "quantity"',
        'batch.currency AS "currency"',
        'batch.totalPrice AS "amount"',
      ])
      .orderBy('batch.fulfilledAt', 'DESC')
      .addOrderBy('batch.id', 'DESC')
      .limit(1)
      .getRawOne<LatestRow>();
  }

  private accredited(
    scope: PurchaseSummaryScope,
  ): SelectQueryBuilder<VoucherBatch> {
    return this.scoped(scope)
      .andWhere("batch.status = 'PAID'")
      .andWhere(
        `EXISTS (SELECT 1 FROM payment_event payment WHERE payment."voucherBatchId" = batch.id AND payment.status = 'APPROVED')`,
      )
      .andWhere('batch.fulfilledAt IS NOT NULL')
      .andWhere(
        '(SELECT COUNT(*) FROM vouchers voucher WHERE voucher.batch_id = batch.id) = batch.quantity',
      );
  }

  private scoped(scope: PurchaseSummaryScope) {
    const builder = this.batches.createQueryBuilder('batch');
    if (scope.scope === 'INSTITUTION')
      builder.andWhere('batch.ownerInstitutionId = :institutionId', {
        institutionId: scope.institutionId,
      });
    return builder;
  }

  private window(now: Date, days: number, periodsAgo: number) {
    const to = new Date(now.getTime() - (periodsAgo - 1) * days * 86_400_000);
    return { from: new Date(to.getTime() - days * 86_400_000), to };
  }

  private publicWindow(window: { from: Date; to: Date }, days: number) {
    return {
      from: window.from.toISOString(),
      to: window.to.toISOString(),
      days: days as 7 | 30 | 90,
    };
  }

  private metricsResponse(
    rows: MetricRow[],
    purchasingInstitutionCount?: string,
  ) {
    const totals = {
      accreditedPurchaseCount: rows.reduce(
        (sum, row) => sum + Number(row.accreditedPurchaseCount),
        0,
      ),
      accreditedVoucherCount: rows.reduce(
        (sum, row) => sum + Number(row.accreditedVoucherCount),
        0,
      ),
      accreditedAmountByCurrency: rows.map((row) => ({
        currency: row.currency,
        amount: row.amount,
      })),
    };
    return purchasingInstitutionCount === undefined
      ? totals
      : {
          ...totals,
          purchasingInstitutionCount: Number(purchasingInstitutionCount),
        };
  }

  private latestResponse(row: LatestRow, platform: boolean) {
    const value = {
      accreditedAt: row.fulfilledAt.toISOString(),
      voucherCount: Number(row.quantity),
      amount: { currency: row.currency, amount: row.amount },
    };
    return platform
      ? { ...value, institutionName: row.institutionName.trim() }
      : value;
  }
}

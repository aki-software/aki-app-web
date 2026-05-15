import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, MoreThanOrEqual, Repository } from 'typeorm';
import { Session, SessionPaymentStatus } from '../entities/session.entity.js';
import { Voucher } from '../../vouchers/entities/voucher.entity.js';
import { VoucherStatus } from '../../vouchers/entities/voucher.enums.js';
import {
  RawCountRow,
  RawTotalsRow,
  RawCompletedSessionsRow,
  RawSessionsActivityRow,
  RawTopCategoryRow,
} from '../types/dashboard.types.js';

@Injectable()
export class AdminDashboardStatsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
  ) {}

  async getVoucherTotals() {
    const [available, redeemed, historical] = await Promise.all([
      this.voucherRepository.count({
        where: { status: VoucherStatus.AVAILABLE },
      }),
      this.voucherRepository.count({ where: { status: VoucherStatus.USED } }),
      this.voucherRepository.count(),
    ]);
    return { available, redeemed, historical };
  }

  async getPeriodVoucherStats(periodStart: Date) {
    const [issued, redeemed] = await Promise.all([
      this.voucherRepository.count({
        where: { createdAt: MoreThanOrEqual(periodStart) },
      }),
      this.voucherRepository.count({
        where: {
          status: VoucherStatus.USED,
          redeemedAt: MoreThanOrEqual(periodStart),
        },
      }),
    ]);
    return { issued, redeemed };
  }

  async getHistoricalSessionTotals(): Promise<RawTotalsRow> {
    return (await this.sessionRepository
      .createQueryBuilder('session')
      .select('COUNT(*)', 'totalSessions')
      .addSelect(
        'COALESCE(SUM(COALESCE(session.totalTimeMs, 0)), 0)',
        'totalTimeMs',
      )
      .getRawOne<RawTotalsRow>()) as RawTotalsRow;
  }

  async getCompletedSessionsTotal(): Promise<RawCompletedSessionsRow> {
    return (await this.sessionRepository
      .createQueryBuilder('session')
      .innerJoin('session.results', 'result')
      .select('COUNT(DISTINCT session.id)', 'completedSessions')
      .getRawOne<RawCompletedSessionsRow>()) as RawCompletedSessionsRow;
  }

  async getPeriodBasicStats(periodStart: Date) {
    const [started, completed, reportsUnlocked] = await Promise.all([
      this.sessionRepository
        .createQueryBuilder('session')
        .where('session.createdAt >= :periodStart', { periodStart })
        .select('COUNT(*)', 'count')
        .getRawOne<RawCountRow>(),
      this.sessionRepository
        .createQueryBuilder('session')
        .innerJoin('session.results', 'result')
        .where('session.createdAt >= :periodStart', { periodStart })
        .select('COUNT(DISTINCT session.id)', 'count')
        .getRawOne<RawCountRow>(),
      this.sessionRepository
        .createQueryBuilder('session')
        .where('session.reportUnlockedAt IS NOT NULL')
        .andWhere('session.reportUnlockedAt >= :periodStart', { periodStart })
        .select('COUNT(*)', 'count')
        .getRawOne<RawCountRow>(),
    ]);

    return {
      started: this.parseIntSafe(started?.count),
      completed: this.parseIntSafe(completed?.count),
      reportsUnlocked: this.parseIntSafe(reportsUnlocked?.count),
    };
  }

  async getPeriodChannelStats(periodStart: Date) {
    const [started, completed, reportsUnlocked] = await Promise.all([
      this.sessionRepository
        .createQueryBuilder('session')
        .where('session.createdAt >= :periodStart', { periodStart })
        .andWhere(
          new Brackets((q) => {
            q.where('session.voucherId IS NOT NULL').orWhere(
              'session.paymentStatus = :voucherRedeemedStatus',
              { voucherRedeemedStatus: SessionPaymentStatus.VOUCHER_REDEEMED },
            );
          }),
        )
        .select('COUNT(*)', 'count')
        .getRawOne<RawCountRow>(),
      this.sessionRepository
        .createQueryBuilder('session')
        .innerJoin('session.results', 'result')
        .where('session.createdAt >= :periodStart', { periodStart })
        .andWhere(
          new Brackets((q) => {
            q.where('session.voucherId IS NOT NULL').orWhere(
              'session.paymentStatus = :voucherRedeemedStatus',
              { voucherRedeemedStatus: SessionPaymentStatus.VOUCHER_REDEEMED },
            );
          }),
        )
        .select('COUNT(DISTINCT session.id)', 'count')
        .getRawOne<RawCountRow>(),
      this.sessionRepository
        .createQueryBuilder('session')
        .where('session.reportUnlockedAt IS NOT NULL')
        .andWhere('session.reportUnlockedAt >= :periodStart', { periodStart })
        .andWhere(
          new Brackets((q) => {
            q.where('session.voucherId IS NOT NULL').orWhere(
              'session.paymentStatus = :voucherRedeemedStatus',
              { voucherRedeemedStatus: SessionPaymentStatus.VOUCHER_REDEEMED },
            );
          }),
        )
        .select('COUNT(*)', 'count')
        .getRawOne<RawCountRow>(),
    ]);

    return {
      started: this.parseIntSafe(started?.count),
      completed: this.parseIntSafe(completed?.count),
      reportsUnlocked: this.parseIntSafe(reportsUnlocked?.count),
    };
  }

  async getIndividualCompletedStats(periodStart: Date) {
    const row = await this.sessionRepository
      .createQueryBuilder('session')
      .innerJoin('session.results', 'result')
      .where('session.createdAt >= :periodStart', { periodStart })
      .andWhere('session.voucherId IS NULL')
      .andWhere('session.paymentStatus != :voucherRedeemedStatus', {
        voucherRedeemedStatus: SessionPaymentStatus.VOUCHER_REDEEMED,
      })
      .select('COUNT(DISTINCT session.id)', 'count')
      .getRawOne<RawCountRow>();

    return this.parseIntSafe(row?.count);
  }

  async getDailyActivity(periodStart: Date): Promise<RawSessionsActivityRow[]> {
    return await this.sessionRepository
      .createQueryBuilder('session')
      .select(
        "to_char(session.createdAt AT TIME ZONE 'UTC', 'YYYY-MM-DD')",
        'day',
      )
      .addSelect('COUNT(*)', 'count')
      .where('session.createdAt >= :periodStart', { periodStart })
      .groupBy("to_char(session.createdAt AT TIME ZONE 'UTC', 'YYYY-MM-DD')")
      .orderBy('day', 'ASC')
      .getRawMany<RawSessionsActivityRow>();
  }

  async getTopResultsDistribution(): Promise<RawTopCategoryRow[]> {
    return await this.sessionRepository.manager
      .createQueryBuilder()
      .select('UPPER(t.category_id)', 'categoryId')
      .addSelect('COUNT(*)', 'count')
      .from(
        (sub) =>
          sub
            .select('sr.category_id', 'category_id')
            .addSelect('sr.session_id', 'session_id')
            .addSelect(
              'ROW_NUMBER() OVER (PARTITION BY sr.session_id ORDER BY sr.percentage DESC)',
              'rn',
            )
            .from('session_results', 'sr'),
        't',
      )
      .where('t.rn = 1')
      .groupBy('UPPER(t.category_id)')
      .getRawMany<RawTopCategoryRow>();
  }

  private parseIntSafe(value: unknown): number {
    if (typeof value === 'number') return Math.trunc(value);
    if (typeof value === 'string') return parseInt(value, 10) || 0;
    return 0;
  }
}

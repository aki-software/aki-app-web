import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session, SessionPaymentStatus } from '../entities/session.entity.js';
import { Voucher } from '../../vouchers/entities/voucher.entity.js';
import { VoucherStatus } from '../../vouchers/entities/voucher.enums.js';
import { RawSessionsActivityRow, RawTopCategoryRow } from '@akit/contracts';

type AdminDashboardVoucherTotalsRow = {
  available: string;
  redeemed: string;
  historical: string;
};

type AdminDashboardPeriodVoucherStatsRow = {
  issued: string;
  redeemed: string;
};

type AdminDashboardSessionTotalsRow = {
  totalSessions: string;
  totalTimeMs: string;
  completedSessions: string;
};

type AdminDashboardPeriodSessionStatsRow = {
  started: string;
  completed: string;
  reportsUnlocked: string;
  voucherStarted: string;
  voucherCompleted: string;
  voucherReportsUnlocked: string;
  individualCompleted: string;
};

@Injectable()
export class AdminDashboardStatsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
  ) {}

  async getVoucherTotals(): Promise<AdminDashboardVoucherTotalsRow> {
    const row = await this.voucherRepository
      .createQueryBuilder('voucher')
      .select('COUNT(*)', 'historical')
      .addSelect(
        'COALESCE(SUM(CASE WHEN voucher.status = :availableStatus THEN 1 ELSE 0 END), 0)',
        'available',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN voucher.status = :usedStatus THEN 1 ELSE 0 END), 0)',
        'redeemed',
      )
      .setParameters({
        availableStatus: VoucherStatus.AVAILABLE,
        usedStatus: VoucherStatus.USED,
      })
      .getRawOne<AdminDashboardVoucherTotalsRow>();

    return row ?? { available: '0', redeemed: '0', historical: '0' };
  }

  async getPeriodVoucherStats(
    periodStart: Date,
  ): Promise<AdminDashboardPeriodVoucherStatsRow> {
    const row = await this.voucherRepository
      .createQueryBuilder('voucher')
      .select(
        'COALESCE(SUM(CASE WHEN voucher.createdAt >= :periodStart THEN 1 ELSE 0 END), 0)',
        'issued',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN voucher.status = :usedStatus AND voucher.redeemedAt >= :periodStart THEN 1 ELSE 0 END), 0)',
        'redeemed',
      )
      .setParameters({
        periodStart,
        usedStatus: VoucherStatus.USED,
      })
      .getRawOne<AdminDashboardPeriodVoucherStatsRow>();

    return row ?? { issued: '0', redeemed: '0' };
  }

  async getSessionTotals(): Promise<AdminDashboardSessionTotalsRow> {
    const [row] = await this.sessionRepository.manager.query(
      `
      SELECT
        (SELECT COUNT(*) FROM sessions) AS "totalSessions",
        (SELECT COALESCE(SUM(COALESCE(total_time_ms, 0)), 0) FROM sessions) AS "totalTimeMs",
        (SELECT COUNT(DISTINCT session_id) FROM session_results) AS "completedSessions"
      `,
    );

    return (
      row ?? { totalSessions: '0', totalTimeMs: '0', completedSessions: '0' }
    );
  }

  async getPeriodSessionStats(
    periodStart: Date,
  ): Promise<AdminDashboardPeriodSessionStatsRow> {
    const [row] = await this.sessionRepository.manager.query(
      `
      SELECT
        (SELECT COUNT(*) FROM sessions WHERE created_at >= $1) AS "started",
        (SELECT COUNT(DISTINCT sr.session_id)
         FROM session_results sr
         JOIN sessions s ON s.id = sr.session_id
         WHERE s.created_at >= $1) AS "completed",
        (SELECT COUNT(*)
         FROM sessions
         WHERE report_unlocked_at IS NOT NULL
           AND report_unlocked_at >= $1) AS "reportsUnlocked",
        (SELECT COUNT(*)
         FROM sessions
         WHERE created_at >= $1
           AND (voucher_id IS NOT NULL OR payment_status = $2)) AS "voucherStarted",
        (SELECT COUNT(DISTINCT sr.session_id)
         FROM session_results sr
         JOIN sessions s ON s.id = sr.session_id
         WHERE s.created_at >= $1
           AND (s.voucher_id IS NOT NULL OR s.payment_status = $2)) AS "voucherCompleted",
        (SELECT COUNT(*)
         FROM sessions
         WHERE report_unlocked_at IS NOT NULL
           AND report_unlocked_at >= $1
           AND (voucher_id IS NOT NULL OR payment_status = $2)) AS "voucherReportsUnlocked",
        (SELECT COUNT(DISTINCT sr.session_id)
         FROM session_results sr
         JOIN sessions s ON s.id = sr.session_id
         WHERE s.created_at >= $1
           AND s.voucher_id IS NULL
           AND s.payment_status != $2) AS "individualCompleted"
      `,
      [periodStart, SessionPaymentStatus.VOUCHER_REDEEMED],
    );

    return (
      row ?? {
        started: '0',
        completed: '0',
        reportsUnlocked: '0',
        voucherStarted: '0',
        voucherCompleted: '0',
        voucherReportsUnlocked: '0',
        individualCompleted: '0',
      }
    );
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
}

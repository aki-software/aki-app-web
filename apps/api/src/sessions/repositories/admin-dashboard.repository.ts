import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session, SessionPaymentStatus } from '../entities/session.entity.js';
import { Voucher } from '../../vouchers/entities/voucher.entity.js';
import { VoucherStatus } from '../../vouchers/entities/voucher.enums.js';
import {
  RawSessionsActivityRow,
  RawTopCategoryRow,
  RawRecentSessionRow,
} from '@akit/contracts';
import {
  AdminDashboardVoucherTotalsRow,
  AdminDashboardPeriodVoucherStatsRow,
  AdminDashboardSessionTotalsRow,
  AdminDashboardPeriodSessionStatsRow,
} from '../types/admin-dashboard.types.js';

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminDashboardRepository {
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

  async getRecentSessionRows(limit: number): Promise<RawRecentSessionRow[]> {
    return await this.sessionRepository
      .createQueryBuilder('session')
      .select('session.id', 'id')
      .addSelect('session.patientName', 'patientName')
      .addSelect('session.createdAt', 'createdAt')
      .addSelect('session.sessionDate', 'sessionDate')
      .addSelect('session.reportUnlockedAt', 'reportUnlockedAt')
      .addSelect('session.paidAt', 'paidAt')
      .addSelect('session.voucherId', 'voucherId')
      .addSelect('session.paymentStatus', 'paymentStatus')
      .addSelect('COUNT(result.id)', 'resultsCount')
      .leftJoin('session.results', 'result')
      .groupBy('session.id')
      .addGroupBy('session.patientName')
      .addGroupBy('session.createdAt')
      .addGroupBy('session.sessionDate')
      .addGroupBy('session.reportUnlockedAt')
      .addGroupBy('session.paidAt')
      .addGroupBy('session.voucherId')
      .addGroupBy('session.paymentStatus')
      .orderBy('session.createdAt', 'DESC')
      .limit(limit)
      .getRawMany<RawRecentSessionRow>();
  }

  async getBehavioralTrends(
    institutionId: string | undefined,
    periodStart: Date | undefined,
    periodEnd: Date | undefined,
  ): Promise<{
    selectivityDistribution: {
      selective: number;
      balanced: number;
      exploratory: number;
    };
    fatiguedCount: number;
    rushCount: number;
    totalSessions: number;
    eligibleSessions: number;
    avgReliabilityScore: number;
    dailyTrends: Array<{
      date: string;
      sessions: number;
      fatigueRate: number;
      rushRate: number;
    }>;
  }> {
    const conditions: string[] = ['sm.session_id IS NOT NULL'];
    const params: unknown[] = [];

    if (institutionId) {
      conditions.push('s.institution_id = $' + (params.length + 1));
      params.push(institutionId);
    }
    if (periodStart) {
      conditions.push('s.session_date >= $' + (params.length + 1));
      params.push(periodStart);
    }
    if (periodEnd) {
      conditions.push('s.session_date <= $' + (params.length + 1));
      params.push(periodEnd);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    // Selectivity distribution
    const [distribRow] = await this.sessionRepository.manager.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN sm.selectivity_level = 'SELECTIVE' THEN 1 ELSE 0 END), 0) AS "selective",
        COALESCE(SUM(CASE WHEN sm.selectivity_level = 'BALANCED' THEN 1 ELSE 0 END), 0) AS "balanced",
        COALESCE(SUM(CASE WHEN sm.selectivity_level = 'EXPLORATORY' THEN 1 ELSE 0 END), 0) AS "exploratory"
      FROM sessions s
      INNER JOIN session_metrics sm ON sm.session_id = s.id
      ${whereClause}
      `,
      params,
    );

    // Fatigue/rush rates + avg reliability + total counts
    const [ratesRow] = await this.sessionRepository.manager.query(
      `
      SELECT
        COUNT(*) AS "totalSessions",
        COALESCE(SUM(CASE WHEN sm.total_swipes >= 10 THEN 1 ELSE 0 END), 0) AS "eligibleSessions",
        COALESCE(AVG(sm.reliability_score) FILTER (WHERE sm.reliability_score IS NOT NULL), 0)::numeric(10,4) AS "avgReliabilityScore",
        COALESCE(SUM(CASE WHEN sm.fatigue_detected = true THEN 1 ELSE 0 END), 0) AS "fatiguedCount",
        COALESCE(SUM(CASE WHEN sm.rush_detected = true THEN 1 ELSE 0 END), 0) AS "rushCount"
      FROM sessions s
      INNER JOIN session_metrics sm ON sm.session_id = s.id
      ${whereClause}
      `,
      params,
    );

    // Daily trends
    const dailyTrends = await this.sessionRepository.manager.query(
      `
      SELECT
        to_char(s.session_date AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "date",
        COUNT(*) AS "sessions",
        CASE
          WHEN COUNT(*) FILTER (WHERE sm.total_swipes >= 10) > 0
          THEN (COUNT(*) FILTER (WHERE sm.fatigue_detected = true)::numeric
                / COUNT(*) FILTER (WHERE sm.total_swipes >= 10)::numeric)::numeric(10,4)
          ELSE 0
        END AS "fatigueRate",
        CASE
          WHEN COUNT(*) FILTER (WHERE sm.total_swipes >= 10) > 0
          THEN (COUNT(*) FILTER (WHERE sm.rush_detected = true)::numeric
                / COUNT(*) FILTER (WHERE sm.total_swipes >= 10)::numeric)::numeric(10,4)
          ELSE 0
        END AS "rushRate"
      FROM sessions s
      INNER JOIN session_metrics sm ON sm.session_id = s.id
      ${whereClause}
      GROUP BY to_char(s.session_date AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ORDER BY "date" ASC
      `,
      params,
    );

    return {
      selectivityDistribution: {
        selective: Number(distribRow?.selective ?? 0),
        balanced: Number(distribRow?.balanced ?? 0),
        exploratory: Number(distribRow?.exploratory ?? 0),
      },
      fatiguedCount: Number(ratesRow?.fatiguedCount ?? 0),
      rushCount: Number(ratesRow?.rushCount ?? 0),
      totalSessions: Number(ratesRow?.totalSessions ?? 0),
      eligibleSessions: Number(ratesRow?.eligibleSessions ?? 0),
      avgReliabilityScore: Number(ratesRow?.avgReliabilityScore ?? 0),
      dailyTrends: (dailyTrends ?? []).map((d: Record<string, unknown>) => ({
        date: d.date as string,
        sessions: Number(d.sessions),
        fatigueRate: Number(d.fatigueRate),
        rushRate: Number(d.rushRate),
      })),
    };
  }

  async getStalledSessionsCount(now: Date): Promise<number> {
    const dayAgo = new Date(now.getTime() - ONE_DAY_IN_MS);

    const countRow = await this.sessionRepository
      .createQueryBuilder('session')
      .where('session.createdAt < :dayAgo', { dayAgo })
      .andWhere((qb) => {
        const subquery = qb
          .subQuery()
          .select('1')
          .from('session_results', 'sr')
          .where('sr.session_id = session.id')
          .getQuery();
        return `NOT EXISTS (${subquery})`;
      })
      .select('COUNT(*)', 'count')
      .getRawOne<{ count: string }>();

    return parseInt(countRow?.count ?? '0', 10);
  }
}

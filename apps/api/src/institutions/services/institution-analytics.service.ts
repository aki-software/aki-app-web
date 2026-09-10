import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { CategoriesService } from '../../categories/categories.service.js';
import {
  Session,
  SessionPaymentStatus,
} from '../../sessions/entities/session.entity.js';
import { Voucher } from '../../vouchers/entities/voucher.entity.js';
import { VoucherStatus } from '../../vouchers/entities/voucher.enums.js';

@Injectable()
export class InstitutionAnalyticsService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly categoriesService: CategoriesService,
  ) {}

  async getStats(institutionId: string) {
    const [totalVouchers, usedVouchers, totalSessions, paidSessions] =
      await Promise.all([
        this.voucherRepository.count({
          where: { ownerInstitutionId: institutionId },
        }),
        this.voucherRepository.count({
          where: {
            ownerInstitutionId: institutionId,
            status: VoucherStatus.USED,
          },
        }),
        this.sessionRepository.count({
          where: {
            institutionId,
            voucherId: Not(IsNull()),
          },
        }),
        this.sessionRepository.count({
          where: {
            institutionId,
            paymentStatus: SessionPaymentStatus.VOUCHER_REDEEMED,
            voucherId: Not(IsNull()),
          },
        }),
      ]);

    return {
      totalVouchers,
      usedVouchers,
      availableVouchers: totalVouchers - usedVouchers,
      totalSessions,
      paidSessions,
      pendingSessions: totalSessions - paidSessions,
    };
  }

  async getOverview(institutionId: string, days: number) {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const periodLabel = `Últimos ${days} días`;

    const [statusCounts, totalVouchers] = await Promise.all([
      this.voucherRepository
        .createQueryBuilder('v')
        .select('v.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('v.ownerInstitutionId = :institutionId', { institutionId })
        .groupBy('v.status')
        .getRawMany<{ status: VoucherStatus; count: string }>(),
      this.voucherRepository.count({
        where: { ownerInstitutionId: institutionId },
      }),
    ]);

    const byStatus = statusCounts.reduce(
      (acc, row) => {
        acc[row.status] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<string, number>,
    );

    const [
      vouchersGeneratedPeriod,
      vouchersRedeemedPeriod,
      vouchersExpiringSoon7d,
      vouchersUnassignedAvailable,
    ] = await Promise.all([
      this.voucherRepository.count({
        where: {
          ownerInstitutionId: institutionId,
          createdAt: MoreThanOrEqual(startDate),
        },
      }),
      this.voucherRepository.count({
        where: {
          ownerInstitutionId: institutionId,
          status: VoucherStatus.USED,
          redeemedAt: MoreThanOrEqual(startDate),
        },
      }),
      this.voucherRepository.count({
        where: {
          ownerInstitutionId: institutionId,
          status: VoucherStatus.AVAILABLE,
          expiresAt: Between(now, sevenDaysFromNow),
        },
      }),
      this.voucherRepository.count({
        where: {
          ownerInstitutionId: institutionId,
          status: VoucherStatus.AVAILABLE,
          assignedPatientName: IsNull(),
        },
      }),
    ]);

    const voucherRedemptionRatePeriod =
      vouchersGeneratedPeriod > 0
        ? Math.round((vouchersRedeemedPeriod / vouchersGeneratedPeriod) * 100)
        : 0;

    const periodSessions = await this.sessionRepository.find({
      where: {
        institutionId,
        voucherId: Not(IsNull()),
        createdAt: MoreThanOrEqual(startDate),
      },
      relations: ['voucher', 'results'],
      order: { createdAt: 'DESC' },
    });

    const testsStartedPeriod = periodSessions.length;
    const testsCompletedPeriod = periodSessions.filter(
      (s) => s.hollandCode,
    ).length;
    const reportsUnlockedPeriod = periodSessions.filter(
      (s) => s.reportUnlockedAt,
    ).length;

    const channelBreakdown = {
      voucher: { started: 0, completed: 0, reportsUnlocked: 0 },
      individual: { started: 0, completed: 0, reportsUnlocked: 0 },
    };

    for (const s of periodSessions) {
      const channel =
        s.voucherId || s.paymentStatus === SessionPaymentStatus.VOUCHER_REDEEMED
          ? 'voucher'
          : 'individual';
      channelBreakdown[channel].started++;
      if (s.hollandCode) channelBreakdown[channel].completed++;
      if (s.reportUnlockedAt) channelBreakdown[channel].reportsUnlocked++;
    }

    const testsTrendMap = new Map<
      string,
      { started: number; completed: number }
    >();
    for (let i = 0; i <= days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      testsTrendMap.set(dateStr, { started: 0, completed: 0 });
    }

    for (const s of periodSessions) {
      if (s.createdAt) {
        const dateStr = s.createdAt.toISOString().split('T')[0];
        if (testsTrendMap.has(dateStr)) {
          const entry = testsTrendMap.get(dateStr)!;
          entry.started++;
          if (s.hollandCode) {
            entry.completed++;
          }
        }
      }
    }

    const testsTrend = Array.from(testsTrendMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const categories = await this.categoriesService.findAll();
    const categoryNames = new Map(
      categories.map((category) => [
        category.categoryId.toUpperCase(),
        category.title,
      ]),
    );

    const topResultsRows = await this.sessionRepository.manager
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
            .from('session_results', 'sr')
            .innerJoin('sessions', 's', 's.id = sr.session_id')
            .where('s.institution_id = :institutionId', { institutionId })
            .andWhere('s.voucher_id IS NOT NULL'),
        't',
      )
      .where('t.rn = 1')
      .groupBy('UPPER(t.category_id)')
      .getRawMany<{ categoryId: string; count: string }>();

    const resultsDistribution = topResultsRows
      .map((row) => {
        const categoryId = String(row.categoryId ?? '').toUpperCase();
        return {
          categoryId,
          name: categoryNames.get(categoryId) ?? `Categoría ${categoryId}`,
          count: parseInt(row.count, 10) || 0,
        };
      })
      .filter((item) => item.categoryId && item.count > 0)
      .sort((a, b) => b.count - a.count);

    return {
      periodDays: days,
      periodLabel,
      vouchers: {
        total: totalVouchers,
        available: byStatus[VoucherStatus.AVAILABLE] ?? 0,
        used: byStatus[VoucherStatus.USED] ?? 0,
        expired: byStatus[VoucherStatus.EXPIRED] ?? 0,
        sent: byStatus[VoucherStatus.SENT] ?? 0,
        revoked: byStatus[VoucherStatus.REVOKED] ?? 0,
        vouchersGeneratedPeriod,
        vouchersRedeemedPeriod,
        voucherRedemptionRatePeriod,
        vouchersExpiringSoon7d,
        vouchersUnassignedAvailable,
      },
      tests: {
        testsStartedPeriod,
        testsCompletedPeriod,
        reportsUnlockedPeriod,
        channelBreakdown,
      },
      resultsDistribution,
      testsTrend,
    };
  }
}

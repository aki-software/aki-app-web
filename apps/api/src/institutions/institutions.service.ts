import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  MoreThanOrEqual,
  Between,
  IsNull,
} from 'typeorm';
import { Institution } from './entities/institution.entity';
import { VoucherStatus } from '../vouchers/entities/voucher.enums';
import { SessionPaymentStatus } from '../sessions/entities/session.entity';
import { Voucher } from '../vouchers/entities/voucher.entity';
import { Session } from '../sessions/entities/session.entity';

@Injectable()
export class InstitutionsService {
  constructor(
    @InjectRepository(Institution)
    private readonly institutionRepository: Repository<Institution>,
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<Institution[]> {
    return await this.institutionRepository.find({
      relations: ['responsibleTherapist'],
      order: { name: 'ASC' },
    });
  }

  async findOneOrFail(id: string): Promise<Institution> {
    return await this.institutionRepository.findOneOrFail({
      where: { id },
      relations: ['responsibleTherapist'],
    });
  }

  async create(input: {
    name: string;
    billingEmail?: string | null;
    responsibleTherapistUserId?: string | null;
  }): Promise<Institution> {
    const institution = this.institutionRepository.create({
      name: input.name.trim(),
      billingEmail: input.billingEmail?.trim() || null,
      responsibleTherapistUserId: input.responsibleTherapistUserId ?? null,
      isActive: true,
    });

    return await this.institutionRepository.save(institution);
  }

  async assignResponsibleTherapist(
    institutionId: string,
    responsibleTherapistUserId: string,
  ): Promise<Institution> {
    await this.institutionRepository.update(institutionId, {
      responsibleTherapistUserId,
    });

    return await this.institutionRepository.findOneOrFail({
      where: { id: institutionId },
      relations: ['responsibleTherapist'],
    });
  }

  async update(
    id: string,
    data: { name?: string; billingEmail?: string },
  ): Promise<Institution> {
    await this.institutionRepository.update(id, {
      name: data.name?.trim(),
      billingEmail: data.billingEmail?.trim() || null,
    });

    return await this.institutionRepository.findOneOrFail({
      where: { id },
      relations: ['responsibleTherapist'],
    });
  }

  async updateStatus(id: string, isActive: boolean): Promise<Institution> {
    await this.institutionRepository.update(id, { isActive });

    return await this.institutionRepository.findOneOrFail({
      where: { id },
      relations: ['responsibleTherapist'],
    });
  }

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
          where: { institutionId },
        }),
        this.sessionRepository.count({
          where: {
            institutionId,
            paymentStatus: SessionPaymentStatus.PAID,
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

    // ── Voucher stats (all-time by status) ─────────────────────────────────
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

    // ── Voucher period metrics ──────────────────────────────────────────────
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

    // ── Sessions in period ──────────────────────────────────────────────────
    const periodSessions = await this.sessionRepository.find({
      where: {
        institutionId,
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
      const ch =
        s.voucherId || s.paymentStatus === SessionPaymentStatus.VOUCHER_REDEEMED
          ? 'voucher'
          : 'individual';
      channelBreakdown[ch].started++;
      if (s.hollandCode) channelBreakdown[ch].completed++;
      if (s.reportUnlockedAt) channelBreakdown[ch].reportsUnlocked++;
    }

    // ── Top 10 sessions (all-time) ──────────────────────────────────────────
    const topSessions = await this.sessionRepository.find({
      where: { institutionId },
      relations: ['voucher', 'results'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

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
      topSessions: topSessions.map((s) => ({
        id: s.id,
        patientName: s.patientName,
        createdAt: s.createdAt?.toISOString() ?? null,
        sessionDate: s.sessionDate?.toISOString() ?? null,
        hollandCode: s.hollandCode ?? '',
        paymentStatus: s.paymentStatus,
        voucherCode: s.voucher?.code ?? null,
        reportUnlockedAt: s.reportUnlockedAt?.toISOString() ?? null,
        resultsCount: s.results?.length ?? 0,
      })),
    };
  }
}

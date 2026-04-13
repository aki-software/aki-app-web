import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Institution } from './entities/institution.entity';
import { VoucherStatus } from '../vouchers/entities/voucher.enums';
import { SessionPaymentStatus } from '../sessions/entities/session.entity';

@Injectable()
export class InstitutionsService {
  constructor(
    @InjectRepository(Institution)
    private readonly institutionRepository: Repository<Institution>,
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
    const totalSessionsRes = await this.dataSource.query(
      `SELECT count(*) as count FROM sessions WHERE institution_id = $1`,
      [institutionId],
    );
    const vouchersRes = await this.dataSource.query(
      `SELECT status, count(*) as count FROM vouchers WHERE owner_institution_id = $1 GROUP BY status`,
      [institutionId],
    );

    const stats = {
      totalSessions: parseInt(totalSessionsRes[0]?.count || '0', 10),
      availableVouchers: 0,
      redeemedVouchers: 0,
    };

    for (const row of vouchersRes) {
      if (row.status === 'AVAILABLE') {
        stats.availableVouchers = parseInt(row.count, 10);
      } else if (row.status === 'USED') {
        stats.redeemedVouchers = parseInt(row.count, 10);
      }
    }

    return stats;
  }

  async getOverview(institutionId: string, periodDays: number) {
    const now = new Date();
    const next7Days = new Date(now);
    next7Days.setDate(next7Days.getDate() + 7);
    const periodStart = new Date(now);
    periodStart.setHours(0, 0, 0, 0);
    periodStart.setDate(periodStart.getDate() - (periodDays - 1));

    const parseIntSafe = (value: unknown): number => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.trunc(value);
      }
      if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      return 0;
    };

    const toIso = (value: unknown): string | null => {
      if (!value) return null;
      const d = new Date(value as any);
      const ms = d.getTime();
      return Number.isFinite(ms) ? d.toISOString() : null;
    };

    const [
      voucherTotalsRows,
      vouchersIssuedPeriodRow,
      vouchersRedeemedPeriodRow,
      vouchersExpiringSoonRow,
      vouchersUnassignedAvailableRow,
      sessionsStartedPeriodRow,
      sessionsCompletedPeriodRow,
      reportsUnlockedPeriodRow,
      voucherStartedPeriodRow,
      voucherCompletedPeriodRow,
      voucherUnlockedPeriodRow,
      individualCompletedPeriodRow,
      recentSessionsRows,
    ] = await Promise.all([
      this.dataSource.query(
        `SELECT status, count(*) as count
         FROM vouchers
         WHERE owner_institution_id = $1
         GROUP BY status`,
        [institutionId],
      ),
      this.dataSource.query(
        `SELECT count(*) as count
         FROM vouchers
         WHERE owner_institution_id = $1
           AND created_at >= $2`,
        [institutionId, periodStart],
      ),
      this.dataSource.query(
        `SELECT count(*) as count
         FROM vouchers
         WHERE owner_institution_id = $1
           AND status = $2
           AND redeemed_at >= $3`,
        [institutionId, VoucherStatus.USED, periodStart],
      ),
      this.dataSource.query(
        `SELECT count(*) as count
         FROM vouchers
         WHERE owner_institution_id = $1
           AND expires_at IS NOT NULL
           AND expires_at >= $2
           AND expires_at <= $3
           AND status IN ('AVAILABLE', 'SENT')`,
        [institutionId, now, next7Days],
      ),
      this.dataSource.query(
        `SELECT count(*) as count
         FROM vouchers
         WHERE owner_institution_id = $1
           AND status = $2
           AND assigned_patient_name IS NULL
           AND assigned_patient_email IS NULL`,
        [institutionId, VoucherStatus.AVAILABLE],
      ),
      this.dataSource.query(
        `SELECT count(*) as count
         FROM sessions
         WHERE institution_id = $1
           AND created_at >= $2`,
        [institutionId, periodStart],
      ),
      this.dataSource.query(
        `SELECT count(DISTINCT s.id) as count
         FROM sessions s
         INNER JOIN session_results sr ON sr.session_id = s.id
         WHERE s.institution_id = $1
           AND s.created_at >= $2`,
        [institutionId, periodStart],
      ),
      this.dataSource.query(
        `SELECT count(*) as count
         FROM sessions
         WHERE institution_id = $1
           AND report_unlocked_at IS NOT NULL
           AND report_unlocked_at >= $2`,
        [institutionId, periodStart],
      ),
      this.dataSource.query(
        `SELECT count(*) as count
         FROM sessions
         WHERE institution_id = $1
           AND created_at >= $2
           AND (voucher_id IS NOT NULL OR payment_status = $3)`,
        [institutionId, periodStart, SessionPaymentStatus.VOUCHER_REDEEMED],
      ),
      this.dataSource.query(
        `SELECT count(DISTINCT s.id) as count
         FROM sessions s
         INNER JOIN session_results sr ON sr.session_id = s.id
         WHERE s.institution_id = $1
           AND s.created_at >= $2
           AND (s.voucher_id IS NOT NULL OR s.payment_status = $3)`,
        [institutionId, periodStart, SessionPaymentStatus.VOUCHER_REDEEMED],
      ),
      this.dataSource.query(
        `SELECT count(*) as count
         FROM sessions
         WHERE institution_id = $1
           AND report_unlocked_at IS NOT NULL
           AND report_unlocked_at >= $2
           AND (voucher_id IS NOT NULL OR payment_status = $3)`,
        [institutionId, periodStart, SessionPaymentStatus.VOUCHER_REDEEMED],
      ),
      this.dataSource.query(
        `SELECT count(DISTINCT s.id) as count
         FROM sessions s
         INNER JOIN session_results sr ON sr.session_id = s.id
         WHERE s.institution_id = $1
           AND s.created_at >= $2
           AND (s.voucher_id IS NULL AND s.payment_status != $3)`,
        [institutionId, periodStart, SessionPaymentStatus.VOUCHER_REDEEMED],
      ),
      this.dataSource.query(
        `SELECT
            s.id as id,
            s.patient_name as "patientName",
            s.created_at as "createdAt",
            s.session_date as "sessionDate",
            s.holland_code as "hollandCode",
            s.payment_status as "paymentStatus",
            s.report_unlocked_at as "reportUnlockedAt",
            v.code as "voucherCode",
            COUNT(sr.id) as "resultsCount"
         FROM sessions s
         LEFT JOIN vouchers v ON v.id = s.voucher_id
         LEFT JOIN session_results sr ON sr.session_id = s.id
         WHERE s.institution_id = $1
         GROUP BY s.id, v.code
         ORDER BY s.created_at DESC
         LIMIT 10`,
        [institutionId],
      ),
    ]);

    const voucherTotals = {
      total: 0,
      available: 0,
      used: 0,
      expired: 0,
      sent: 0,
      revoked: 0,
    };

    for (const row of voucherTotalsRows as Array<any>) {
      const status = String(row.status ?? '').toUpperCase();
      const count = parseIntSafe(row.count);
      voucherTotals.total += count;
      if (status === VoucherStatus.AVAILABLE) voucherTotals.available = count;
      else if (status === VoucherStatus.USED) voucherTotals.used = count;
      else if (status === VoucherStatus.EXPIRED) voucherTotals.expired = count;
      else if (status === VoucherStatus.SENT) voucherTotals.sent = count;
      else if (status === VoucherStatus.REVOKED) voucherTotals.revoked = count;
    }

    const vouchersGeneratedPeriod = parseIntSafe(
      (vouchersIssuedPeriodRow as any[])[0]?.count,
    );
    const vouchersRedeemedPeriod = parseIntSafe(
      (vouchersRedeemedPeriodRow as any[])[0]?.count,
    );
    const vouchersExpiringSoon7d = parseIntSafe(
      (vouchersExpiringSoonRow as any[])[0]?.count,
    );
    const vouchersUnassignedAvailable = parseIntSafe(
      (vouchersUnassignedAvailableRow as any[])[0]?.count,
    );
    const voucherRedemptionRatePeriod = vouchersGeneratedPeriod
      ? Math.round((vouchersRedeemedPeriod / vouchersGeneratedPeriod) * 100)
      : 0;

    const testsStartedPeriod = parseIntSafe(
      (sessionsStartedPeriodRow as any[])[0]?.count,
    );
    const testsCompletedPeriod = parseIntSafe(
      (sessionsCompletedPeriodRow as any[])[0]?.count,
    );
    const reportsUnlockedPeriod = parseIntSafe(
      (reportsUnlockedPeriodRow as any[])[0]?.count,
    );

    const voucherStarted = parseIntSafe(
      (voucherStartedPeriodRow as any[])[0]?.count,
    );
    const voucherCompleted = parseIntSafe(
      (voucherCompletedPeriodRow as any[])[0]?.count,
    );
    const voucherUnlocked = parseIntSafe(
      (voucherUnlockedPeriodRow as any[])[0]?.count,
    );
    const individualStarted = testsStartedPeriod - voucherStarted;
    const individualCompleted = parseIntSafe(
      (individualCompletedPeriodRow as any[])[0]?.count,
    );
    const individualUnlocked = reportsUnlockedPeriod - voucherUnlocked;

    const recentSessions = (recentSessionsRows as Array<any>).map((row) => ({
      id: String(row.id),
      patientName: String(row.patientName ?? 'Paciente sin nombre'),
      createdAt: toIso(row.createdAt),
      sessionDate: toIso(row.sessionDate) ?? toIso(row.createdAt),
      hollandCode: row.hollandCode ? String(row.hollandCode) : 'N/A',
      paymentStatus: row.paymentStatus ? String(row.paymentStatus) : 'UNKNOWN',
      voucherCode: row.voucherCode ? String(row.voucherCode) : null,
      reportUnlockedAt: toIso(row.reportUnlockedAt),
      resultsCount: parseIntSafe(row.resultsCount),
    }));

    return {
      periodDays,
      periodLabel: `Ultimos ${periodDays} dias`,
      vouchers: {
        total: voucherTotals.total,
        available: voucherTotals.available,
        used: voucherTotals.used,
        expired: voucherTotals.expired,
        sent: voucherTotals.sent,
        revoked: voucherTotals.revoked,
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
        channelBreakdown: {
          voucher: {
            started: voucherStarted,
            completed: voucherCompleted,
            reportsUnlocked: voucherUnlocked,
          },
          individual: {
            started: individualStarted,
            completed: individualCompleted,
            reportsUnlocked: individualUnlocked,
          },
        },
      },
      topSessions: recentSessions,
    };
  }
}

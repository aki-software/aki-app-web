import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Voucher } from '../vouchers/entities/voucher.entity';
import { VoucherStatus } from '../vouchers/entities/voucher.enums';
import { parseIntOrZero } from '../common/utils/parse.utils';

export type VoucherStats = {
  totalBatches: number;
  totalVouchers: number;
  availableVouchers: number;
  usedVouchers: number;
  sentVouchers: number;
  expiredVouchers: number;
  revokedVouchers: number;
  redemptionRate: number;
};

export type VoucherAlert = {
  institutionId: string;
  institutionName: string;
  availableCount: number;
  message: string;
  severity: 'warning' | 'critical';
};

type BatchCountRaw = { count: string };
type StatusCountRaw = { status: VoucherStatus; count: string };
type InstitutionAlertRaw = { id: string; name: string; count: string };

const LOW_STOCK_THRESHOLD = 3;

const STATUS_KEY_MAP: Record<VoucherStatus, keyof VoucherStats> = {
  [VoucherStatus.AVAILABLE]: 'availableVouchers',
  [VoucherStatus.USED]: 'usedVouchers',
  [VoucherStatus.SENT]: 'sentVouchers',
  [VoucherStatus.EXPIRED]: 'expiredVouchers',
  [VoucherStatus.REVOKED]: 'revokedVouchers',
};

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    private readonly dataSource: DataSource,
  ) {}

  async getVoucherStats(institutionId?: string): Promise<VoucherStats> {
    this.logger.log(
      `Calculating stats for institutionId=${institutionId ?? 'GLOBAL'}`,
    );

    try {
      const baseQb = this.voucherRepository.createQueryBuilder('voucher');

      if (institutionId) {
        baseQb.where('voucher.ownerInstitutionId = :institutionId', {
          institutionId,
        });
      }

      const [totalVouchers, batchCountRes, statusCounts] = await Promise.all([
        baseQb.clone().getCount(),
        baseQb
          .clone()
          .select('COUNT(DISTINCT voucher.batchId)', 'count')
          .getRawOne<BatchCountRaw>(),
        baseQb
          .clone()
          .select('voucher.status', 'status')
          .addSelect('COUNT(*)', 'count')
          .groupBy('voucher.status')
          .getRawMany<StatusCountRaw>(),
      ]);

      const totalBatches = parseIntOrZero(batchCountRes?.count);

      const statusStats = statusCounts.reduce((acc, row) => {
        const key = STATUS_KEY_MAP[row.status];
        if (key) acc[key] = parseIntOrZero(row.count);
        return acc;
      }, {} as Partial<VoucherStats>);

      const stats: VoucherStats = {
        totalBatches,
        totalVouchers,
        availableVouchers: 0,
        usedVouchers: 0,
        sentVouchers: 0,
        expiredVouchers: 0,
        revokedVouchers: 0,
        redemptionRate: 0,
        ...statusStats,
      };

      stats.redemptionRate =
        totalVouchers > 0
          ? Math.round((stats.usedVouchers / totalVouchers) * 100)
          : 0;

      this.logger.log(`Stats calculated: ${JSON.stringify(stats)}`);
      return stats;
    } catch (error) {
      this.logger.error('Failed to calculate voucher stats', error);
      throw error;
    }
  }

  async getVoucherAlerts(institutionId?: string): Promise<VoucherAlert[]> {
    try {
      return institutionId
        ? this.getAlertsForInstitution(institutionId)
        : this.getAlertsForAllInstitutions();
    } catch (error) {
      this.logger.error('Failed to fetch voucher alerts', error);
      throw error;
    }
  }

  private async getAlertsForInstitution(
    institutionId: string,
  ): Promise<VoucherAlert[]> {
    const [count, institution] = await Promise.all([
      this.voucherRepository.count({
        where: {
          ownerInstitutionId: institutionId,
          status: VoucherStatus.AVAILABLE,
        },
      }),
      this.dataSource.query<{ name: string }[]>(
        `SELECT name FROM institutions WHERE id = $1`,
        [institutionId],
      ),
    ]);

    if (count >= LOW_STOCK_THRESHOLD) return [];

    const institutionName = institution[0]?.name ?? 'Institución';

    return [
      {
        institutionId,
        institutionName,
        availableCount: count,
        message: `Stock bajo de vouchers: solo quedan ${count} disponibles.`,
        severity: count === 0 ? 'critical' : 'warning',
      },
    ];
  }

  private async getAlertsForAllInstitutions(): Promise<VoucherAlert[]> {
    const rows = await this.dataSource.query<InstitutionAlertRaw[]>(
      `SELECT i.id, i.name, COUNT(v.id) AS count
       FROM institutions i
       LEFT JOIN vouchers v
         ON v.owner_institution_id = i.id
        AND v.status = $1
       GROUP BY i.id, i.name
       HAVING COUNT(v.id) < $2`,
      [VoucherStatus.AVAILABLE, LOW_STOCK_THRESHOLD],
    );

    return rows.map((row) => {
      const availableCount = parseIntOrZero(row.count);
      return {
        institutionId: row.id,
        institutionName: row.name,
        availableCount,
        message: `La institución ${row.name} tiene stock bajo de vouchers (${availableCount}).`,
        severity: availableCount === 0 ? 'critical' : 'warning',
      };
    });
  }
}

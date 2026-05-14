import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Voucher } from '../vouchers/entities/voucher.entity.js';
import { VoucherStatus } from '../vouchers/entities/voucher.enums.js';
import { parseIntOrZero } from '../common/utils/parse.utils.js';
import type { VoucherStats } from './stats.types.js';

type BatchCountRaw = { count: string };
type StatusCountRaw = { status: VoucherStatus; count: string };

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
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { parseIntOrZero } from '../../common/utils/parse.utils.js';
import { Voucher } from '../../vouchers/entities/voucher.entity.js';
import { VoucherStatus } from '../../vouchers/entities/voucher.enums.js';
import type { VoucherAlert } from '../stats.types.js';

type InstitutionAlertRaw = { id: string; name: string; count: string };

const LOW_STOCK_THRESHOLD = 3;

@Injectable()
export class VoucherAlertsService {
  private readonly logger = new Logger(VoucherAlertsService.name);

  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    private readonly dataSource: DataSource,
  ) {}

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

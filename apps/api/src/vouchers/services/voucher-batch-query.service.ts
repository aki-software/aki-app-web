import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Voucher } from '../entities/voucher.entity.js';
import { ListVoucherBatchesDto } from '../dto/voucher.dto.js';
import { VoucherStatus } from '../entities/voucher.enums.js';
import {
  VOUCHER_CONFIG,
  VoucherExpirationFilter,
} from '../vouchers.constants.js';
import {
  RawVoucherBatchCountRow,
  RawVoucherBatchSummaryRow,
  VoucherBatchDetail,
  VoucherBatchSummary,
  VoucherScope,
} from '@akit/contracts';
import { VoucherAccessService } from './voucher-access.service.js';

@Injectable()
export class VoucherBatchQueryService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    private readonly accessService: VoucherAccessService,
  ) {}

  async findBatchSummaries(
    filters: ListVoucherBatchesDto,
    scope?: VoucherScope,
  ) {
    const { page, limit } = this.normalizePagination(
      filters.page,
      filters.limit,
    );
    const baseQb = this.voucherRepository
      .createQueryBuilder('voucher')
      .withDeleted()
      .leftJoin('voucher.ownerInstitution', 'ownerInstitution')
      .leftJoin('voucher.ownerUser', 'ownerUser');

    if (!this.accessService.applyScopeFilter(baseQb, scope, filters.clientId)) {
      return { data: [], count: 0, page, limit };
    }

    this.applySearchFilter(baseQb, filters.search);
    this.applyExpirationFilter(baseQb, filters.expiration);

    const count = await this.getBatchCount(baseQb);
    const rows = await this.getBatchRows(baseQb, page, limit);

    return {
      data: this.mapBatchRowsToSummary(rows),
      count,
      page,
      limit,
    };
  }

  async findBatchDetail(
    batchId: string,
    scope?: VoucherScope,
    page: number = VOUCHER_CONFIG.PAGINATION.DEFAULT_PAGE,
    limit: number = VOUCHER_CONFIG.PAGINATION.BATCH_DETAIL_DEFAULT_LIMIT,
  ): Promise<VoucherBatchDetail> {
    const safeLimit = Math.min(limit, VOUCHER_CONFIG.PAGINATION.MAX_LIMIT);
    const safePage = Math.max(VOUCHER_CONFIG.PAGINATION.DEFAULT_PAGE, page);

    const qb = this.createBaseQueryBuilder().where(
      'voucher.batchId = :batchId',
      { batchId },
    );

    if (!this.accessService.applyScopeFilter(qb, scope)) {
      throw new NotFoundException('Lote no encontrado');
    }

    // Metadata: LIMIT 1 with joins to extract batch info
    const meta = await qb.clone().limit(1).getOne();
    if (!meta) throw new NotFoundException('Lote no encontrado');

    // Paginated data + total count
    const [vouchers, total] = await qb
      .clone()
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit)
      .getManyAndCount();

    // Status aggregation across the entire batch
    const rawCounts = await qb
      .clone()
      .select('voucher.status', 'status')
      .addSelect('COUNT(*)', 'cnt')
      .groupBy('voucher.status')
      .getRawMany<{ status: string; cnt: string }>();

    let available = 0;
    let used = 0;
    let expired = 0;
    for (const r of rawCounts) {
      if (r.status === VoucherStatus.AVAILABLE) available = Number(r.cnt);
      else if (r.status === VoucherStatus.USED) used = Number(r.cnt);
      else if (r.status === VoucherStatus.EXPIRED) expired = Number(r.cnt);
    }

    return {
      batchId,
      ownerInstitutionName: meta.ownerInstitution
        ? meta.ownerInstitution.deletedAt ||
          meta.ownerInstitution.isActive === false
          ? `${meta.ownerInstitution.name} (Eliminada)`
          : meta.ownerInstitution.name
        : 'Institución no informada',
      ownerUserName: meta.ownerUser?.name ?? 'Cuenta operativa no informada',
      createdAt: meta.createdAt,
      expiresAt: meta.expiresAt,
      total,
      available,
      used,
      pending: total - used - expired,
      data: vouchers.map((v) => ({
        id: v.id,
        code: v.code,
        status: v.status,
        assignedPatientName: v.assignedPatientName,
        assignedPatientEmail: v.assignedPatientEmail,
        redeemedSessionId: v.redeemedSessionId,
        createdAt: v.createdAt,
        redeemedAt: v.redeemedAt,
        expiresAt: v.expiresAt,
      })),
      count: total,
      page: safePage,
      limit: safeLimit,
    };
  }

  private createBaseQueryBuilder() {
    return this.voucherRepository
      .createQueryBuilder('voucher')
      .withDeleted()
      .leftJoinAndSelect('voucher.ownerUser', 'ownerUser')
      .leftJoinAndSelect('voucher.ownerInstitution', 'ownerInstitution')
      .leftJoinAndSelect('voucher.redeemedSession', 'redeemedSession')
      .orderBy('voucher.createdAt', 'DESC');
  }

  private async getBatchCount(
    qb: SelectQueryBuilder<Voucher>,
  ): Promise<number> {
    const countRow = await qb
      .clone()
      .select('COUNT(DISTINCT voucher.batchId)', 'count')
      .getRawOne<RawVoucherBatchCountRow>();
    return Number.parseInt(countRow?.count ?? '0', 10) || 0;
  }

  private async getBatchRows(
    qb: SelectQueryBuilder<Voucher>,
    page: number,
    limit: number,
  ) {
    return qb
      .clone()
      .select('voucher.batchId', 'batch_id')
      .addSelect(
        "COALESCE(MAX(CASE WHEN ownerInstitution.deletedAt IS NOT NULL OR ownerInstitution.isActive = false THEN CONCAT(ownerInstitution.name, ' (Eliminada)') ELSE ownerInstitution.name END), 'Institución no informada')",
        'ownerInstitutionName',
      )
      .addSelect(
        "COALESCE(MAX(ownerUser.name), 'Cuenta operativa no informada')",
        'ownerUserName',
      )
      .addSelect('MIN(voucher.createdAt)', 'batchCreatedAt')
      .addSelect('MAX(voucher.expiresAt)', 'batchExpiresAt')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        `SUM(CASE WHEN voucher.status = :available THEN 1 ELSE 0 END)`,
        'available',
      )
      .addSelect(
        `SUM(CASE WHEN voucher.status = :used THEN 1 ELSE 0 END)`,
        'used',
      )
      .addSelect(
        `SUM(CASE WHEN voucher.status = :used OR voucher.status = :expired THEN 0 ELSE 1 END)`,
        'pending',
      )
      .setParameters({
        available: VoucherStatus.AVAILABLE,
        used: VoucherStatus.USED,
        expired: VoucherStatus.EXPIRED,
      })
      .groupBy('voucher.batchId')
      .orderBy('MIN(voucher.createdAt)', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<RawVoucherBatchSummaryRow>();
  }

  private mapBatchRowsToSummary(
    rows: RawVoucherBatchSummaryRow[],
  ): VoucherBatchSummary[] {
    return rows.map((row) => ({
      batchId: row.batch_id,
      ownerInstitutionName: row.ownerInstitutionName,
      ownerUserName: row.ownerUserName,
      createdAt: row.batchCreatedAt,
      expiresAt: row.batchExpiresAt,
      total: Number.parseInt(row.total ?? '0', 10),
      available: Number.parseInt(row.available ?? '0', 10),
      used: Number.parseInt(row.used ?? '0', 10),
      pending: Number.parseInt(row.pending ?? '0', 10),
    }));
  }

  // mapVouchersToBatchDetail removed — replaced by inlined paginated logic in findBatchDetail()

  private normalizePagination(page?: number, limit?: number) {
    const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } =
      VOUCHER_CONFIG.PAGINATION;
    return {
      page: Math.max(DEFAULT_PAGE, page ?? DEFAULT_PAGE),
      limit: Math.min(Math.max(1, limit ?? DEFAULT_LIMIT), MAX_LIMIT),
    };
  }

  private applySearchFilter(qb: SelectQueryBuilder<Voucher>, search?: string) {
    const normalized = search?.trim().toLowerCase();
    if (!normalized) return;

    const pattern = `%${normalized}%`;
    qb.andWhere(
      'LOWER(voucher.code) LIKE :search OR LOWER(ownerInstitution.name) LIKE :search OR LOWER(ownerUser.name) LIKE :search',
      { search: pattern },
    );
  }

  private applyExpirationFilter(
    qb: SelectQueryBuilder<Voucher>,
    expiration?: string,
  ) {
    const normalized = expiration?.trim()?.toUpperCase();
    if (!normalized || normalized === VoucherExpirationFilter.ALL) return;

    if (normalized === VoucherExpirationFilter.EXPIRING_7D) {
      const now = new Date();
      const next7Days = new Date(
        now.getTime() + VOUCHER_CONFIG.EXPIRATION_7D_MS,
      );
      qb.andWhere('voucher.expiresAt IS NOT NULL')
        .andWhere('voucher.expiresAt >= :now', { now })
        .andWhere('voucher.expiresAt <= :next7Days', { next7Days });
    } else if (normalized === VoucherExpirationFilter.NO_EXPIRATION) {
      qb.andWhere('voucher.expiresAt IS NULL');
    }
  }
}

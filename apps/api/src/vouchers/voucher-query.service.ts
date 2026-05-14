import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  FindOptionsWhere,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { Voucher } from './entities/voucher.entity.js';
import { ListVoucherBatchesDto, ListVouchersDto } from './dto/voucher.dto.js';
import { VoucherStatus } from './entities/voucher.enums.js';
import {
  VOUCHER_CONFIG,
  VoucherExpirationFilter,
} from './vouchers.constants.js';

export type VoucherScope = {
  role?: string;
  ownerUserId?: string;
  ownerInstitutionId?: string | null;
};

export type VoucherBatchSummary = {
  batchId: string;
  ownerInstitutionName: string;
  ownerUserName: string;
  createdAt: Date | string;
  expiresAt: Date | string | null;
  total: number;
  available: number;
  used: number;
  pending: number;
};

export type VoucherBatchDetailItem = {
  id: string;
  code: string;
  status: VoucherStatus;
  assignedPatientName: string | null;
  assignedPatientEmail: string | null;
  redeemedSessionId: string | null;
  createdAt: Date | string;
  redeemedAt: Date | string | null;
  expiresAt: Date | string | null;
};

export type VoucherBatchDetail = {
  batchId: string;
  ownerInstitutionName: string;
  ownerUserName: string;
  createdAt: Date | string;
  expiresAt: Date | string | null;
  total: number;
  available: number;
  used: number;
  pending: number;
  vouchers: VoucherBatchDetailItem[];
};

type RawVoucherBatchCountRow = { count: string };
type RawVoucherBatchSummaryRow = {
  batch_id: string;
  ownerInstitutionName: string;
  ownerUserName: string;
  batchCreatedAt: Date | string;
  batchExpiresAt: Date | string | null;
  total: string;
  available: string;
  used: string;
  pending: string;
};

@Injectable()
export class VoucherQueryService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
  ) {}

  async findAllFiltered(
    filters: ListVouchersDto,
    scope?: VoucherScope,
  ): Promise<{
    data: Voucher[];
    count: number;
    page: number;
    limit: number;
  }> {
    const { page, limit } = this.normalizePagination(
      filters.page,
      filters.limit,
    );

    const qb = this.voucherRepository
      .createQueryBuilder('voucher')
      .leftJoinAndSelect('voucher.ownerUser', 'ownerUser')
      .leftJoinAndSelect('voucher.ownerInstitution', 'ownerInstitution')
      .leftJoinAndSelect('voucher.redeemedSession', 'redeemedSession')
      .orderBy('voucher.createdAt', 'DESC');

    this.applyScopeFilter(qb, scope, filters.clientId);
    this.applySearchFilter(qb, filters.search);
    this.applyStatusFilter(qb, filters.status as VoucherStatus);
    this.applyExpirationFilter(qb, filters.expiration);

    const [data, count] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, count, page, limit };
  }

  async findBatchSummaries(
    filters: ListVoucherBatchesDto,
    scope?: VoucherScope,
  ): Promise<{
    data: VoucherBatchSummary[];
    count: number;
    page: number;
    limit: number;
  }> {
    const { page, limit } = this.normalizePagination(
      filters.page,
      filters.limit,
    );

    const baseQb = this.voucherRepository
      .createQueryBuilder('voucher')
      .leftJoin('voucher.ownerInstitution', 'ownerInstitution')
      .leftJoin('voucher.ownerUser', 'ownerUser');

    this.applyScopeFilter(baseQb, scope, filters.clientId);
    this.applySearchFilter(baseQb, filters.search, true);
    this.applyExpirationFilter(baseQb, filters.expiration);

    const countRow = await baseQb
      .clone()
      .select('COUNT(DISTINCT voucher.batchId)', 'count')
      .getRawOne<RawVoucherBatchCountRow>();
    const count = Number.parseInt(String(countRow?.count ?? '0'), 10) || 0;

    const rows = await baseQb
      .clone()
      .select('voucher.batchId', 'batch_id')
      .addSelect(
        "COALESCE(MAX(ownerInstitution.name), 'Institución no informada')",
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

    const data: VoucherBatchSummary[] = (rows ?? []).map((row) => ({
      batchId: row.batch_id,
      ownerInstitutionName: row.ownerInstitutionName,
      ownerUserName: row.ownerUserName,
      createdAt: row.batchCreatedAt,
      expiresAt: row.batchExpiresAt,
      total: Number.parseInt(String(row.total ?? '0'), 10) || 0,
      available: Number.parseInt(String(row.available ?? '0'), 10) || 0,
      used: Number.parseInt(String(row.used ?? '0'), 10) || 0,
      pending: Number.parseInt(String(row.pending ?? '0'), 10) || 0,
    }));

    return { data, count, page, limit };
  }

  private normalizePagination(page?: number, limit?: number) {
    const normalizedPage = Number.isFinite(page)
      ? Math.max(VOUCHER_CONFIG.PAGINATION.DEFAULT_PAGE, page ?? 1)
      : VOUCHER_CONFIG.PAGINATION.DEFAULT_PAGE;

    const normalizedLimit = Number.isFinite(limit)
      ? Math.min(
          Math.max(1, limit ?? VOUCHER_CONFIG.PAGINATION.DEFAULT_LIMIT),
          VOUCHER_CONFIG.PAGINATION.MAX_LIMIT,
        )
      : VOUCHER_CONFIG.PAGINATION.DEFAULT_LIMIT;

    return { page: normalizedPage, limit: normalizedLimit };
  }

  buildScopedWhere(scope?: VoucherScope): FindOptionsWhere<Voucher> {
    const normalizedRole = scope?.role?.toUpperCase();

    if (normalizedRole === 'ADMIN') {
      if (scope?.ownerInstitutionId) {
        return { ownerInstitutionId: scope.ownerInstitutionId };
      }
      return {};
    }

    if (scope?.ownerInstitutionId) {
      return { ownerInstitutionId: scope.ownerInstitutionId };
    }

    if (scope?.ownerUserId) {
      return { ownerUserId: scope.ownerUserId };
    }

    return { id: VOUCHER_CONFIG.FORBIDDEN_ID } as any;
  }

  private applyScopeFilter(
    qb: SelectQueryBuilder<Voucher>,
    scope?: VoucherScope,
    clientId?: string,
  ) {
    const effectiveScope = { ...scope };
    if (clientId?.trim() && effectiveScope.role?.toUpperCase() === 'ADMIN') {
      effectiveScope.ownerInstitutionId = clientId.trim();
    }

    const where = this.buildScopedWhere(effectiveScope);

    if (where.id === VOUCHER_CONFIG.FORBIDDEN_ID) {
      qb.andWhere('voucher.id = :forbidden', {
        forbidden: VOUCHER_CONFIG.FORBIDDEN_ID,
      });
      return;
    }

    if (where.ownerInstitutionId) {
      qb.andWhere('voucher.ownerInstitutionId = :ownerInstitutionId', {
        ownerInstitutionId: where.ownerInstitutionId,
      });
    } else if (where.ownerUserId) {
      qb.andWhere('voucher.ownerUserId = :ownerUserId', {
        ownerUserId: where.ownerUserId,
      });
    }
  }

  private applySearchFilter(
    qb: SelectQueryBuilder<Voucher>,
    search?: string,
    isBatchSummary = false,
  ) {
    const normalizedSearch = search?.trim();
    if (!normalizedSearch) return;

    const pattern = `%${normalizedSearch.toLowerCase()}%`;
    qb.andWhere(
      new Brackets((inner) => {
        inner
          .where('LOWER(voucher.code) LIKE :search', { search: pattern })
          .orWhere('LOWER(CAST(voucher.batchId AS text)) LIKE :search', {
            search: pattern,
          })
          .orWhere('LOWER(ownerInstitution.name) LIKE :search', {
            search: pattern,
          })
          .orWhere('LOWER(ownerUser.name) LIKE :search', {
            search: pattern,
          });

        if (!isBatchSummary) {
          inner
            .orWhere('LOWER(CAST(voucher.status AS text)) LIKE :search', {
              search: pattern,
            })
            .orWhere(
              "LOWER(COALESCE(voucher.assignedPatientName, '')) LIKE :search",
              { search: pattern },
            )
            .orWhere(
              "LOWER(COALESCE(voucher.assignedPatientEmail, '')) LIKE :search",
              { search: pattern },
            );
        }
      }),
    );
  }

  private applyStatusFilter(
    qb: SelectQueryBuilder<Voucher>,
    status?: VoucherStatus,
  ) {
    if (status) {
      qb.andWhere('voucher.status = :status', { status });
    }
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

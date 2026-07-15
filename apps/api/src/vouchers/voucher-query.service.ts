import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  Repository,
  type SelectQueryBuilder,
  type FindOptionsWhere,
} from 'typeorm';
import { Voucher } from './entities/voucher.entity.js';
import { ListVouchersDto, ListVoucherBatchesDto } from './dto/voucher.dto.js';
import { VoucherStatus } from './entities/voucher.enums.js';
import {
  VOUCHER_CONFIG,
  VoucherExpirationFilter,
} from './vouchers.constants.js';
import { VoucherScope } from '@akit/contracts';
import { VoucherAccessService } from './services/voucher-access.service.js';

@Injectable()
export class VoucherQueryService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    private readonly accessService: VoucherAccessService,
  ) {}

  buildScopedWhere(scope?: VoucherScope): FindOptionsWhere<Voucher> | null {
    return this.accessService.buildScopedWhere(scope);
  }

  async findBatchSummaries(query: ListVoucherBatchesDto, scope?: VoucherScope) {
    const { page, limit } = this.normalizePagination(query.page, query.limit);

    const qb = this.voucherRepository
      .createQueryBuilder('voucher')
      .select('voucher.batchId', 'batchId')
      .addSelect('voucher.ownerType', 'ownerType')
      .addSelect('voucher.ownerUserId', 'ownerUserId')
      .addSelect('voucher.ownerInstitutionId', 'ownerInstitutionId')
      .addSelect('COUNT(voucher.id)', 'totalCount')
      .addSelect(
        "COUNT(CASE WHEN voucher.status = 'USED' THEN 1 END)",
        'usedCount',
      )
      .addSelect('MAX(voucher.createdAt)', 'createdAt')
      .addSelect('MAX(voucher.expiresAt)', 'expiresAt')
      .groupBy('voucher.batchId')
      .addGroupBy('voucher.ownerType')
      .addGroupBy('voucher.ownerUserId')
      .addGroupBy('voucher.ownerInstitutionId')
      .orderBy('MAX(voucher.createdAt)', 'DESC');

    if (!this.accessService.applyScopeFilter(qb, scope, query.clientId)) {
      return { data: [], count: 0, page, limit };
    }

    const rawData = await qb
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<Record<string, unknown>>();

    const count = await qb.getCount();

    return { data: rawData, count, page, limit };
  }

  async findBatchDetail(batchId: string, scope?: VoucherScope) {
    const qb = this.voucherRepository
      .createQueryBuilder('voucher')
      .withDeleted()
      .leftJoinAndSelect('voucher.ownerUser', 'ownerUser')
      .leftJoinAndSelect('voucher.ownerInstitution', 'ownerInstitution')
      .where('voucher.batchId = :batchId', { batchId });

    if (!this.accessService.applyScopeFilter(qb, scope)) {
      throw new NotFoundException('Lote no encontrado');
    }

    const vouchers = await qb.getMany();
    if (vouchers.length === 0) {
      throw new NotFoundException('Lote no encontrado');
    }

    return {
      batchId,
      vouchers,
      totalCount: vouchers.length,
      usedCount: vouchers.filter((v) => v.status === VoucherStatus.USED).length,
    };
  }

  async findAllFiltered(filters: ListVouchersDto, scope?: VoucherScope) {
    const { page, limit } = this.normalizePagination(
      filters.page,
      filters.limit,
    );
    const qb = this.voucherRepository
      .createQueryBuilder('voucher')
      .withDeleted()
      .leftJoinAndSelect('voucher.ownerUser', 'ownerUser')
      .leftJoinAndSelect('voucher.ownerInstitution', 'ownerInstitution')
      .leftJoinAndSelect('voucher.redeemedSession', 'redeemedSession')
      .orderBy('voucher.createdAt', 'DESC');

    if (!this.accessService.applyScopeFilter(qb, scope, filters.clientId)) {
      return { data: [], count: 0, page, limit };
    }

    this.applySearchFilter(qb, filters.search);
    this.applyStatusFilter(qb, filters.status);
    this.applyExpirationFilter(qb, filters.expiration);

    const [data, count] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, count, page, limit };
  }

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
      new Brackets((inner) => {
        inner
          .where('LOWER(voucher.code) LIKE :search', { search: pattern })
          .orWhere('LOWER(CAST(voucher.batchId AS text)) LIKE :search', {
            search: pattern,
          })
          .orWhere('LOWER(ownerInstitution.name) LIKE :search', {
            search: pattern,
          })
          .orWhere('LOWER(ownerUser.name) LIKE :search', { search: pattern })
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
      }),
    );
  }

  private applyStatusFilter(
    qb: SelectQueryBuilder<Voucher>,
    status?: VoucherStatus,
  ) {
    if (status) qb.andWhere('voucher.status = :status', { status });
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

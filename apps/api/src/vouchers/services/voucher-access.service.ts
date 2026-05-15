import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder, FindOptionsWhere } from 'typeorm';
import { Voucher } from '../entities/voucher.entity.js';
import { VoucherScope } from '../types/voucher-query.types.js';

@Injectable()
export class VoucherAccessService {
  /**
   * Applies scope-based filtering to a QueryBuilder instance.
   * Returns false if access should be denied entirely.
   */
  applyScopeFilter(
    qb: SelectQueryBuilder<Voucher>,
    scope?: VoucherScope,
    clientId?: string,
  ): boolean {
    const effectiveScope = { ...scope };
    const isAdmin = effectiveScope.role?.toUpperCase() === 'ADMIN';

    if (clientId?.trim() && isAdmin) {
      effectiveScope.ownerInstitutionId = clientId.trim();
    }

    const where = this.buildScopedWhere(effectiveScope);
    if (!where) return false;

    if (where.ownerInstitutionId) {
      qb.andWhere('voucher.ownerInstitutionId = :ownerInstitutionId', {
        ownerInstitutionId: where.ownerInstitutionId,
      });
    } else if (where.ownerUserId) {
      qb.andWhere('voucher.ownerUserId = :ownerUserId', {
        ownerUserId: where.ownerUserId,
      });
    }
    return true;
  }

  /**
   * Translates a VoucherScope into TypeORM FindOptionsWhere.
   */
  buildScopedWhere(scope?: VoucherScope): FindOptionsWhere<Voucher> | null {
    const role = scope?.role?.toUpperCase();
    const instId = scope?.ownerInstitutionId;
    const userId = scope?.ownerUserId;

    if (role === 'ADMIN') return instId ? { ownerInstitutionId: instId } : {};
    if (instId) return { ownerInstitutionId: instId };
    if (userId) return { ownerUserId: userId };

    return null;
  }
}

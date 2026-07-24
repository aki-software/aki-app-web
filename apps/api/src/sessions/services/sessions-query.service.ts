import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  type FindOptionsWhere,
  Repository,
  In,
  Not,
  IsNull,
  SelectQueryBuilder,
} from 'typeorm';
import { Session } from '../entities/session.entity.js';
import { SessionScope } from '../types/session-scope.type.js';
import { VoucherScope } from '../../vouchers/types/voucher-query.types.js';
import { SESSION_CONSTANTS } from '../constants/sessions.constants.js';
import { TriageResponse } from '@akit/contracts';
import { UserRole } from '../../users/entities/user.entity.js';

const UNAUTHORIZED_FALLBACK_ID = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class SessionsQueryService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  private applyScope(scope?: SessionScope): FindOptionsWhere<Session> {
    const where: FindOptionsWhere<Session> = {};

    if (!scope) return where;

    const hasAuth = !!(
      scope.role ||
      scope.institutionId ||
      scope.therapistUserId ||
      scope.patientId
    );

    if (!hasAuth) return where;

    const role = scope.role as UserRole;

    if (role === UserRole.ADMIN) {
      where.voucherId = IsNull();
      return where;
    }

    if (role === UserRole.PATIENT) {
      where.patientId = scope.patientId;
      return where;
    }

    if (scope.institutionId) {
      where.institutionId = scope.institutionId;
      where.voucherId = Not(IsNull());
      return where;
    }

    if (scope.therapistUserId) {
      where.therapistUserId = scope.therapistUserId;
      where.voucherId = Not(IsNull());
      return where;
    }

    where.id = UNAUTHORIZED_FALLBACK_ID;
    return where;
  }

  async findAll(
    page: number = SESSION_CONSTANTS.PAGINATION.DEFAULT_PAGE,
    limit: number = SESSION_CONSTANTS.PAGINATION.DEFAULT_LIMIT,
    scope?: SessionScope,
  ): Promise<{ data: Session[]; count: number }> {
    const where = this.applyScope(scope);

    const [data, count] = await this.sessionRepository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['results', 'voucher'],
    });

    return { data, count };
  }

  async findOne(id: string, scope?: SessionScope): Promise<Session> {
    const where = { ...this.applyScope(scope), id };

    const session = await this.sessionRepository.findOne({
      where,
      relations: ['results', 'voucher', 'swipes', 'metrics'],
    });
    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    return session;
  }

  async findOneForReport(id: string, scope?: SessionScope): Promise<Session> {
    const where = this.applyScope(scope);

    const query = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.results', 'results')
      .leftJoinAndSelect('session.swipes', 'swipes')
      .leftJoinAndSelect('session.voucher', 'voucher')
      .where('session.id = :id', { id })
      .addOrderBy('results.percentage', 'DESC')
      .addOrderBy('results.weightedScore', 'DESC')
      .addOrderBy('results.categoryId', 'ASC');

    if (where.institutionId) {
      query.andWhere('session.institutionId = :institutionId', {
        institutionId: where.institutionId,
      });
    }
    if (where.therapistUserId) {
      query.andWhere('session.therapistUserId = :therapistUserId', {
        therapistUserId: where.therapistUserId,
      });
    }
    if (where.patientId) {
      query.andWhere('session.patientId = :patientId', {
        patientId: where.patientId,
      });
    }

    const session = await query.getOne();
    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    return session;
  }

  async findTriage(
    page: number = SESSION_CONSTANTS.PAGINATION.DEFAULT_PAGE,
    limit: number = SESSION_CONSTANTS.PAGINATION.DEFAULT_LIMIT,
    scope?: SessionScope,
  ): Promise<TriageResponse> {
    const qb = this.sessionRepository
      .createQueryBuilder('session')
      .innerJoinAndSelect('session.metrics', 'metrics')
      .select([
        'session.id',
        'session.patientName',
        'session.sessionDate',
        'session.hollandCode',
        'session.totalTimeMs',
        'metrics.reliabilityLevel',
        'metrics.fatigueDetected',
        'metrics.rushDetected',
        'metrics.likeRatio',
        'metrics.selectivityLevel',
      ]);

    if (scope) {
      const role = scope.role as UserRole;
      if (role !== UserRole.ADMIN) {
        if (role === UserRole.PATIENT && scope.patientId) {
          qb.andWhere('session.patientId = :patientId', {
            patientId: scope.patientId,
          });
        } else if (scope.therapistUserId) {
          qb.andWhere('session.therapistUserId = :therapistUserId', {
            therapistUserId: scope.therapistUserId,
          });
        } else if (scope.institutionId) {
          qb.andWhere('session.institutionId = :institutionId', {
            institutionId: scope.institutionId,
          });
        }
      }
    }

    qb.addOrderBy(
      "CASE WHEN metrics.reliability_level = 'Baja' THEN 0 WHEN metrics.fatigue_detected = true THEN 1 WHEN metrics.rush_detected = true THEN 2 ELSE 3 END",
      'ASC',
    );
    qb.addOrderBy('session.session_date', 'DESC');

    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [sessions, total] = await qb.getManyAndCount();

    let flaggedCount = 0;
    const data = sessions.map((session) => {
      const flags: Array<'LOW_RELIABILITY' | 'FATIGUE' | 'RUSH'> = [];
      if (session.metrics?.reliabilityLevel === 'Baja') {
        flags.push('LOW_RELIABILITY');
      }
      if (session.metrics?.fatigueDetected) {
        flags.push('FATIGUE');
      }
      if (session.metrics?.rushDetected) {
        flags.push('RUSH');
      }
      if (flags.length > 0) flaggedCount++;

      return {
        sessionId: session.id,
        patientName: session.patientName,
        sessionDate: session.sessionDate.toISOString(),
        hollandCode: session.hollandCode,
        reliabilityLevel: session.metrics?.reliabilityLevel ?? null,
        flags,
        topFlag: flags[0] ?? null,
        likeRatio: session.metrics?.likeRatio ?? null,
        selectivityLevel: session.metrics?.selectivityLevel ?? null,
        totalTimeMs: Number(session.totalTimeMs),
      };
    });

    return {
      data,
      meta: { total, page, limit, flaggedCount },
    };
  }

  async findByPaymentToken(token: string): Promise<Session | null> {
    return await this.sessionRepository.findOne({
      where: { paymentReference: token },
    });
  }

  async findByIds(ids: string[]): Promise<Session[]> {
    return await this.sessionRepository.find({
      where: { id: In(ids) },
    });
  }

  private applyVoucherOwnership(
    qb: SelectQueryBuilder<Session>,
    scope: VoucherScope,
  ): void {
    if (scope.role === UserRole.ADMIN) return;

    if (scope.ownerInstitutionId) {
      qb.andWhere('session.institutionId = :institutionId', {
        institutionId: scope.ownerInstitutionId,
      });
      return;
    }

    if (scope.ownerUserId) {
      qb.andWhere('session.therapistUserId = :userId', {
        userId: scope.ownerUserId,
      });
    }
  }

  async findVoucherSessions(
    voucherId: string,
    scope: VoucherScope,
    filters?: {
      startDate?: string;
      endDate?: string;
      minDuration?: string;
      maxDuration?: string;
    },
  ): Promise<Session[]> {
    const qb = this.sessionRepository
      .createQueryBuilder('session')
      .where('session.voucherId = :voucherId', { voucherId });

    this.applyVoucherOwnership(qb, scope);

    if (filters?.startDate) {
      qb.andWhere('session.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }
    if (filters?.endDate) {
      qb.andWhere('session.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }
    if (filters?.minDuration) {
      qb.andWhere('session.totalTimeMs >= :minDuration', {
        minDuration: parseInt(filters.minDuration, 10),
      });
    }
    if (filters?.maxDuration) {
      qb.andWhere('session.totalTimeMs <= :maxDuration', {
        maxDuration: parseInt(filters.maxDuration, 10),
      });
    }

    return await qb.orderBy('session.createdAt', 'DESC').getMany();
  }
}

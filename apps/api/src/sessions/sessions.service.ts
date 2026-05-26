import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type FindOptionsWhere, Repository, In, DataSource } from 'typeorm';
import { CreateSessionDto } from './dto/create-session.dto.js';
import { Session } from './entities/session.entity.js';

import { ReportOrchestratorService } from './services/report-orchestrator.service.js';
import type { QueueAdapter } from '../common/adapters/queue.adapter.js';
import { QUEUE_ADAPTER } from '../common/constants/adapters.constants.js';
import { SessionMetricsService } from './services/session-metrics.service.js';
import { SessionScope } from './types/session-scope.type.js';
import { VoucherScope } from '../vouchers/types/voucher-query.types.js';

import { SESSION_CONSTANTS } from './constants/sessions.constants.js';
import { SessionPaymentStatus } from '@akit/contracts';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,

    private readonly reportOrchestratorService: ReportOrchestratorService,
    private readonly sessionMetricsService: SessionMetricsService,
    @Inject(QUEUE_ADAPTER)
    private readonly queueAdapter: QueueAdapter,
    private readonly dataSource: DataSource,
  ) {}

  private toIso(...values: Array<Date | string | null | undefined>): string {
    for (const value of values) {
      if (!value) continue;
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
    return new Date(0).toISOString();
  }

  private applyScope(scope?: SessionScope): FindOptionsWhere<Session> {
    const where: FindOptionsWhere<Session> = {};

    if (scope) {
      if (scope.institutionId) {
        where.institutionId = scope.institutionId;
      } else if (scope.therapistUserId) {
        where.therapistUserId = scope.therapistUserId;
      } else if (scope.patientId && scope.role?.toUpperCase() === 'PATIENT') {
        where.patientId = scope.patientId;
      }
    }

    return where;
  }

  async create(
    createSessionDto: CreateSessionDto,
    options?: { idempotencyKey?: string },
  ): Promise<{ session: Session; duplicated: boolean }> {
    const idempotencyKey = options?.idempotencyKey?.trim();
    if (idempotencyKey) {
      const existing = await this.sessionRepository.findOne({
        where: { syncKey: idempotencyKey },
      });
      if (existing) {
        return { session: existing, duplicated: true };
      }
    }

    const session = this.sessionRepository.create({
      ...createSessionDto,
      syncKey: idempotencyKey ?? null,
    });

    let savedSession: Session;
    try {
      savedSession = await this.sessionRepository.save(session);
    } catch {
      if (idempotencyKey) {
        const existing = await this.sessionRepository.findOne({
          where: { syncKey: idempotencyKey },
        });
        if (existing) {
          return { session: existing, duplicated: true };
        }
      }
      throw new ConflictException('No se pudo crear la sesión');
    }
    try {
      await this.sessionMetricsService.calculateAndSaveMetrics(savedSession.id);
    } catch (error: unknown) {
      this.logger.warn(
        `Failed to calculate metrics for session ${savedSession.id}:`,
        error,
      );
    }

    return { session: savedSession, duplicated: false };
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
      relations: ['results', 'voucher', 'swipes'],
    });
    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    return session;
  }

  async update(
    id: string,
    updateSessionDto: Partial<CreateSessionDto>,
    scope?: SessionScope,
  ): Promise<Session> {
    const session = await this.findOne(id, scope);
    Object.assign(session, updateSessionDto);
    return await this.sessionRepository.save(session);
  }

  async remove(id: string, scope?: SessionScope): Promise<void> {
    const session = await this.findOne(id, scope);
    await this.sessionRepository.remove(session);
  }

  async findByIds(ids: string[]): Promise<Session[]> {
    return await this.sessionRepository.find({
      where: { id: In(ids) },
    });
  }

  async sendReport(
    id: string,
    email: string,
    customTitle: string | null,
    scope: SessionScope,
  ): Promise<{ success: boolean; message: string }> {
    const session = await this.findOne(id, scope);
    const result = await this.reportOrchestratorService.sendReport(
      session.id,
      email,
      null,
      scope,
    );
    return {
      success: result.success,
      message: result.message,
    };
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

    if (scope.role !== 'ADMIN') {
      if (scope.ownerInstitutionId) {
        qb.andWhere('session.institutionId = :institutionId', {
          institutionId: scope.ownerInstitutionId,
        });
      } else if (scope.ownerUserId) {
        qb.andWhere('session.therapistUserId = :userId', {
          userId: scope.ownerUserId,
        });
      }
    }

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

  async updatePaymentStatus(
    id: string,
    status: SessionPaymentStatus,
    reference?: string,
  ): Promise<Session> {
    const session = await this.findOne(id);
    session.paymentStatus = status;
    if (reference) {
      session.paymentReference = reference;
    }
    if (status === SessionPaymentStatus.PAID) {
      session.paidAt = new Date();
      session.reportUnlockedAt = new Date();
    }
    return await this.sessionRepository.save(session);
  }

  protected _isUuid(value?: string | null): value is string {
    if (!value) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}

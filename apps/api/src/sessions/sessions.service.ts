import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  type FindOptionsWhere,
  Repository,
  In,
  Not,
  IsNull,
  SelectQueryBuilder,
  QueryFailedError,
  DataSource,
} from 'typeorm';
import { CreateSessionDto } from './dto/create-session.dto.js';
import { Session } from './entities/session.entity.js';
import { SessionResult } from './entities/session-result.entity.js';
import { SessionSwipe } from './entities/session-swipe.entity.js';
import { ReportOrchestratorService } from './services/report-orchestrator.service.js';
import type { QueueAdapter } from '../common/adapters/queue.adapter.js';
import { QUEUE_ADAPTER } from '../common/constants/adapters.constants.js';
import { JobNames } from '../common/jobs/job-names.js';
import { SessionScope } from './types/session-scope.type.js';
import { VoucherScope } from '../vouchers/types/voucher-query.types.js';
import { CompleteSessionDto } from './dto/complete-session.dto.js';
import { SessionOwnerResolverService } from './services/session-owner-resolver.service.js';
import { VouchersService } from '../vouchers/vouchers.service.js';
import { mapToCreateDto } from './utils/session-payload-mapper.util.js';
import { buildSyncKey } from './utils/session-sync-key.util.js';
import { SESSION_CONSTANTS } from './constants/sessions.constants.js';
import { SessionPaymentStatus, TriageResponse } from '@akit/contracts';
import { UserRole } from '../users/entities/user.entity.js';

const UNAUTHORIZED_FALLBACK_ID = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(SessionResult)
    private readonly sessionResultRepository: Repository<SessionResult>,
    @InjectRepository(SessionSwipe)
    private readonly sessionSwipeRepository: Repository<SessionSwipe>,
    private readonly dataSource: DataSource,
    private readonly reportOrchestratorService: ReportOrchestratorService,
    @Inject(QUEUE_ADAPTER)
    private readonly queueAdapter: QueueAdapter,
    private readonly ownerResolver: SessionOwnerResolverService,
    private readonly vouchersService: VouchersService,
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

  async create(
    createSessionDto: CreateSessionDto,
    options?: { idempotencyKey?: string },
  ): Promise<{ session: Session; duplicated: boolean }> {
    const idempotencyKey = options?.idempotencyKey?.trim();

    const existing = idempotencyKey
      ? await this.sessionRepository.findOne({
          where: { syncKey: idempotencyKey },
        })
      : null;

    if (existing) return { session: existing, duplicated: true };

    // Excluir el `id` del DTO: si el cliente envía su propio UUID (sync desde Android),
    // TypeORM lo trataría como un UPDATE en lugar de INSERT.
    // El id del cliente se conserva como syncKey para idempotencia.
    const {
      id: _clientId,
      results: resultsDto,
      swipes: swipesDto,
      ...sessionFields
    } = createSessionDto;
    void _clientId; // prevent unused var warning

    let savedSession: Session;
    try {
      savedSession = await this.dataSource.transaction(async (manager) => {
        // 1. Insertar la sesión sin relaciones para evitar el bug de cascade
        const session = manager.create(Session, {
          ...sessionFields,
          syncKey: idempotencyKey ?? null,
        });
        const inserted = await manager.save(Session, session);

        // 2. Insertar results y swipes manualmente con el sessionId correcto
        if (resultsDto?.length) {
          const results = resultsDto.map((r) =>
            manager.create(SessionResult, { ...r, session: inserted }),
          );
          await manager.save(SessionResult, results);
        }

        if (swipesDto?.length) {
          const swipes = swipesDto.map((s) =>
            manager.create(SessionSwipe, { ...s, session: inserted }),
          );
          await manager.save(SessionSwipe, swipes);
        }

        return inserted;
      });
    } catch (err) {
      this.logger.error('Error saving session:', err);

      // Race condition: otra request guardó con el mismo syncKey entre el findOne y el save
      if (idempotencyKey && err instanceof QueryFailedError) {
        const recovered = await this.sessionRepository.findOne({
          where: { syncKey: idempotencyKey },
        });
        if (recovered) return { session: recovered, duplicated: true };
      }

      throw new ConflictException(
        `No se pudo crear la sesión: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    this.queueAdapter
      .enqueue(
        JobNames.CalculateMetrics,
        { sessionId: savedSession.id },
        { delayMs: 2000 },
      )
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Failed to enqueue calculate-metrics for session ${savedSession.id}: ${msg}`,
        );
      });

    return { session: savedSession, duplicated: false };
  }

  async completeSession(
    payload: CompleteSessionDto,
  ): Promise<{ id: string; duplicated: boolean }> {
    const payloadUserId = payload.userId?.trim() || null;
    const payloadTherapistUserId = payload.therapistUserId?.trim() || null;
    const payloadInstitutionId = payload.institutionId?.trim() || null;
    const payloadVoucherCode = payload.voucherCode?.trim() || null;
    const payloadId = payload.id?.trim() || null;

    const context = await this.ownerResolver.resolveContext(
      payloadUserId,
      payloadVoucherCode,
      payloadTherapistUserId,
      payloadInstitutionId,
      payload.patientName,
    );

    const createSessionDto = mapToCreateDto(payload, context);

    const syncKey = buildSyncKey(payloadId, payloadUserId, payload.startedAt);

    const { session, duplicated } = await this.create(createSessionDto, {
      idempotencyKey: syncKey ?? undefined,
    });

    if (context.voucher?.code) {
      await this.vouchersService.attachVoucherToSession(
        context.voucher.code,
        session.id,
        context.inferredPatientName,
      );
    }

    return { id: session.id, duplicated };
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
    if (scope?.role === UserRole.PATIENT) {
      delete where.patientId;
    }

    const session = await this.sessionRepository.findOne({
      where,
      relations: ['results', 'voucher', 'swipes', 'metrics'],
    });
    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    return session;
  }

  /**
   * Carga una sesión con results ordenados por el criterio del motor psicométrico.
   * Usar EXCLUSIVAMENTE para generar reportes (PDF / email).
   * Los joins sin ORDER BY en SQL no garantizan orden.
   */
  async findOneForReport(id: string, scope?: SessionScope): Promise<Session> {
    const where = this.applyScope(scope);
    if (scope?.role === UserRole.PATIENT) {
      delete where.patientId;
    }

    const query = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.results', 'results')
      .leftJoinAndSelect('session.swipes', 'swipes')
      .leftJoinAndSelect('session.voucher', 'voucher')
      .where('session.id = :id', { id })
      // Garantizar el orden del motor psicométrico: SQL no garantiza orden en JOINs.
      // percentage DESC → weighted_score DESC → category_id ASC
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

    // Apply scope for QueryBuilder
    if (scope) {
      const role = scope.role as UserRole;
      if (role === UserRole.ADMIN) {
        // Admin sees all sessions — no filter
      } else if (role === UserRole.PATIENT && scope.patientId) {
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

    // Severity ordering: LOW_RELIABILITY > FATIGUE > RUSH > none
    qb.addOrderBy(
      `CASE
        WHEN metrics.reliability_level = 'Baja' THEN 0
        WHEN metrics.fatigue_detected = true THEN 1
        WHEN metrics.rush_detected = true THEN 2
        ELSE 3
      END`,
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
    force?: boolean,
  ): Promise<{ success: boolean; message: string }> {
    const session = await this.findOne(id, scope);
    const result = await this.reportOrchestratorService.sendReport(
      session.id,
      email,
      null,
      scope,
      force,
    );
    return {
      success: result.success,
      message: result.message,
    };
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

  async updatePaymentStatus(
    id: string,
    status: SessionPaymentStatus,
    reference?: string,
  ): Promise<Session> {
    const now = new Date();

    const updateFields: Record<string, unknown> = { paymentStatus: status };
    if (reference) {
      updateFields.paymentReference = reference;
    }
    if (status === SessionPaymentStatus.PAID) {
      updateFields.paidAt = now;
      updateFields.reportUnlockedAt = now;
    }

    await this.sessionRepository
      .createQueryBuilder()
      .update(Session)
      .set(updateFields)
      .where('id = :id', { id })
      .execute();

    return this.findOne(id);
  }
}

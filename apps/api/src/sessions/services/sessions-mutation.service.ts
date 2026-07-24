import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError, DataSource } from 'typeorm';
import { CreateSessionDto } from '../dto/create-session.dto.js';
import { Session } from '../entities/session.entity.js';
import { SessionResult } from '../entities/session-result.entity.js';
import { SessionSwipe } from '../entities/session-swipe.entity.js';
import type { QueueAdapter } from '../../common/adapters/queue.adapter.js';
import { QUEUE_ADAPTER } from '../../common/constants/adapters.constants.js';
import { JobNames } from '../../common/jobs/job-names.js';
import { SessionScope } from '../types/session-scope.type.js';
import { CompleteSessionDto } from '../dto/complete-session.dto.js';
import { SessionOwnerResolverService } from './session-owner-resolver.service.js';
import { VouchersService } from '../../vouchers/vouchers.service.js';
import { mapToCreateDto } from '../utils/session-payload-mapper.util.js';
import { buildSyncKey } from '../utils/session-sync-key.util.js';
import { SessionPaymentStatus } from '@akit/contracts';
import { SessionsQueryService } from './sessions-query.service.js';

@Injectable()
export class SessionsMutationService {
  private readonly logger = new Logger(SessionsMutationService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly dataSource: DataSource,
    @Inject(QUEUE_ADAPTER)
    private readonly queueAdapter: QueueAdapter,
    private readonly ownerResolver: SessionOwnerResolverService,
    private readonly vouchersService: VouchersService,
    private readonly sessionsQueryService: SessionsQueryService,
  ) {}

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

    const {
      id: _clientId,
      results: resultsDto,
      swipes: swipesDto,
      ...sessionFields
    } = createSessionDto;
    void _clientId;

    let savedSession: Session;
    try {
      savedSession = await this.dataSource.transaction(async (manager) => {
        const session = manager.create(Session, {
          ...sessionFields,
          syncKey: idempotencyKey ?? null,
        });
        const inserted = await manager.save(Session, session);

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

  async update(
    id: string,
    updateSessionDto: Partial<CreateSessionDto>,
    scope?: SessionScope,
  ): Promise<Session> {
    const session = await this.sessionsQueryService.findOne(id, scope);
    Object.assign(session, updateSessionDto);
    return await this.sessionRepository.save(session);
  }

  async remove(id: string, scope?: SessionScope): Promise<void> {
    const session = await this.sessionsQueryService.findOne(id, scope);
    await this.sessionRepository.remove(session);
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

    return this.sessionsQueryService.findOne(id);
  }
}

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
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
import { VoucherRedemptionService } from '../../vouchers/services/voucher-redemption.service.js';
import { mapToCreateDto } from '../utils/session-payload-mapper.util.js';
import { buildSyncKey } from '../utils/session-sync-key.util.js';
import { SessionPaymentStatus } from '@akit/contracts';
import { SessionsQueryService } from './sessions-query.service.js';

const REPORT_UNLOCK_SKU = 'report_unlock_v2';

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
    private readonly voucherRedemptionService: VoucherRedemptionService,
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
          expectedReportSku: REPORT_UNLOCK_SKU,
        });
        const inserted = await manager.save(Session, session);
        if (resultsDto?.length)
          await manager.save(
            SessionResult,
            resultsDto.map((r) =>
              manager.create(SessionResult, { ...r, session: inserted }),
            ),
          );
        if (swipesDto?.length)
          await manager.save(
            SessionSwipe,
            swipesDto.map((s) =>
              manager.create(SessionSwipe, { ...s, session: inserted }),
            ),
          );
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
    identity?: {
      userId?: string;
      email?: string;
      displayName?: string;
      institutionId?: string;
      role?: string;
      isFirebaseEmailVerified?: boolean;
    },
  ): Promise<{ id: string; duplicated: boolean }> {
    const authenticatedRole = identity?.role?.toUpperCase() || 'PATIENT';
    const authenticatedOwner = [
      'THERAPIST',
      'ADMIN',
      'INSTITUTION_ADMIN',
    ].includes(authenticatedRole ?? '');
    const authenticatedPatient = authenticatedRole === 'PATIENT';
    const isFirebaseIdentity = identity?.isFirebaseEmailVerified === true;
    const anonymousPayload = !identity?.userId
      ? {
          ...payload,
          userId: undefined,
          patientId: undefined,
          therapistUserId: undefined,
          institutionId: undefined,
        }
      : payload;
    const payloadVoucherCode = payload.voucherCode?.trim() || null;
    if (
      payloadVoucherCode &&
      (!identity?.userId ||
        !identity.email ||
        !identity.isFirebaseEmailVerified)
    ) {
      throw new BadRequestException(
        'Verified Firebase identity is required for voucher completion.',
      );
    }
    const internalUser = isFirebaseIdentity
      ? await this.resolveVerifiedFirebaseUser(identity, authenticatedPatient)
      : null;
    const trustedPayload = authenticatedOwner
      ? {
          ...payload,
          userId: internalUser?.id ?? identity?.userId,
          therapistUserId: internalUser?.id ?? identity?.userId,
          institutionId: internalUser?.institutionId ?? identity?.institutionId,
        }
      : authenticatedPatient
        ? {
            ...payload,
            userId: internalUser?.id ?? identity?.userId,
            patientId: internalUser?.id ?? identity?.userId,
            therapistUserId: undefined,
            institutionId: undefined,
          }
        : anonymousPayload;
    const payloadUserId = trustedPayload.userId?.trim() || null;
    const payloadTherapistUserId =
      trustedPayload.therapistUserId?.trim() || null;
    const payloadInstitutionId = trustedPayload.institutionId?.trim() || null;
    const payloadId = trustedPayload.id?.trim() || null;
    const context = await this.ownerResolver.resolveContext(
      payloadUserId,
      null,
      payloadTherapistUserId,
      payloadInstitutionId,
      trustedPayload.patientName,
    );
    const createSessionDto = mapToCreateDto(trustedPayload, context);
    if (payloadVoucherCode)
      createSessionDto.paymentStatus = SessionPaymentStatus.PENDING;
    const syncKey = buildSyncKey(payloadId, payloadUserId, payload.startedAt);
    if (payloadVoucherCode && !syncKey)
      throw new BadRequestException(
        'Voucher completion requires an idempotency key.',
      );
    const { session, duplicated } = await this.create(createSessionDto, {
      idempotencyKey: syncKey ?? undefined,
    });
    if (payloadVoucherCode) {
      await this.voucherRedemptionService.redeemVoucher(
        payloadVoucherCode,
        session.id,
        {
          userId: payloadUserId ?? undefined,
          email: identity?.email,
          isFirebaseEmailVerified: identity?.isFirebaseEmailVerified,
        },
      );
    }
    return { id: session.id, duplicated };
  }

  private async resolveVerifiedFirebaseUser(
    identity: {
      userId?: string;
      email?: string;
      displayName?: string;
      isFirebaseEmailVerified?: boolean;
    },
    allowPatientProvisioning: boolean,
  ): Promise<{ id: string; institutionId?: string | null }> {
    if (!identity.isFirebaseEmailVerified)
      throw new BadRequestException(
        'Verified Firebase identity is required for authenticated completion.',
      );
    const internalUser = identity.email
      ? await this.ownerResolver.resolveFirebaseUser(
          {
            uid: identity.userId,
            email: identity.email,
            displayName: identity.displayName,
          },
          allowPatientProvisioning,
        )
      : null;
    if (!internalUser)
      throw new UnauthorizedException(
        'Verified Firebase identity is not linked to an internal user.',
      );
    return internalUser;
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
    if (reference) updateFields.paymentReference = reference;
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

  async unlockReportEntitlement(
    id: string,
    purchaseToken: string,
    metadata: { providerProductId: string; expectedSku: string },
  ): Promise<void> {
    if (metadata.providerProductId !== metadata.expectedSku)
      throw new ConflictException(
        'Provider product does not match report expectation',
      );
    const result = await this.sessionRepository
      .createQueryBuilder()
      .update(Session)
      .set({
        reportUnlockedAt: new Date(),
        reportUnlockPurchaseToken: purchaseToken,
      })
      .where('id = :id', { id })
      .andWhere(
        '(report_unlock_purchase_token IS NULL OR report_unlock_purchase_token = :purchaseToken)',
        { purchaseToken },
      )
      .execute();
    if (result.affected !== 1)
      throw new ConflictException(
        'Purchase token is already associated with another report',
      );
  }
}

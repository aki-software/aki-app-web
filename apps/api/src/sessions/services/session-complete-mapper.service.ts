import { Injectable } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { VouchersService } from '../../vouchers/vouchers.service';
import { UserRole } from '../../users/entities/user.entity';
import { CompleteSessionDto } from '../dto/complete-session.dto';
import { CreateSessionDto } from '../dto/create-session.dto';
import { SessionPaymentStatus } from '../entities/session.entity';

export type CompleteSessionAdapted = {
  createSessionDto: CreateSessionDto;
  voucher?: { code: string } | null;
  inferredPatientName: string;
  payloadId?: string | null;
  payloadUserId?: string | null;
  payloadStartedAt?: string;
};

@Injectable()
export class SessionCompleteMapperService {
  constructor(
    private readonly usersService: UsersService,
    private readonly vouchersService: VouchersService,
  ) {}

  async toCreateSessionDto(
    payload: CompleteSessionDto,
  ): Promise<CompleteSessionAdapted> {
    const payloadUserId = this.nullIfBlank(payload.userId);
    const payloadPatientId = this.nullIfBlank(payload.patientId);
    const payloadTherapistUserId = this.nullIfBlank(payload.therapistUserId);
    const payloadInstitutionId = this.nullIfBlank(payload.institutionId);
    const payloadVoucherId = this.nullIfBlank(payload.voucherId);
    const payloadVoucherCode = this.nullIfBlank(payload.voucherCode);

    const user = payloadUserId
      ? await this.usersService.findOne(payloadUserId)
      : null;
    const voucher = payloadVoucherCode
      ? await this.vouchersService.resolveAvailableVoucher(payloadVoucherCode)
      : null;
    const inferredPatientName =
      payload.patientName || user?.name || 'Usuario App';
    const isTherapistUser =
      user?.role === UserRole.THERAPIST || user?.role === UserRole.ADMIN;
    const isPatientUser = user?.role === UserRole.PATIENT;
    const fallbackOwner =
      !payloadTherapistUserId &&
      !payloadInstitutionId &&
      !voucher &&
      (!user || isPatientUser)
        ? await this.usersService.getOrCreateIndividualTestsOwner()
        : null;
    const enrichedResultsByCategory = this.indexResultsMetadata(
      payload.resultPayload,
    );
    const payloadId = this.nullIfBlank(payload.id);

    const createSessionDto: CreateSessionDto = {
      id: payloadId || undefined,
      therapistUserId:
        payloadTherapistUserId ||
        voucher?.ownerUserId ||
        (isTherapistUser ? user?.id ?? undefined : undefined) ||
        fallbackOwner?.id ||
        undefined,
      institutionId:
        payloadInstitutionId ||
        voucher?.ownerInstitutionId ||
        user?.institutionId ||
        fallbackOwner?.institutionId ||
        undefined,
      patientId:
        (payloadPatientId ?? undefined) ||
        (!isTherapistUser ? payloadUserId ?? undefined : undefined),
      patientName: inferredPatientName,
      sessionDate: new Date(payload.startedAt || new Date()),
      hollandCode: payload.resultPayload?.hollandCode,
      totalTimeMs: this.calculateDuration(payload.startedAt, payload.finishedAt),
      voucherId: voucher?.id || payloadVoucherId || undefined,
      paymentStatus: voucher
        ? SessionPaymentStatus.VOUCHER_REDEEMED
        : this.normalizePaymentStatus(payload.paymentStatus),
      results: (payload.resultPayload?.radar || []).map((item) => {
        const categoryId = this.normalizeCategoryId(item.categoryId);
        return {
          categoryId,
          score: item.likes || 0,
          totalPossible: item.total || 0,
          percentage: this.normalizePercentage(item.affinity),
          suggestedCareers:
            enrichedResultsByCategory.get(categoryId)?.suggestedCareers ??
            undefined,
          materialSnippet:
            enrichedResultsByCategory.get(categoryId)?.materialSnippet ??
            undefined,
        };
      }),
      swipes: (payload.swipes || []).map((swipe) => ({
        cardId: swipe.cardId,
        categoryId: swipe.categoryId || 'unknown',
        isLiked: swipe.liked,
        timestamp: new Date(swipe.timestamp || new Date()),
      })),
    };

    return {
      createSessionDto,
      voucher: voucher ? { code: voucher.code } : null,
      inferredPatientName,
      payloadId,
      payloadUserId,
      payloadStartedAt: payload.startedAt,
    };
  }

  private normalizePaymentStatus(
    value?: string,
  ): SessionPaymentStatus | undefined {
    if (!value) return undefined;
    const normalized = value.toUpperCase();
    return Object.values(SessionPaymentStatus).includes(
      normalized as SessionPaymentStatus,
    )
      ? (normalized as SessionPaymentStatus)
      : undefined;
  }

  async attachVoucherIfNeeded(
    mapped: CompleteSessionAdapted,
    sessionId: string,
  ): Promise<void> {
    if (!mapped.voucher?.code) return;
    await this.vouchersService.attachVoucherToSession(
      mapped.voucher.code,
      sessionId,
      mapped.inferredPatientName,
    );
  }

  buildSyncKey(
    payloadId: string | null,
    userId: string | null,
    startedAt?: string,
  ): string | null {
    if (payloadId) return `id:${payloadId}`;
    if (!userId || !startedAt) return null;
    return `u:${userId}:s:${startedAt}`;
  }

  private calculateDuration(start?: string, end?: string): number {
    if (!start || !end) return 0;
    try {
      return new Date(end).getTime() - new Date(start).getTime();
    } catch {
      return 0;
    }
  }

  private indexResultsMetadata(
    payload: CompleteSessionDto['resultPayload'],
  ): Map<string, { suggestedCareers?: string[]; materialSnippet?: string }> {
    const map = new Map<
      string,
      { suggestedCareers?: string[]; materialSnippet?: string }
    >();
    const detailedResults = [
      ...(payload?.top3 ?? []),
      ...(payload?.bottom3 ?? []),
    ];

    for (const result of detailedResults) {
      const normalizedCategoryId = this.normalizeCategoryId(result?.categoryId);
      if (!normalizedCategoryId || map.has(normalizedCategoryId)) {
        continue;
      }
      map.set(normalizedCategoryId, {
        suggestedCareers: Array.isArray(result.suggestedCareers)
          ? result.suggestedCareers
          : undefined,
        materialSnippet:
          typeof result.materialSnippet === 'string'
            ? result.materialSnippet
            : undefined,
      });
    }

    return map;
  }

  private nullIfBlank(value: unknown): string | null {
    if (typeof value !== 'string') {
      return value == null ? null : String(value);
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeCategoryId(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }
    return value.trim().toUpperCase();
  }

  private normalizePercentage(value: unknown): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;

    const percentage = numeric <= 1 ? numeric * 100 : numeric;
    const clamped = Math.max(0, Math.min(100, percentage));
    return Math.round(clamped);
  }
}

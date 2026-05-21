import { Injectable } from '@nestjs/common';
import { CompleteSessionDto } from '../dto/complete-session.dto.js';
import { CreateSessionDto } from '../dto/create-session.dto.js';
import { SessionPaymentStatus } from '../entities/session.entity.js';
import { ResolvedOwnerContext } from './session-owner-resolver.service.js';

@Injectable()
export class SessionPayloadMapperService {
  mapToCreateDto(
    payload: CompleteSessionDto,
    context: ResolvedOwnerContext,
  ): CreateSessionDto {
    const {
      user,
      voucher,
      fallbackOwner,
      inferredPatientName,
      isTherapistUser,
    } = context;

    const payloadTherapistUserId = this.nullIfBlank(payload.therapistUserId);
    const payloadInstitutionId = this.nullIfBlank(payload.institutionId);
    const payloadPatientId = this.nullIfBlank(payload.patientId);
    const payloadUserId = this.nullIfBlank(payload.userId);
    const payloadVoucherId = this.nullIfBlank(payload.voucherId);
    const payloadId = this.nullIfBlank(payload.id);

    const enrichedResultsByCategory = this.indexResultsMetadata(
      payload.resultPayload,
    );

    return {
      id: payloadId || undefined,
      therapistUserId:
        payloadTherapistUserId ||
        voucher?.ownerUserId ||
        (isTherapistUser ? (user?.id ?? undefined) : undefined) ||
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
        (!isTherapistUser ? (payloadUserId ?? undefined) : undefined),
      patientName: inferredPatientName,
      sessionDate: new Date(payload.startedAt || new Date()),
      hollandCode: payload.resultPayload?.hollandCode,
      totalTimeMs: this.calculateDuration(
        payload.startedAt,
        payload.finishedAt,
      ),
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
      if (!normalizedCategoryId || map.has(normalizedCategoryId)) continue;
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
    if (typeof value !== 'string') return value == null ? null : String(value);
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeCategoryId(value: unknown): string {
    if (typeof value !== 'string') return '';
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

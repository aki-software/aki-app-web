import { CompleteSessionDto } from '../dto/complete-session.dto.js';
import { CreateSessionDto } from '../dto/create-session.dto.js';
import { SessionPaymentStatus } from '../entities/session.entity.js';
import { ResolvedOwnerContext } from '../interfaces/resolved-owner-context.interface.js';

export function mapToCreateDto(
  payload: CompleteSessionDto,
  context: ResolvedOwnerContext,
): CreateSessionDto {
  const { user, voucher, fallbackOwner, inferredPatientName, isTherapistUser } =
    context;

  const payloadTherapistUserId = nullIfBlank(payload.therapistUserId);
  const payloadInstitutionId = nullIfBlank(payload.institutionId);
  const payloadPatientId = nullIfBlank(payload.patientId);
  const payloadUserId = nullIfBlank(payload.userId);
  const payloadVoucherId = nullIfBlank(payload.voucherId);
  const payloadId = nullIfBlank(payload.id);

  const enrichedResultsByCategory = indexResultsMetadata(payload.resultPayload);

  const timeSpentByCategory = calculateTimePerCategory(payload.swipes);

  return {
    id: payloadId || undefined,
    therapistUserId:
      !isTherapistUser && !voucher
        ? fallbackOwner?.id || undefined
        : payloadTherapistUserId ||
          voucher?.ownerUserId ||
          (isTherapistUser ? (user?.id ?? undefined) : undefined) ||
          fallbackOwner?.id ||
          undefined,
    institutionId:
      !isTherapistUser && !voucher
        ? undefined
        : payloadInstitutionId ||
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
    totalTimeMs: calculateDuration(payload.startedAt, payload.finishedAt),
    voucherId: voucher?.id || payloadVoucherId || undefined,
    paymentStatus: voucher
      ? SessionPaymentStatus.VOUCHER_REDEEMED
      : normalizePaymentStatus(payload.paymentStatus),
    results: (payload.resultPayload?.radar || []).map((item) => {
      const categoryId = normalizeCategoryId(item.categoryId);
      return {
        categoryId,
        score: item.likes || 0,
        totalPossible: item.total || 0,
        percentage: normalizePercentage(item.affinity),
        timeSpentMs: timeSpentByCategory.get(categoryId) || 0,
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

export function normalizePaymentStatus(
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

export function calculateDuration(start?: string, end?: string): number {
  if (!start || !end) return 0;
  try {
    return new Date(end).getTime() - new Date(start).getTime();
  } catch {
    return 0;
  }
}

export function indexResultsMetadata(
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
    const normalizedCategoryId = normalizeCategoryId(result?.categoryId);
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

export function calculateTimePerCategory(
  swipes?: { categoryId?: string; timestamp?: string | Date }[],
): Map<string, number> {
  const map = new Map<string, number>();
  if (!swipes || swipes.length === 0) return map;

  const sorted = [...swipes].sort((a, b) => {
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return timeA - timeB;
  });

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const timePrev = prev.timestamp ? new Date(prev.timestamp).getTime() : 0;
    const timeCurr = curr.timestamp ? new Date(curr.timestamp).getTime() : 0;
    const diff = timeCurr - timePrev;

    if (diff > 0 && diff < 300000 && curr.categoryId) {
      const catId = normalizeCategoryId(curr.categoryId);
      map.set(catId, (map.get(catId) || 0) + diff);
    }
  }
  return map;
}

export function nullIfBlank(value: unknown): string | null {
  if (typeof value !== 'string') return value == null ? null : String(value);
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeCategoryId(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toUpperCase();
}

export function normalizePercentage(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const percentage = numeric <= 1 ? numeric * 100 : numeric;
  const clamped = Math.max(0, Math.min(100, percentage));
  return Math.round(clamped);
}

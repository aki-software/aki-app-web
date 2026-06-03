import { CompleteSessionDto } from '../dto/complete-session.dto.js';
import { CreateSessionDto } from '../dto/create-session.dto.js';
import { SessionPaymentStatus } from '../entities/session.entity.js';
import { ResolvedOwnerContext } from '../interfaces/resolved-owner-context.interface.js';
import { calculateHollandProfile } from './psychometrics.util.js';

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

  // Server-Authoritative: ignoramos el resultPayload enviado por la App.
  // El perfil Holland se calcula server-side usando los swipes crudos.
  const serverProfile = calculateHollandProfile(
    (payload.swipes || []).map((s) => ({
      categoryId: s.categoryId,
      liked: s.liked,
      timestamp: s.timestamp,
    })),
  );

  // Conservamos suggestedCareers y materialSnippet del payload del cliente
  // ya que esos datos los gestiona la App (son contenido, no cálculo).
  const enrichedResultsByCategory = indexResultsMetadata(payload.resultPayload);

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
    hollandCode: serverProfile.hollandCode,
    totalTimeMs: calculateDuration(payload.startedAt, payload.finishedAt),
    voucherId: voucher?.id || payloadVoucherId || undefined,
    paymentStatus: voucher
      ? SessionPaymentStatus.VOUCHER_REDEEMED
      : normalizePaymentStatus(payload.paymentStatus),
    results: serverProfile.radar.map((item) => {
      const catId = item.categoryId;
      return {
        categoryId: catId,
        score: item.rawScore,
        totalPossible: item.totalPossible,
        percentage: item.percentage,
        weightedScore: item.weightedScore,
        avgResponseTimeMs: item.avgResponseTimeMs,
        timeSpentMs: item.avgResponseTimeMs * item.totalPossible,
        suggestedCareers:
          enrichedResultsByCategory.get(catId)?.suggestedCareers ?? undefined,
        materialSnippet:
          enrichedResultsByCategory.get(catId)?.materialSnippet ?? undefined,
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

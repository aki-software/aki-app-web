import type { AuthUser } from "@akit/contracts";

export type AuditRole = "admin" | "institution" | "therapist";
export type AuditTheme = "light" | "dark";

export const ids = {
  institution: "11111111-1111-4111-8111-111111111111",
  therapist: "22222222-2222-4222-8222-222222222222",
  session: "33333333-3333-4333-8333-333333333333",
  batch: "44444444-4444-4444-8444-444444444444",
  plan: "55555555-5555-4555-8555-555555555555",
  payment: "66666666-6666-4666-8666-666666666666",
} as const;

export const auditUsers: Record<AuditRole, AuthUser> = {
  admin: {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    email: "admin.audit@example.test",
    name: "Admin de Auditoría",
    role: "ADMIN",
    institutionId: null,
    institutionName: null,
  },
  institution: {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    email: "institution.audit@example.test",
    name: "Institución de Auditoría",
    role: "INSTITUTION_ADMIN",
    institutionId: ids.institution,
    institutionName: "Institución de Auditoría",
  },
  therapist: {
    id: ids.therapist,
    email: "therapist.audit@example.test",
    name: "Terapeuta de Auditoría",
    role: "THERAPIST",
    institutionId: ids.institution,
    institutionName: "Institución de Auditoría",
  },
};

const results = [
  { categoryId: "R", percentage: 92 },
  { categoryId: "I", percentage: 81 },
  { categoryId: "A", percentage: 70 },
];
export const session = {
  id: ids.session,
  patientName: "Alex Rivera",
  createdAt: "2026-03-06T09:30:00.000Z",
  totalTimeMs: 1320000,
  paymentStatus: "PAID",
  reportUnlockedAt: "2026-03-06T10:00:00.000Z",
  results,
  swipes: [
    {
      cardId: "card-1",
      categoryId: "R",
      isLiked: true,
      timestamp: "2026-03-06T09:31:00.000Z",
    },
  ],
  institution: { name: "Institución de Auditoría" },
  therapist: { name: "Terapeuta de Auditoría" },
  voucher: { code: "AUDIT001" },
};
export const categories = ["R", "I", "A"].map((categoryId) => ({
  categoryId,
  title: `Área ${categoryId}`,
  description: `Descripción ${categoryId}`,
  occupations: ["Ocupación"],
  formalProfessions: ["Profesión"],
  competencies: ["Competencia"],
}));
export const metrics = {
  id: 1,
  totalDurationMs: 1320000,
  totalSwipes: 24,
  uniqueCards: 24,
  revertedMatches: 1,
  avgTimeBetweenSwipesMs: 1100,
  minTimeBetweenSwipesMs: 500,
  maxTimeBetweenSwipesMs: 3000,
  reliabilityScore: 88,
  reliabilityLevel: "Alta",
  likeRatio: 0.6,
  selectivityLevel: "BALANCED",
  firstHalfLikeRate: 0.6,
  lastHalfLikeRate: 0.6,
  consistencyLevel: "CONSISTENT",
  fatigueDetected: false,
  rushDetected: false,
  responseTimeHistogram: [{ bucket: 1000, count: 12 }],
  revertedDirection: {
    likedToDisliked: 0,
    dislikedToLiked: 1,
    details: [{ categoryId: "R", type: "dislikedToLiked" }],
  },
  calculatedAt: "2026-03-06T10:00:00.000Z",
};
export const institution = {
  id: ids.institution,
  name: "Institución de Auditoría",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  billingEmail: "billing@example.test",
  responsibleTherapistUserId: ids.therapist,
  responsibleTherapistName: "Terapeuta de Auditoría",
  responsibleTherapistActive: true,
};
export const voucher = {
  id: "77777777-7777-4777-8777-777777777777",
  code: "AUDIT001",
  batchId: ids.batch,
  status: "AVAILABLE",
  ownerType: "INSTITUTION",
  ownerInstitutionId: ids.institution,
  ownerInstitution: { name: institution.name, isActive: true },
  ownerUserId: null,
  ownerUser: null,
  assignedPatientName: null,
  assignedPatientEmail: null,
  redeemedSessionId: null,
  createdAt: "2026-03-01T00:00:00.000Z",
  redeemedAt: null,
  expiresAt: "2026-12-31T00:00:00.000Z",
};
export const voucherBatch = {
  batchId: ids.batch,
  ownerInstitutionName: institution.name,
  ownerUserName: "Administrador de Auditoría",
  createdAt: "2026-03-01T00:00:00.000Z",
  expiresAt: "2026-12-31T00:00:00.000Z",
  total: 10,
  available: 9,
  used: 1,
  pending: 0,
};
export const plan = {
  id: ids.plan,
  name: "Plan auditoría",
  description: "Lote de auditoría",
  voucherQuantity: 10,
  priceUsd: 25,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
export const activity = [
  {
    id: "activity-1",
    type: "SESSION_COMPLETED",
    title: "Evaluación completada",
    description: "Alex Rivera completó su evaluación.",
    occurredAt: "2026-03-06T10:00:00.000Z",
  },
];
export const overview = {
  periodDays: 7,
  periodLabel: "Últimos 7 días",
  vouchers: {
    total: 10,
    available: 9,
    used: 1,
    expired: 0,
    sent: 0,
    revoked: 0,
    vouchersGeneratedPeriod: 10,
    vouchersRedeemedPeriod: 1,
    voucherRedemptionRatePeriod: 10,
    vouchersExpiringSoon7d: 0,
    vouchersUnassignedAvailable: 0,
  },
  tests: {
    testsStartedPeriod: 1,
    testsCompletedPeriod: 1,
    reportsUnlockedPeriod: 1,
    channelBreakdown: {
      voucher: { started: 1, completed: 1, reportsUnlocked: 1 },
      individual: { started: 0, completed: 0, reportsUnlocked: 0 },
    },
  },
  topSessions: [
    {
      ...session,
      hollandCode: "RIA",
      sessionDate: session.createdAt,
      resultsCount: 3,
    },
  ],
  resultsDistribution: [{ categoryId: "R", name: "Realista", count: 1 }],
};
export const institutionPurchaseSummary = {
  scope: "INSTITUTION" as const,
  institutionName: institution.name,
  generatedAt: "2026-03-10T00:00:00.000Z",
  currentWindow: { from: "2026-03-03T00:00:00.000Z", to: "2026-03-10T00:00:00.000Z", days: 7 as const },
  priorWindow: { from: "2026-02-24T00:00:00.000Z", to: "2026-03-03T00:00:00.000Z", days: 7 as const },
  current: { accreditedPurchaseCount: 1, accreditedVoucherCount: 10, accreditedAmountByCurrency: [{ currency: "USD", amount: "25.00" }] },
  prior: { accreditedPurchaseCount: 0, accreditedVoucherCount: 0, accreditedAmountByCurrency: [] },
  alerts: { paidButNotFulfilledCount: 0, notificationAttentionCount: 0 },
  latestAccreditation: { accreditedAt: "2026-03-01T00:01:00.000Z", voucherCount: 10, amount: { currency: "USD", amount: "25.00" } },
};

export const platformPurchaseSummary = {
  scope: "PLATFORM" as const,
  generatedAt: "2026-03-10T00:00:00.000Z",
  currentWindow: { from: "2026-03-03T00:00:00.000Z", to: "2026-03-10T00:00:00.000Z", days: 7 as const },
  priorWindow: { from: "2026-02-24T00:00:00.000Z", to: "2026-03-03T00:00:00.000Z", days: 7 as const },
  current: { accreditedPurchaseCount: 1, accreditedVoucherCount: 10, purchasingInstitutionCount: 1, accreditedAmountByCurrency: [{ currency: "USD", amount: "25.00" }] },
  prior: { accreditedPurchaseCount: 0, accreditedVoucherCount: 0, purchasingInstitutionCount: 0, accreditedAmountByCurrency: [] },
  alerts: { paidButNotFulfilledCount: 0, notificationAttentionCount: 0 },
  latestAccreditation: null,
};

export const adminOverview = {
  totalSessions: 1,
  totalHistoricalVouchers: 10,
  completionRate: 100,
  averageTimeSeconds: 1320,
  availableVouchers: 9,
  redeemedVouchers: 1,
  periodDays: 7,
  periodLabel: "Últimos 7 días",
  vouchersGeneratedPeriod: 10,
  vouchersRedeemedPeriod: 1,
  testsStartedPeriod: 1,
  testsCompletedPeriod: 1,
  voucherRedemptionRatePeriod: 10,
  reportsUnlockedPeriod: 1,
  channelBreakdown: overview.tests.channelBreakdown,
  sessionsActivity: [{ date: "2026-03-06", count: 1 }],
  resultsDistribution: overview.resultsDistribution,
  alerts: [],
  activity,
};

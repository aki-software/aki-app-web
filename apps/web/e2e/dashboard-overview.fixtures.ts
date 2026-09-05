import type {
  AuthUser,
  DashboardStatsResponse,
  InstitutionOverviewResponse,
} from "@akit/contracts";

export type AuditRole = "admin" | "institution";
export type AuditTheme = "light" | "dark";

export const auditUsers: Record<AuditRole, AuthUser> = {
  admin: {
    id: "audit-admin-001",
    email: "admin.audit@example.test",
    name: "Admin de Auditoría",
    role: "ADMIN",
    institutionId: null,
    institutionName: null,
  },
  institution: {
    id: "audit-institution-admin-001",
    email: "institucion.audit@example.test",
    name: "Institución de Auditoría",
    role: "INSTITUTION_ADMIN",
    institutionId: "audit-institution-001",
    institutionName: "Institución de Auditoría",
  },
};

export const adminOverviewFixture: DashboardStatsResponse = {
  totalSessions: 128,
  totalHistoricalVouchers: 640,
  completionRate: 82,
  averageTimeSeconds: 1320,
  availableVouchers: 96,
  redeemedVouchers: 544,
  periodDays: 7,
  periodLabel: "Últimos 7 días",
  vouchersGeneratedPeriod: 48,
  vouchersRedeemedPeriod: 37,
  testsStartedPeriod: 52,
  testsCompletedPeriod: 43,
  voucherRedemptionRatePeriod: 77,
  reportsUnlockedPeriod: 31,
  channelBreakdown: {
    voucher: { started: 34, completed: 28, reportsUnlocked: 21 },
    individual: { started: 18, completed: 15, reportsUnlocked: 10 },
  },
  sessionsActivity: [
    { date: "2026-03-01", count: 5 },
    { date: "2026-03-02", count: 9 },
    { date: "2026-03-03", count: 7 },
    { date: "2026-03-04", count: 11 },
    { date: "2026-03-05", count: 8 },
    { date: "2026-03-06", count: 10 },
    { date: "2026-03-07", count: 12 },
  ],
  resultsDistribution: [
    { categoryId: "R", name: "Realista", count: 24 },
    { categoryId: "I", name: "Investigador", count: 19 },
  ],
  alerts: [
    {
      id: "audit-alert-001",
      severity: "warning",
      title: "Seguimiento de vouchers",
      description: "Hay vouchers próximos a vencer.",
      actionLabel: "Revisar inventario",
      actionPath: "/dashboard/vouchers",
    },
  ],
  activity: [
    {
      id: "audit-activity-001",
      type: "SESSION_COMPLETED",
      title: "Evaluación completada",
      description: "Una evaluación fue completada en la institución piloto.",
      occurredAt: "2026-03-07T12:00:00.000Z",
    },
  ],
};

export const triageFixture = {
  data: [],
  meta: { total: 3, page: 1, limit: 1, flaggedCount: 1 },
};

export const institutionOverviewFixture: InstitutionOverviewResponse = {
  periodDays: 7,
  periodLabel: "Últimos 7 días",
  vouchers: {
    total: 48,
    available: 3,
    used: 39,
    expired: 2,
    sent: 42,
    revoked: 1,
    vouchersGeneratedPeriod: 12,
    vouchersRedeemedPeriod: 9,
    voucherRedemptionRatePeriod: 75,
    vouchersExpiringSoon7d: 2,
    vouchersUnassignedAvailable: 2,
  },
  tests: {
    testsStartedPeriod: 18,
    testsCompletedPeriod: 14,
    reportsUnlockedPeriod: 11,
    channelBreakdown: {
      voucher: { started: 14, completed: 11, reportsUnlocked: 9 },
      individual: { started: 4, completed: 3, reportsUnlocked: 2 },
    },
  },
  topSessions: [
    {
      id: "audit-session-001",
      patientName: "Alex Rivera",
      createdAt: "2026-03-06T09:30:00.000Z",
      sessionDate: "2026-03-06T09:30:00.000Z",
      hollandCode: "RIA",
      paymentStatus: "PAID",
      voucherCode: "AUDIT-001",
      reportUnlockedAt: "2026-03-06T10:00:00.000Z",
      resultsCount: 6,
    },
  ],
  resultsDistribution: [
    { categoryId: "R", name: "Realista", count: 7 },
    { categoryId: "I", name: "Investigador", count: 4 },
    { categoryId: "A", name: "Artístico", count: 3 },
  ],
};

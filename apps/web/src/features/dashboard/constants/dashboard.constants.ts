import { DashboardStatsResponse } from "@akit/contracts";

export const DEFAULT_DASHBOARD_STATS: DashboardStatsResponse = {

    redeemedVouchers: 0,
    periodDays: 7,
    periodLabel: "Últimos 7 días",
    vouchersGeneratedPeriod: 0,
    vouchersRedeemedPeriod: 0,
    testsStartedPeriod: 0,
    testsCompletedPeriod: 0,
    voucherRedemptionRatePeriod: 0,
    reportsUnlockedPeriod: 0,
    totalSessions: 0,
    completionRate: 0,
    averageTimeSeconds: 0,
    availableVouchers: 0,
    channelBreakdown: {
    voucher: { started: 0, completed: 0, reportsUnlocked: 0 },
    individual: { started: 0, completed: 0, reportsUnlocked: 0 },
    },
    sessionsActivity: [],
    resultsDistribution: [],
    alerts: [],
    activity: [],
};

export const DASHBOARD_UI_TEXTS = {
  header: {
    tag: "Dashboard operativo",
    title: "Resumen Operativo",
    subtitle: "Vista ejecutiva para seguir el flujo operativo, las alertas y la actividad reciente de la plataforma.",
  },
  widgets: {
    sessions: {
      title: "Sesiones iniciadas por día",
      description: "Cantidad diaria de sesiones iniciadas en la plataforma durante",
    },
    results: {
      title: "Resultados predominantes",
      description: "Cantidad de sesiones según la categoría con mayor afinidad.",
    }
  }
};
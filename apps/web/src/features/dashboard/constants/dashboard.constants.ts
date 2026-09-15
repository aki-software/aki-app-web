import { DashboardStatsResponse } from "@akit/contracts";

export const DEFAULT_DASHBOARD_STATS: DashboardStatsResponse = {

    redeemedVouchers: 0,
    totalHistoricalVouchers: 0,
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
    voucher: { started: 1500, completed: 1200, reportsUnlocked: 980 },
    individual: { started: 500, completed: 350, reportsUnlocked: 310 },
    googlePlay: { started: 200, completed: 150, reportsUnlocked: 140, revenueUsd: 1500 },
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
      title: "Volumen de Evaluaciones Diarias",
      description: "Tráfico y uso de la plataforma (evaluaciones iniciadas) en",
    },
    results: {
      title: "Resultados predominantes",
      description: "Cantidad de sesiones según la categoría con mayor afinidad.",
    }
  }
};
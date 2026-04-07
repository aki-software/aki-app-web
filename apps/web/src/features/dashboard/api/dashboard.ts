import { AdminActivityEvent, DashboardStatsResponse } from "@akit/contracts";
import { API_URL, getAuthHeaders } from "./client";

export * from "./categories.api";
export * from "./institutions.api";
export * from "./sessions.api";
export * from "./users.api";
export * from "./vouchers.api";

export async function fetchDashboardStats(): Promise<DashboardStatsResponse> {
  try {
    const response = await fetch(`${API_URL}/sessions/admin/overview`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch admin overview");
    const data = (await response.json()) as Partial<DashboardStatsResponse>;

    return {
      totalSessions: Number(data.totalSessions ?? 0),
      completionRate: Number(data.completionRate ?? 0),
      averageTimeSeconds: Number(data.averageTimeSeconds ?? 0),
      availableVouchers: Number(data.availableVouchers ?? 0),
      redeemedVouchers: Number(data.redeemedVouchers ?? 0),
      periodDays: Number(data.periodDays ?? 7),
      periodLabel: data.periodLabel ?? "Ultimos 7 dias",
      vouchersGeneratedPeriod: Number(data.vouchersGeneratedPeriod ?? 0),
      vouchersRedeemedPeriod: Number(data.vouchersRedeemedPeriod ?? 0),
      testsStartedPeriod: Number(data.testsStartedPeriod ?? 0),
      testsCompletedPeriod: Number(data.testsCompletedPeriod ?? 0),
      voucherRedemptionRatePeriod: Number(
        data.voucherRedemptionRatePeriod ?? 0,
      ),
      reportsUnlockedPeriod: Number(data.reportsUnlockedPeriod ?? 0),
      channelBreakdown: data.channelBreakdown ?? {
        voucher: { started: 0, completed: 0, reportsUnlocked: 0 },
        individual: { started: 0, completed: 0, reportsUnlocked: 0 },
      },
      sessionsActivity: data.sessionsActivity ?? [],
      resultsDistribution: data.resultsDistribution ?? [],
      alerts: data.alerts ?? [],
      activity: data.activity ?? [],
    };
  } catch (error) {
    console.error("Admin overview unavailable, returning zeroes.", error);
    return {
      totalSessions: 0,
      completionRate: 0,
      averageTimeSeconds: 0,
      availableVouchers: 0,
      redeemedVouchers: 0,
      periodDays: 7,
      periodLabel: "Ultimos 7 dias",
      vouchersGeneratedPeriod: 0,
      vouchersRedeemedPeriod: 0,
      testsStartedPeriod: 0,
      testsCompletedPeriod: 0,
      voucherRedemptionRatePeriod: 0,
      reportsUnlockedPeriod: 0,
      channelBreakdown: {
        voucher: { started: 0, completed: 0, reportsUnlocked: 0 },
        individual: { started: 0, completed: 0, reportsUnlocked: 0 },
      },
      sessionsActivity: [],
      resultsDistribution: [],
      alerts: [],
      activity: [],
    };
  }
}

export async function fetchAdminActivityHistory(
  limit: number = 50,
): Promise<AdminActivityEvent[]> {
  try {
    const normalizedLimit = Number.isFinite(limit)
      ? Math.min(Math.max(Math.floor(limit), 1), 200)
      : 50;

    const response = await fetch(
      `${API_URL}/sessions/admin/activity?limit=${normalizedLimit}`,
      {
        headers: getAuthHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch admin activity history");
    }

    const data = (await response.json()) as AdminActivityEvent[];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Admin activity history unavailable.", error);
    return [];
  }
}

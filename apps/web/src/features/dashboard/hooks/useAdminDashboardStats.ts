import { useState, useEffect, useCallback } from "react";
import { fetchDashboardStats } from "../api/dashboard";
import type { DashboardStatsResponse } from "@akit/contracts";

export function useAdminDashboardStats(initialPeriodDays = 7) {
  const [adminStats, setAdminStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState<number>(initialPeriodDays);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardStats(periodDays);
      setAdminStats(data);
    } catch (err) {
      console.error("Error loading admin stats:", err);
      setError("No se pudieron cargar las estadísticas del panel.");
    } finally {
      setLoading(false);
    }
  }, [periodDays]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats: adminStats,
    loading,
    error,
    periodDays,
    setPeriodDays,
    refreshStats: loadStats,
  };
}

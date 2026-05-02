import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchInstitutionOverview, type InstitutionOverviewResponse } from "../api/dashboard";

export const PERIOD_DAYS = 7;
export const LOW_STOCK_ALERT_THRESHOLD = 3;
export const useInstitutionOverviewManager = (institutionId?: string | null) => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<InstitutionOverviewResponse | null>(null);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);

  const dismissKey = `akit:voucher-low-stock-dismissed:${institutionId ?? "global"}`;

  // Carga de datos
  useEffect(() => {
    let isActive = true;
    const load = async () => {
      if (!institutionId) {
        setOverview(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchInstitutionOverview({ institutionId, days: PERIOD_DAYS });
        if (isActive) setOverview(data);
      } catch (error) {
        console.error("Error loading institution dashboard data:", error);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void load();
    return () => { isActive = false; };
  }, [institutionId]);

  // Manejo del estado del alert en LocalStorage
  useEffect(() => {
    const stored = localStorage.getItem(dismissKey);
    setIsAlertDismissed(stored === "true");
  }, [dismissKey]);

  const handleDismissAlert = useCallback(() => {
    localStorage.setItem(dismissKey, "true");
    setIsAlertDismissed(true);
  }, [dismissKey]);

  // Cálculos derivados
  const voucherStats = overview?.vouchers;
  const testsStats = overview?.tests;

  const showLowStockAlert = useMemo(() => {
    if (!voucherStats || voucherStats.total <= 0) return false;
    const isLow = (voucherStats.available / voucherStats.total) <= 0.1;
    return isLow && !isAlertDismissed;
  }, [voucherStats, isAlertDismissed]);

  return {
    loading,
    overview,
    voucherStats,
    testsStats,
    showLowStockAlert,
    handleDismissAlert,
    periodDays: overview?.periodDays ?? PERIOD_DAYS,
  };
};
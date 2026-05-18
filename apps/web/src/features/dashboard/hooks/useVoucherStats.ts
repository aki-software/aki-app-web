import { useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchInstitutions,
  fetchTherapists,
  fetchVoucherStats,
  fetchVouchersList,
  type InstitutionOption,
  type TherapistOption,
  type VoucherStats,
  type VoucherAlert,
} from "../api/dashboard";

import { AuthUser } from "@akit/contracts";

export const useVoucherStats = (user: AuthUser | null, isAdmin: boolean) => {
  const [stats, setStats] = useState<VoucherStats | null>(null);
  const [alerts, setAlerts] = useState<VoucherAlert[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [therapists, setTherapists] = useState<TherapistOption[]>([]);
  const [vouchers, setVouchers] = useState<unknown[]>([]); // For client options calculation
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [voucherData, institutionsData, therapistsData, statsData] = await Promise.all([
        fetchVouchersList(),
        isAdmin ? fetchInstitutions() : Promise.resolve([]),
        isAdmin ? fetchTherapists() : Promise.resolve([]),
        fetchVoucherStats(user?.institutionId ?? undefined),
      ]);
      setVouchers(voucherData);
      setInstitutions(institutionsData);
      setTherapists(therapistsData);
      setStats(statsData.stats);
      setAlerts(statsData.alerts);
    } catch (error) {
      console.error("No fue posible cargar las métricas de vouchers.", error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user?.institutionId]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  const clientOptions = useMemo(() => {
    const entries = new Map<string, string>();
    vouchers.forEach((v) => {
      const key = v.ownerInstitutionId ?? "__UNASSIGNED__";
      const label = v.ownerInstitutionName || "Institución no informada";
      if (!entries.has(key)) entries.set(key, label);
    });
    return Array.from(entries.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [vouchers]);

  return {
    stats,
    alerts,
    institutions,
    therapists,
    clientOptions,
    loading,
    refreshStats: loadData,
  };
};

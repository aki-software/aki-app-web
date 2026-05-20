import { useState, useCallback } from "react";

export interface PeriodOption {
  value: number;
  label: string;
}

export function usePeriodSelector(initialPeriod = 7) {
  const [periodDays, setPeriodDays] = useState<number>(initialPeriod);

  const options: PeriodOption[] = [
    { value: 7, label: "Últimos 7 días" },
    { value: 15, label: "Últimos 15 días" },
    { value: 30, label: "Últimos 30 días" },
    { value: 90, label: "Últimos 90 días" },
    { value: 365, label: "Último año" },
  ];

  const handlePeriodChange = useCallback((days: number) => {
    setPeriodDays(days);
  }, []);

  return {
    periodDays,
    setPeriodDays: handlePeriodChange,
    options,
  };
}

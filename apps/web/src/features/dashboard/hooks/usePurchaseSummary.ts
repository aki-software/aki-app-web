import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchPurchaseSummary,
  type PurchaseSummary,
} from "../api/purchase-summary.api";

export type PurchaseSummaryPeriod = 7 | 30 | 90;

interface PurchaseSummaryState {
  data: PurchaseSummary | null;
  error: Error | null;
  loading: boolean;
}

export function usePurchaseSummary(
  periodDays: PurchaseSummaryPeriod,
  enabled: boolean,
) {
  const [state, setState] = useState<PurchaseSummaryState>({
    data: null,
    error: null,
    loading: false,
  });
  const [requestVersion, setRequestVersion] = useState(0);
  const latestRequest = useRef(0);

  const retry = useCallback(() => {
    if (enabled) setRequestVersion((version) => version + 1);
  }, [enabled]);

  useEffect(() => {
    const requestId = ++latestRequest.current;
    if (!enabled) {
      setState({ data: null, error: null, loading: false });
      return;
    }

    setState((current) => ({ ...current, error: null, loading: true }));
    void fetchPurchaseSummary(periodDays).then(
      (data) => {
        if (latestRequest.current === requestId) {
          setState({ data, error: null, loading: false });
        }
      },
      (reason: unknown) => {
        if (latestRequest.current === requestId) {
          setState({
            data: null,
            error: reason instanceof Error ? reason : new Error("Purchase summary failed"),
            loading: false,
          });
        }
      },
    );
  }, [enabled, periodDays, requestVersion]);

  return { ...state, retry };
}

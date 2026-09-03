import { useState, useEffect, useCallback } from "react";
import { billingApi } from "../api/billing.api";
import {
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  PricingPlan,
  BillingHistory,
  PaymentStatus,
} from "@akit/contracts";

export function usePricingPlans() {
  const [data, setData] = useState<PricingPlan[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const plans = await billingApi.getPlans();
      setData(plans);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return { data, isLoading, error, refetch: fetchPlans };
}

export function useBillingHistory() {
  const [data, setData] = useState<BillingHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const history = await billingApi.getHistory();
      setData(history);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { data, isLoading, error, refetch: fetchHistory };
}

const CHECKOUT_POLL_INTERVALS_MS = [2_000, 4_000, 8_000, 15_000] as const;
const MAX_AUTOMATIC_CHECKOUT_POLLS = 5;

export function isTerminalCheckoutStatus(status: PaymentStatus): boolean {
  if (["FAILED", "EXPIRED", "CANCELLED", "REFUNDED"].includes(status.paymentState)) {
    return true;
  }

  return (
    status.paymentState === "PAID" &&
    ["FULFILLED", "REVOKED", "BLOCKED"].includes(status.fulfillmentState)
  );
}

export function useCheckoutAttemptStatus(id: string | null) {
  const [data, setData] = useState<PaymentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [isPolling, setIsPolling] = useState(Boolean(id));
  const [isExhausted, setIsExhausted] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pollCycle, setPollCycle] = useState(0);

  useEffect(() => {
    if (!id) {
      setData(null);
      setIsLoading(false);
      setIsPolling(false);
      setIsExhausted(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pollCount = 0;

    const isVisible = () => document.visibilityState !== "hidden";
    const scheduleNextPoll = () => {
      if (cancelled || !isVisible()) {
        setIsPolling(false);
        return;
      }
      if (pollCount >= MAX_AUTOMATIC_CHECKOUT_POLLS) {
        setIsPolling(false);
        setIsExhausted(true);
        return;
      }

      const delay = CHECKOUT_POLL_INTERVALS_MS[
        Math.min(pollCount - 1, CHECKOUT_POLL_INTERVALS_MS.length - 1)
      ];
      timer = setTimeout(() => void poll(), delay);
    };
    const poll = async () => {
      if (cancelled || !isVisible()) {
        setIsPolling(false);
        return;
      }

      setIsLoading(true);
      setIsPolling(true);
      setError(null);
      try {
        const status = await billingApi.getCheckoutAttemptStatus(id);
        if (cancelled) return;
        setData(status);
        pollCount += 1;
        if (isTerminalCheckoutStatus(status)) {
          setIsPolling(false);
          return;
        }
        scheduleNextPoll();
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        pollCount += 1;
        scheduleNextPoll();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    const handleVisibilityChange = () => {
      if (!isVisible()) {
        if (timer) clearTimeout(timer);
        timer = undefined;
        setIsPolling(false);
      } else if (!timer && pollCount < MAX_AUTOMATIC_CHECKOUT_POLLS) {
        void poll();
      }
    };

    setData(null);
    setError(null);
    setIsExhausted(false);
    void poll();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [id, pollCycle]);

  const refetch = useCallback(() => {
    if (id) setPollCycle((currentCycle) => currentCycle + 1);
  }, [id]);

  return { data, isLoading, isPolling, isExhausted, error, refetch };
}

export function useCheckout() {
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutateAsync = async (
    request: CheckoutSessionRequest,
  ): Promise<CheckoutSessionResponse> => {
    setIsMutating(true);
    setError(null);
    try {
      const res = await billingApi.createCheckout(request);
      return res;
    } catch (err) {
      const typedErr = err instanceof Error ? err : new Error(String(err));
      setError(typedErr);
      throw typedErr;
    } finally {
      setIsMutating(false);
    }
  };

  return { mutateAsync, isMutating, error };
}

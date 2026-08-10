import { useState, useEffect, useCallback } from 'react';
import { billingApi } from '../api/billing.api';
import { CheckoutSessionRequest, CheckoutSessionResponse, PricingPlan, BillingHistory } from '@akit/contracts';

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

export function useCheckout() {
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutateAsync = async (request: CheckoutSessionRequest): Promise<CheckoutSessionResponse> => {
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

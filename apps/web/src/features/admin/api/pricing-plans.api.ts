import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../api/client';

export interface PricingPlan {
  id: string;
  name: string;
  description: string | null;
  voucherQuantity: number;
  priceUsd: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePricingPlanDto {
  name: string;
  description?: string;
  voucherQuantity: number;
  priceUsd: number;
  isActive?: boolean;
}

export type UpdatePricingPlanDto = Partial<CreatePricingPlanDto>;

export function useAdminPricingPlans() {
  const [data, setData] = useState<PricingPlan[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<PricingPlan[]>('/admin/pricing-plans');
      setData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return { data, isLoading, refetch: fetchPlans };
}

export function useCreatePricingPlan() {
  const [isPending, setIsPending] = useState(false);
  const mutateAsync = async (payload: CreatePricingPlanDto) => {
    setIsPending(true);
    try {
      await apiClient.post<PricingPlan>('/admin/pricing-plans', payload);
    } finally {
      setIsPending(false);
    }
  };
  return { mutateAsync, isPending };
}

export function useUpdatePricingPlan() {
  const [isPending, setIsPending] = useState(false);
  const mutateAsync = async ({ id, ...payload }: { id: string } & UpdatePricingPlanDto) => {
    setIsPending(true);
    try {
      await apiClient.patch<PricingPlan>(`/admin/pricing-plans/${id}`, payload);
    } finally {
      setIsPending(false);
    }
  };
  return { mutateAsync, isPending };
}

export function useDeletePricingPlan() {
  const mutateAsync = async (id: string) => {
    await apiClient.delete(`/admin/pricing-plans/${id}`);
  };
  return { mutateAsync };
}

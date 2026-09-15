import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../api/client";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import type { InstitutionResponse, UpdateBillingProfileDto } from "@akit/contracts";

export function useInstitutionProfile() {
  const { user } = useAuth();
  const institutionId = user?.institutionId;
  const [data, setData] = useState<InstitutionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!institutionId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<InstitutionResponse>(`/institutions/${institutionId}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { data, isLoading, error, refetch: fetchProfile };
}

export function useUpdateBillingProfile() {
  const { user } = useAuth();
  const institutionId = user?.institutionId;
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutateAsync = async (
    payload: UpdateBillingProfileDto
  ): Promise<InstitutionResponse> => {
    if (!institutionId) throw new Error("No institution ID");
    setIsMutating(true);
    setError(null);
    try {
      const res = await apiClient.patch<InstitutionResponse>(
        `/institutions/${institutionId}/billing-profile`,
        payload
      );
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

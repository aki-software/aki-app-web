import { apiClient } from "../../../api/client";
import {
  PurchaseSummaryResponse,
  type PurchaseSummaryResponse as PurchaseSummary,
} from "@akit/contracts";

export type { PurchaseSummary };

export async function fetchPurchaseSummary(
  periodDays: 7 | 30 | 90,
): Promise<PurchaseSummary> {
  const response = await apiClient.get<unknown>("/payments/purchase-summary", {
    params: { periodDays: String(periodDays) },
  });

  return PurchaseSummaryResponse.parse(response);
}

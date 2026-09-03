import { apiClient } from "../../../api/client";
import {
  BillingHistory,
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  PaymentStatus,
  PricingPlan,
} from "@akit/contracts";

const CHECKOUT_IDEMPOTENCY_PREFIX = "billing:checkout:idempotency:";

function createIdempotencyKey(): string {
  const browserCrypto = globalThis.crypto;
  if (browserCrypto?.randomUUID) {
    return browserCrypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getCheckoutIdempotencyKey(data: CheckoutSessionRequest): {
  key: string;
  storageKey: string;
} {
  const requestFingerprint = JSON.stringify(data);
  const storageKey = `${CHECKOUT_IDEMPOTENCY_PREFIX}${requestFingerprint}`;

  try {
    const existingKey = sessionStorage.getItem(storageKey);
    if (existingKey) return { key: existingKey, storageKey };

    const key = createIdempotencyKey();
    sessionStorage.setItem(storageKey, key);
    return { key, storageKey };
  } catch {
    return { key: createIdempotencyKey(), storageKey };
  }
}

function clearCheckoutIdempotencyKey(storageKey: string, key: string): void {
  try {
    if (sessionStorage.getItem(storageKey) === key) {
      sessionStorage.removeItem(storageKey);
    }
  } catch {
    // Storage may be unavailable; the request has still completed successfully.
  }
}

export const billingApi = {
  getPlans: () => apiClient.get<PricingPlan[]>("/payments/plans"),
  createCheckout: (data: CheckoutSessionRequest) => {
    const { key, storageKey } = getCheckoutIdempotencyKey(data);
    return apiClient
      .post<CheckoutSessionResponse>("/payments/checkout", data, {
        headers: {
          "X-Idempotency-Key": key,
        },
      })
      .then((response) => {
        clearCheckoutIdempotencyKey(storageKey, key);
        return response;
      });
  },
  getHistory: () => apiClient.get<BillingHistory>("/payments/history"),
  getCheckoutAttemptStatus: (id: string) =>
    apiClient.get<PaymentStatus>(`/payments/checkout-attempts/${id}/status`),
};

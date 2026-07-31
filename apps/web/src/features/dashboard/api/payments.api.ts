import { API_URL, getAuthHeaders } from "./client";

export async function createCheckoutSession(voucherPlanId: string, gateway: 'stripe' | 'mercadopago', successUrl: string, cancelUrl: string): Promise<{ checkoutUrl: string }> {
  const res = await fetch(`${API_URL}/payments/checkout/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ voucherPlanId, gateway, successUrl, cancelUrl }),
  });
  if (!res.ok) {
    throw new Error("Failed to create checkout session");
  }
  return res.json();
}

export async function getPricingPlans(): Promise<Array<{ id: string; name: string; description?: string; priceArs: number; priceUsd?: number; voucherQuantity: number }>> {
  const res = await fetch(`${API_URL}/payments/pricing-plans`, {
    headers: {
      ...getAuthHeaders(),
    }
  });
  if (!res.ok) {
    throw new Error("Failed to fetch pricing plans");
  }
  return res.json();
}

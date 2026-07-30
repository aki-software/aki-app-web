import { API_URL, getAuthHeaders } from "./client";

export async function createCheckoutSession(priceId: string, successUrl: string, cancelUrl: string): Promise<{ url: string }> {
  const res = await fetch(`${API_URL}/payments/stripe/checkout-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ stripePriceId: priceId, successUrl, cancelUrl }),
  });
  if (!res.ok) {
    throw new Error("Failed to create checkout session");
  }
  return res.json();
}

export async function getPricingPlans(): Promise<Array<{ id: string; name: string; price: number; currency: string; voucherQuantity: number }>> {
  const res = await fetch(`${API_URL}/public/payments/stripe/pricing-plans`);
  if (!res.ok) {
    throw new Error("Failed to fetch pricing plans");
  }
  return res.json();
}

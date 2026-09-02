import { beforeEach, describe, expect, it, vi } from "vitest";

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock("../../../api/client", () => ({
  apiClient: { post },
}));

import { billingApi } from "./billing.api";

const checkout = {
  planId: "11111111-1111-4111-8111-111111111111",
  gateway: "MERCADO_PAGO" as const,
};

beforeEach(() => {
  post.mockReset();
  sessionStorage.clear();
});

describe("billingApi.createCheckout idempotency", () => {
  it("sends one non-empty idempotency key and reuses it after an ambiguous request", async () => {
    post.mockRejectedValue(new Error("network error"));

    await expect(billingApi.createCheckout(checkout)).rejects.toThrow(
      "network error",
    );
    await expect(billingApi.createCheckout(checkout)).rejects.toThrow(
      "network error",
    );

    expect(post).toHaveBeenCalledTimes(2);
    const firstKey = post.mock.calls[0][2].headers["X-Idempotency-Key"];
    const secondKey = post.mock.calls[1][2].headers["X-Idempotency-Key"];
    expect(firstKey).toEqual(expect.any(String));
    expect(firstKey).not.toBe("");
    expect(Object.keys(post.mock.calls[0][2].headers)).toEqual([
      "X-Idempotency-Key",
    ]);
    expect(secondKey).toBe(firstKey);
  });

  it("rotates the key after a successful response", async () => {
    post.mockResolvedValue({});

    await billingApi.createCheckout(checkout);
    await billingApi.createCheckout(checkout);

    expect(post.mock.calls[1][2].headers["X-Idempotency-Key"]).not.toBe(
      post.mock.calls[0][2].headers["X-Idempotency-Key"],
    );
  });

  it("does not reuse a pending key for a changed checkout payload", async () => {
    post.mockRejectedValue(new Error("network error"));
    const changedCheckout = { ...checkout, gateway: "STRIPE" as const };

    await expect(billingApi.createCheckout(checkout)).rejects.toThrow();
    await expect(billingApi.createCheckout(changedCheckout)).rejects.toThrow();

    expect(post.mock.calls[1][2].headers["X-Idempotency-Key"]).not.toBe(
      post.mock.calls[0][2].headers["X-Idempotency-Key"],
    );
  });
});

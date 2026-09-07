import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PaymentStatus } from "@akit/contracts";

const { getCheckoutAttemptStatus } = vi.hoisted(() => ({
  getCheckoutAttemptStatus: vi.fn(),
}));

vi.mock("../../api/billing.api", () => ({
  billingApi: { getCheckoutAttemptStatus },
}));

import { useCheckoutAttemptStatus } from "../useBilling";

const pendingStatus = {
  paymentState: "PENDING",
  fulfillmentState: "QUEUED",
  provider: "MERCADO_PAGO",
  providerFreshness: "NOT_OBSERVED",
  observedAt: null,
  staleAfter: null,
  checkoutAttemptId: "11111111-1111-4111-8111-111111111111",
  paymentEventId: null,
  voucherBatchId: null,
  commercialSnapshot: {
    kind: "COMPLETE",
    pricingPlanId: "11111111-1111-4111-8111-111111111111",
    planName: "Plan",
    voucherQuantity: 10,
    listedUsd: { amountMinor: "1000", currency: "USD" },
    charged: { amountMinor: "1000", currency: "USD" },
    gateway: "MERCADO_PAGO",
    fxRate: "1",
    fxQuotedAt: "2026-01-01T00:00:00.000Z",
    fxSource: "TEST",
  },
  chargedTotal: null,
  issuedVoucherCount: null,
  expectedVoucherCount: 10,
  voucherDiscrepancy: null,
} satisfies PaymentStatus;

describe("useCheckoutAttemptStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getCheckoutAttemptStatus.mockReset().mockResolvedValue(pendingStatus);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("polls unresolved attempts with progressively bounded intervals", async () => {
    const { result } = renderHook(() =>
      useCheckoutAttemptStatus("11111111-1111-4111-8111-111111111111"),
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(getCheckoutAttemptStatus).toHaveBeenCalledTimes(1);
    expect(result.current.isPolling).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(getCheckoutAttemptStatus).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(getCheckoutAttemptStatus).toHaveBeenCalledTimes(3);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
    });
    expect(getCheckoutAttemptStatus).toHaveBeenCalledTimes(4);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(getCheckoutAttemptStatus).toHaveBeenCalledTimes(5);
    expect(result.current.isExhausted).toBe(true);
    expect(result.current.isPolling).toBe(false);
  });

  it("does not poll while the document is hidden", async () => {
    const visibilityState = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("hidden");

    renderHook(() =>
      useCheckoutAttemptStatus("11111111-1111-4111-8111-111111111111"),
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(getCheckoutAttemptStatus).not.toHaveBeenCalled();

    visibilityState.mockReturnValue("visible");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });
    expect(getCheckoutAttemptStatus).toHaveBeenCalledTimes(1);
  });

  it("stops polling once the payment is terminal", async () => {
    getCheckoutAttemptStatus.mockResolvedValue({
      ...pendingStatus,
      paymentState: "FAILED",
    });

    const { result } = renderHook(() =>
      useCheckoutAttemptStatus("11111111-1111-4111-8111-111111111111"),
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.data?.paymentState).toBe("FAILED");
    expect(result.current.isPolling).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(getCheckoutAttemptStatus).toHaveBeenCalledTimes(1);
  });
});

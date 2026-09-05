import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePurchaseSummary } from "../usePurchaseSummary";
import { fetchPurchaseSummary } from "../../api/purchase-summary.api";

vi.mock("../../api/purchase-summary.api", () => ({ fetchPurchaseSummary: vi.fn() }));

const summary = {
  scope: "INSTITUTION" as const,
  institutionName: "A.kit",
  generatedAt: "2026-03-10T00:00:00.000Z",
  currentWindow: { from: "2026-03-03T00:00:00.000Z", to: "2026-03-10T00:00:00.000Z", days: 7 as const },
  priorWindow: { from: "2026-02-24T00:00:00.000Z", to: "2026-03-03T00:00:00.000Z", days: 7 as const },
  current: { accreditedPurchaseCount: 1, accreditedVoucherCount: 12, accreditedAmountByCurrency: [] },
  prior: { accreditedPurchaseCount: 0, accreditedVoucherCount: 0, accreditedAmountByCurrency: [] },
  alerts: { paidButNotFulfilledCount: 0, notificationAttentionCount: 0 },
  latestAccreditation: null,
};

describe("usePurchaseSummary", () => {
  it("does not fetch when disabled for therapists", () => {
    const { result } = renderHook(() => usePurchaseSummary(7, false));
    expect(fetchPurchaseSummary).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ data: null, error: null, loading: false });
  });

  it("retries and ignores a stale period response", async () => {
    let resolveSeven!: (value: typeof summary) => void;
    vi.mocked(fetchPurchaseSummary)
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSeven = resolve; }))
      .mockResolvedValueOnce({ ...summary, current: { ...summary.current, accreditedVoucherCount: 30 } });

    const { result, rerender } = renderHook(({ period }: { period: 7 | 30 | 90 }) => usePurchaseSummary(period, true), { initialProps: { period: 7 } });
    rerender({ period: 30 as const });
    resolveSeven(summary);

    await waitFor(() => expect(result.current.data?.current.accreditedVoucherCount).toBe(30));
    expect(fetchPurchaseSummary).toHaveBeenNthCalledWith(1, 7);
    expect(fetchPurchaseSummary).toHaveBeenNthCalledWith(2, 30);

    vi.mocked(fetchPurchaseSummary).mockResolvedValueOnce(summary);
    result.current.retry();
    await waitFor(() => expect(fetchPurchaseSummary).toHaveBeenCalledTimes(3));
  });
});

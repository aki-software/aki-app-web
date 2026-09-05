import { beforeEach, describe, expect, it } from "vitest";
import { apiClient } from "../../../../api/client";
import { mockEndpoint, resetMockApi } from "../../../../test/mock-api-client";
import { fetchPurchaseSummary } from "../purchase-summary.api";

const summary = {
  scope: "INSTITUTION",
  institutionName: "A.kit",
  generatedAt: "2026-03-10T00:00:00.000Z",
  currentWindow: { from: "2026-03-03T00:00:00.000Z", to: "2026-03-10T00:00:00.000Z", days: 7 },
  priorWindow: { from: "2026-02-24T00:00:00.000Z", to: "2026-03-03T00:00:00.000Z", days: 7 },
  current: { accreditedPurchaseCount: 1, accreditedVoucherCount: 12, accreditedAmountByCurrency: [{ currency: "ARS", amount: "2500.00" }] },
  prior: { accreditedPurchaseCount: 0, accreditedVoucherCount: 0, accreditedAmountByCurrency: [] },
  alerts: { paidButNotFulfilledCount: 0, notificationAttentionCount: 0 },
  latestAccreditation: { accreditedAt: "2026-03-08T00:00:00.000Z", voucherCount: 12, amount: { currency: "ARS", amount: "2500.00" } },
};

describe("fetchPurchaseSummary", () => {
  beforeEach(resetMockApi);

  it("sends only the selected period and parses the contract response", async () => {
    mockEndpoint("get", "/payments/purchase-summary", summary);

    await expect(fetchPurchaseSummary(7)).resolves.toMatchObject({ scope: "INSTITUTION", current: { accreditedVoucherCount: 12 } });
    expect(apiClient.get).toHaveBeenCalledWith("/payments/purchase-summary", { params: { periodDays: "7" } });
  });

  it("rejects an invalid response instead of normalizing it", async () => {
    mockEndpoint("get", "/payments/purchase-summary", { ...summary, current: { ...summary.current, accreditedVoucherCount: -1 } });

    await expect(fetchPurchaseSummary(7)).rejects.toThrow();
  });
});

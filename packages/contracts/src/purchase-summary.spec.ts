import { describe, expect, it } from "vitest";
import {
  PurchaseSummaryQuery,
  PurchaseSummaryResponse,
} from "./purchase-summary";

const common = {
  generatedAt: "2026-02-01T00:00:00.000Z",
  currentWindow: { from: "2026-01-25T00:00:00.000Z", to: "2026-02-01T00:00:00.000Z", days: 7 },
  priorWindow: { from: "2026-01-18T00:00:00.000Z", to: "2026-01-25T00:00:00.000Z", days: 7 },
  current: { accreditedPurchaseCount: 2, accreditedVoucherCount: 4, accreditedAmountByCurrency: [{ currency: "USD", amount: "10.50" }] },
  prior: { accreditedPurchaseCount: 1, accreditedVoucherCount: 2, accreditedAmountByCurrency: [] },
  alerts: { paidButNotFulfilledCount: 1, notificationAttentionCount: 2 },
  latestAccreditation: { accreditedAt: "2026-01-31T00:00:00.000Z", voucherCount: 2, amount: { currency: "USD", amount: "10.50" } },
};

describe("PurchaseSummary contracts", () => {
  it("coerces the default and only permitted period lengths", () => {
    expect(PurchaseSummaryQuery.parse({})).toEqual({ periodDays: 7 });
    expect(PurchaseSummaryQuery.parse({ periodDays: "30" })).toEqual({ periodDays: 30 });
    for (const periodDays of [6, 8, 91, "7.5", "DROP TABLE"]) {
      expect(PurchaseSummaryQuery.safeParse({ periodDays }).success).toBe(false);
    }
    expect(PurchaseSummaryQuery.safeParse({ periodDays: 7, institutionId: "no" }).success).toBe(false);
  });

  it("accepts both discriminated scopes and currency-separated amounts", () => {
    expect(PurchaseSummaryResponse.parse({ ...common, scope: "PLATFORM", current: { ...common.current, purchasingInstitutionCount: 2 }, prior: { ...common.prior, purchasingInstitutionCount: 1 }, latestAccreditation: { ...common.latestAccreditation, institutionName: "A.kit" } })).toMatchObject({ scope: "PLATFORM" });
    expect(PurchaseSummaryResponse.parse({ ...common, scope: "INSTITUTION", institutionName: "A.kit" })).toMatchObject({ scope: "INSTITUTION", institutionName: "A.kit" });
  });

  it("rejects unsafe fields and invalid public values", () => {
    expect(PurchaseSummaryResponse.safeParse({ ...common, scope: "INSTITUTION", institutionName: "A.kit", voucherBatchId: "secret" }).success).toBe(false);
    expect(PurchaseSummaryResponse.safeParse({ ...common, scope: "PLATFORM", current: { ...common.current, purchasingInstitutionCount: 1 }, prior: { ...common.prior, purchasingInstitutionCount: 1 }, generatedAt: "not-a-date" }).success).toBe(false);
    expect(PurchaseSummaryResponse.safeParse({ ...common, scope: "INSTITUTION", institutionName: "A.kit", current: { ...common.current, accreditedPurchaseCount: -1 } }).success).toBe(false);
    expect(PurchaseSummaryResponse.safeParse({ ...common, scope: "INSTITUTION", institutionName: "A.kit", current: { ...common.current, accreditedAmountByCurrency: [{ currency: "usd", amount: "1e2" }] } }).success).toBe(false);
  });
});

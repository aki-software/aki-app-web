import { describe, expect, it } from "vitest";
import { purchaseComparison } from "../purchase-summary-presenters";

describe("purchaseComparison", () => {
  it("does not invent a percentage when the prior equivalent window is zero", () => {
    expect(purchaseComparison(12, 0)).toBeNull();
  });

  it("formats meaningful comparisons safely", () => {
    expect(purchaseComparison(15, 10)).toBe("+50% respecto del período anterior.");
  });
});

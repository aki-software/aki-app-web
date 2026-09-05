import { describe, expect, it } from "vitest";
import {
  purchaseAmountComparison,
  purchaseAmountPresentation,
  purchaseComparison,
} from "../purchase-summary-presenters";

describe("purchaseComparison", () => {
  it("does not invent a percentage when the prior equivalent window is zero", () => {
    expect(purchaseComparison(12, 0)).toBeNull();
  });

  it("formats meaningful comparisons safely", () => {
    expect(purchaseComparison(15, 10)).toBe("+50% respecto del período anterior.");
  });

  it("keeps currency totals separate for none, one, and multiple currencies", () => {
    expect(purchaseAmountPresentation([]).value).toBe("Sin compras");
    expect(purchaseAmountPresentation([{ currency: "USD", amount: "25.00" }]).value).toMatch(/25/);
    const multiple = purchaseAmountPresentation([
      { currency: "USD", amount: "25.00" },
      { currency: "ARS", amount: "1000.00" },
    ]);
    expect(multiple.value).toBe("2 monedas");
    expect(multiple.description).toMatch(/25/);
    expect(multiple.description).toMatch(/1[.\u00a0]?000/);
  });

  it("only compares amounts with exactly one matching currency and a non-zero prior", () => {
    expect(purchaseAmountComparison(
      [{ currency: "USD", amount: "25.00" }],
      [{ currency: "USD", amount: "0.00" }],
    )).toBeNull();
    expect(purchaseAmountComparison(
      [{ currency: "USD", amount: "25.00" }],
      [{ currency: "ARS", amount: "10.00" }],
    )).toBeNull();
    expect(purchaseAmountComparison(
      [{ currency: "USD", amount: "25.00" }, { currency: "ARS", amount: "10.00" }],
      [{ currency: "USD", amount: "10.00" }],
    )).toBeNull();
  });
});

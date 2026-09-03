import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";

describe("formatMoney", () => {
  it("formats ARS minor units without losing precision", () => {
    expect(formatMoney({ amountMinor: "1540000", currency: "ARS" })).toBe(
      "ARS 15.400,00",
    );
    expect(
      formatMoney({ amountMinor: "900719925474099312345678", currency: "ARS" }),
    ).toBe("ARS 9.007.199.254.740.993.123.456,78");
  });

  it("formats USD minor units", () => {
    expect(formatMoney({ amountMinor: "1540000", currency: "USD" })).toBe(
      "USD 15,400.00",
    );
  });

  it("formats negative and zero minor units", () => {
    expect(formatMoney({ amountMinor: "-1050", currency: "ARS" })).toBe(
      "ARS -10,50",
    );
    expect(formatMoney({ amountMinor: "0", currency: "USD" })).toBe(
      "USD 0.00",
    );
  });
});

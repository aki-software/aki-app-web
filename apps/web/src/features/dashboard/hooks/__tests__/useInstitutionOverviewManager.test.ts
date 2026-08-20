import { describe, expect, it } from "vitest";
import { isLowVoucherStock, LOW_STOCK_ALERT_THRESHOLD } from "../useInstitutionOverviewManager";

describe("isLowVoucherStock", () => {
  it("shows the alert at or below the configured available-voucher threshold", () => {
    expect(isLowVoucherStock(LOW_STOCK_ALERT_THRESHOLD)).toBe(true);
    expect(isLowVoucherStock(LOW_STOCK_ALERT_THRESHOLD - 1)).toBe(true);
  });

  it("does not show the alert above the configured threshold", () => {
    expect(isLowVoucherStock(LOW_STOCK_ALERT_THRESHOLD + 1)).toBe(false);
  });
});

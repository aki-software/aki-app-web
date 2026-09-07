import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatPaymentTimestamp,
  paymentGatewayLabel,
} from "../payment-presenters";

describe("paymentGatewayLabel", () => {
  it("labels each payment origin without treating an administrative assignment as Stripe", () => {
    expect(paymentGatewayLabel(null)).toBe("Asignación administrativa");
    expect(paymentGatewayLabel("MERCADO_PAGO")).toBe("Mercado Pago");
    expect(paymentGatewayLabel("STRIPE")).toBe("Stripe");
  });
});

describe("formatPaymentTimestamp", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("formats a UTC instant in the Argentina timezone", () => {
    expect(formatPaymentTimestamp("2026-09-03T16:57:00.000Z")).toBe(
      "3 de septiembre de 2026, 13:57",
    );
  });

  it("assembles a stable Spanish timestamp from locale date parts", () => {
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(function () {
      return {
        format: () => "3/9/2026, 13:57",
        formatToParts: () => [
          { type: "day", value: "3" },
          { type: "literal", value: " de " },
          { type: "month", value: "septiembre" },
          { type: "literal", value: " de " },
          { type: "year", value: "2026" },
          { type: "literal", value: ", " },
          { type: "hour", value: "13" },
          { type: "literal", value: ":" },
          { type: "minute", value: "57" },
        ],
      } as Intl.DateTimeFormat;
    });

    expect(formatPaymentTimestamp("2026-09-03T16:57:00.000Z")).toBe(
      "3 de septiembre de 2026, 13:57",
    );
  });
});

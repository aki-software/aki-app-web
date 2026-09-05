import { render, screen } from "@testing-library/react";
import type { AdminPaymentLedgerDetail } from "@akit/contracts";
import { describe, expect, it } from "vitest";
import { LedgerDetail } from "../LedgerDetail";

const entry: AdminPaymentLedgerDetail = {
  voucherBatchId: "11111111-1111-4111-8111-111111111111",
  checkoutAttemptId: "22222222-2222-4222-8222-222222222222",
  paymentEventId: "33333333-3333-4333-8333-333333333333",
  institution: {
    id: "44444444-4444-4444-8444-444444444444",
    name: "Instituto Norte",
  },
  buyer: {
    userId: "55555555-5555-4555-8555-555555555555",
    name: "compras@instituto.edu.ar",
    email: "compras@instituto.edu.ar",
  },
  commercial: { pricingPlanId: null, planName: "Plan Anual" },
  amount: { value: "1500.00", currency: "ARS" },
  payment: {
    gateway: "MERCADO_PAGO",
    externalReference: "MP-123",
    settledAt: "2026-09-03T16:57:00.000Z",
  },
  fulfillment: {
    state: "FULFILLED",
    fulfilledAt: "2026-09-03T16:57:00.000Z",
    expectedVoucherCount: 10,
    actualVoucherCount: 10,
    discrepancy: 0,
  },
  operationalState: "ACCREDITED",
  notifications: { buyer: null, platformAdmin: null },
};

describe("LedgerDetail", () => {
  it("uses plain-language detail fields, deduplicates the buyer identity, and keeps technical data collapsed", () => {
    render(<LedgerDetail entry={entry} />);

    expect(screen.getByText("Comprador")).toBeDefined();
    expect(screen.getByText("Correo del comprador")).toBeDefined();
    expect(screen.getAllByText("compras@instituto.edu.ar")).toHaveLength(1);
    expect(screen.getByText("Fecha de pago")).toBeDefined();
    expect(screen.getAllByText("3 de septiembre de 2026, 13:57")).toHaveLength(
      2,
    );
    expect(screen.getByText("Acreditación completada")).toBeDefined();
    expect(screen.getByText("10 vouchers acreditados")).toBeDefined();
    expect(screen.queryByText(/diferencia/i)).toBeNull();
    expect(
      screen.getAllByText("No se registró una notificación para esta compra."),
    ).toHaveLength(2);

    const technicalData = screen.getByText("Datos técnicos").closest("details");
    expect(technicalData).not.toBeNull();
    expect(technicalData).not.toHaveAttribute("open");
    expect(technicalData).toHaveTextContent("MP-123");
  });

  it("keeps a voucher discrepancy visible as an attention message", () => {
    render(
      <LedgerDetail
        entry={{
          ...entry,
          fulfillment: {
            ...entry.fulfillment,
            actualVoucherCount: 9,
            discrepancy: -1,
          },
        }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Se esperaban 10 vouchers y se acreditaron 9 (diferencia: -1).",
    );
  });
});

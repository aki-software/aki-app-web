import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import type { AdminPaymentLedgerEntry } from "@akit/contracts";
import { describe, expect, it, vi } from "vitest";
import { AdminPaymentLedgerPage } from "../AdminPaymentLedgerPage";

const entry: AdminPaymentLedgerEntry = {
  voucherBatchId: "11111111-1111-4111-8111-111111111111",
  checkoutAttemptId: null,
  paymentEventId: null,
  institution: {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Instituto Norte",
  },
  buyer: null,
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

const entries: AdminPaymentLedgerEntry[] = [
  entry,
  {
    ...entry,
    voucherBatchId: "33333333-3333-4333-8333-333333333333",
    operationalState: "PENDING_ACCREDITATION",
  },
  {
    ...entry,
    voucherBatchId: "44444444-4444-4444-8444-444444444444",
    operationalState: "ACCREDITED_NOTIFICATION_ATTENTION",
  },
];

vi.mock("../../hooks/usePaymentLedger", () => ({
  usePaymentLedger: () => {
    const [sort, setSort] = useState("SETTLED_DESC");

    return {
      page: 1,
      filters: {},
      sort,
      data: {
        items: entries,
        page: 1,
        pageSize: 25,
        total: 3,
        totalPages: 1,
        sort,
      },
      detail: null,
      selectedBatchId: null,
      isLoading: false,
      isDetailLoading: false,
      error: null,
      detailError: null,
      load: vi.fn(),
      selectBatch: vi.fn(),
      closeDetail: vi.fn(),
      updateFilters: vi.fn(),
      updateSort: setSort,
      previousPage: vi.fn(),
      nextPage: vi.fn(),
    };
  },
}));

describe("AdminPaymentLedgerPage", () => {
  it("shows semantic operational badges and compact Argentina dates in the ledger", () => {
    render(<AdminPaymentLedgerPage />);

    const accredited = screen.getAllByText("Acreditado")[0];
    expect(accredited).toHaveClass("bg-status-success/10");
    expect(accredited).toHaveClass("text-status-success");
    expect(screen.getAllByText("Pendiente de acreditación")[0]).toHaveClass(
      "bg-status-warning/10",
    );
    const attentionStatuses = screen.getAllByText("Notificación pendiente");
    expect(attentionStatuses).toHaveLength(2);
    expect(attentionStatuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ className: expect.stringContaining("whitespace-nowrap") }),
      ]),
    );
    attentionStatuses.forEach((status) => {
      expect(status.previousElementSibling).toHaveClass("bg-status-success/10");
      expect(status.previousElementSibling).toHaveClass("text-status-success");
    });
    expect(screen.queryByText(/revisar aviso/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/3.*sept.*2026/i)).not.toHaveLength(0);
  });

  it("shows icon sort affordances and exposes the active direction", () => {
    render(<AdminPaymentLedgerPage />);

    const sortButtons = [
      "Fecha",
      "Institución",
      "Plan",
      "Monto",
      "Pasarela",
      "Estado",
    ].map((label) => screen.getByRole("button", { name: new RegExp(`Ordenar por ${label}`, "i") }));

    expect(sortButtons).toHaveLength(6);
    sortButtons.forEach((button) => {
      expect(button).toHaveAttribute("aria-pressed");
      expect(button.querySelector("svg")).not.toBeNull();
    });

    const dateSort = screen.getByRole("button", {
      name: "Ordenar por Fecha ascendente",
    });
    expect(dateSort).toHaveAttribute("aria-pressed", "true");
    expect(dateSort.querySelector(".lucide-arrow-down")).not.toBeNull();
    fireEvent.click(dateSort);
    expect(dateSort).toHaveAccessibleName("Ordenar por Fecha descendente");
    expect(dateSort.querySelector(".lucide-arrow-up")).not.toBeNull();
  });
});

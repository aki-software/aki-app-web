import { render, screen } from "@testing-library/react";
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
  usePaymentLedger: () => ({
    page: 1,
    filters: {},
    sort: "SETTLED_DESC",
    data: {
      items: entries,
      page: 1,
      pageSize: 25,
      total: 3,
      totalPages: 1,
      sort: "SETTLED_DESC",
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
    updateSort: vi.fn(),
    previousPage: vi.fn(),
    nextPage: vi.fn(),
  }),
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
    expect(screen.getAllByText("Acreditado · revisar aviso")[0]).toHaveClass(
      "bg-status-error/10",
    );
    expect(screen.getAllByText(/3.*sept.*2026/i)).not.toHaveLength(0);
  });
});

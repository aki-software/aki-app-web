import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { BillingDashboard } from "../BillingDashboard";
import {
  useBillingHistory,
  useCheckoutAttemptStatus,
  usePricingPlans,
} from "../../hooks/useBilling";
import { CHECKOUT_ATTEMPT_STORAGE_KEY } from "../../components/BuyVouchersModal";

vi.mock("../../hooks/useBilling", () => ({
  useBillingHistory: vi.fn(),
  usePricingPlans: vi.fn(),
  useCheckoutAttemptStatus: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
  isTerminalCheckoutStatus: vi.fn(
    (status: { paymentState: string; fulfillmentState: string }) =>
      ["FAILED", "EXPIRED", "CANCELLED", "REFUNDED"].includes(status.paymentState) ||
      (status.paymentState === "PAID" &&
        ["FULFILLED", "REVOKED", "BLOCKED"].includes(status.fulfillmentState)),
  ),
  useCheckout: vi.fn(() => ({ mutateAsync: vi.fn(), isMutating: false })),
}));

vi.mock("lucide-react", async (importOriginal) => {
  const actual =
    await importOriginal<
      Record<string, React.ComponentType<Record<string, unknown>>>
    >();
  const MockIcon = (props: Record<string, unknown>) => {
    const { ...rest } = props ?? {};
    return React.createElement("span", { "data-testid": "mock-icon", ...rest });
  };
  const mocked: Record<
    string,
    React.ComponentType<Record<string, unknown>>
  > = {};
  for (const key of Object.keys(actual)) {
    mocked[key] = MockIcon;
  }
  return mocked;
});

describe("BillingDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    window.history.replaceState({}, "", "/billing");
    (useCheckoutAttemptStatus as Mock).mockReturnValue({
      data: null,
      isLoading: false,
      isPolling: false,
      isExhausted: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("renders empty state correctly when there are no plans", () => {
    (useBillingHistory as Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });
    (usePricingPlans as Mock).mockReturnValue({ data: [], isLoading: false });

    render(<BillingDashboard />);

    expect(
      screen.getByText("No hay planes disponibles por el momento."),
    ).toBeDefined();
  });

  it("renders plans correctly", () => {
    (useBillingHistory as Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });
    (usePricingPlans as Mock).mockReturnValue({
      data: [
        {
          id: "plan-1",
          name: "Plan 10",
          voucherQuantity: 10,
          priceUsd: 10,
          description: "Desc",
          isActive: true,
        },
      ],
      isLoading: false,
    });

    render(<BillingDashboard />);

    expect(screen.getByText("Plan 10")).toBeDefined();
    expect(screen.getByText("10 Vouchers")).toBeDefined();
    expect(screen.getByText("$10")).toBeDefined();
    expect(screen.getByText("USD")).toBeDefined();
    const btn = screen.getByRole("button", { name: "Adquirir lote" });
    expect(btn).toBeEnabled();
  });

  it("communicates payment confirmation and disables new purchases while unresolved", () => {
    sessionStorage.setItem(
      CHECKOUT_ATTEMPT_STORAGE_KEY,
      "11111111-1111-4111-8111-111111111111",
    );
    (useBillingHistory as Mock).mockReturnValue({ data: null, isLoading: false });
    (usePricingPlans as Mock).mockReturnValue({
      data: [
        {
          id: "plan-1",
          name: "Plan 10",
          voucherQuantity: 10,
          priceUsd: 10,
          description: "Desc",
          isActive: true,
        },
      ],
      isLoading: false,
    });
    (useCheckoutAttemptStatus as Mock).mockReturnValue({
      data: { paymentState: "PAID", fulfillmentState: "QUEUED" },
      isLoading: false,
      isPolling: true,
      isExhausted: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<BillingDashboard />);

    expect(screen.getByText("Pago confirmado. Emitiendo vouchers…")).toBeDefined();
    expect(screen.getByText("Confirmación en curso. Esperá antes de iniciar otra compra.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Adquirir lote" })).toBeDisabled();
        expect(screen.queryByRole("button", { name: "Actualizar" })).toBeNull();

        fireEvent.click(screen.getByRole("button", { name: "Descartar seguimiento" }));
        expect(screen.getByRole("button", { name: "Adquirir lote" })).toBeEnabled();
        expect(sessionStorage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY)).toBeNull();
      });

      it.each([
        ["BLOCKED", "Emisión bloqueada. Contactá a soporte."],
        ["REVOKED", "Vouchers revocados."],
      ])("renders PAID %s fulfillment accurately", (fulfillmentState, message) => {
        (useBillingHistory as Mock).mockReturnValue({ data: null, isLoading: false });
        (usePricingPlans as Mock).mockReturnValue({ data: [], isLoading: false });
        (useCheckoutAttemptStatus as Mock).mockReturnValue({
          data: { paymentState: "PAID", fulfillmentState },
          isLoading: false,
          isExhausted: false,
          error: null,
          refetch: vi.fn(),
        });

        window.history.replaceState(
          {},
          "",
          "/billing?checkoutAttemptId=11111111-1111-4111-8111-111111111111",
        );
        render(<BillingDashboard />);
        expect(screen.getByText(message)).toBeDefined();
      });
    });

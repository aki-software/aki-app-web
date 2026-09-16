import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { PlatformDashboardSummary } from "../PlatformDashboardSummary";

const purchaseData = {
  scope: "PLATFORM" as const,
  generatedAt: "2026-03-10T00:00:00.000Z",
  currentWindow: { from: "2026-03-03T00:00:00.000Z", to: "2026-03-10T00:00:00.000Z", days: 7 as const },
  priorWindow: { from: "2026-02-24T00:00:00.000Z", to: "2026-03-03T00:00:00.000Z", days: 7 as const },
  current: {
    accreditedPurchaseCount: 2,
    accreditedVoucherCount: 20,
    purchasingInstitutionCount: 2,
    accreditedAmountByCurrency: [{ currency: "USD", amount: "50.00" }],
  },
  prior: {
    accreditedPurchaseCount: 1,
    accreditedVoucherCount: 10,
    purchasingInstitutionCount: 1,
    accreditedAmountByCurrency: [{ currency: "USD", amount: "25.00" }],
  },
  alerts: { paidButNotFulfilledCount: 1, notificationAttentionCount: 2 },
  latestAccreditation: null,
};

function renderSummary(props: Partial<React.ComponentProps<typeof PlatformDashboardSummary>> = {}) {
  return render(
    <MemoryRouter>
      <PlatformDashboardSummary
        purchaseData={purchaseData}
        purchaseLoading={false}
        purchaseError={null}
        onRetry={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("PlatformDashboardSummary", () => {
  it("renders exactly four primary metrics without duplicating operational alerts", () => {
    renderSummary();
    expect(screen.getAllByText(/Facturación Acreditada|Vouchers Canjeados|Tasa de Finalización|Instituciones Activas/)).toHaveLength(4);
    expect(screen.queryByText("1 pago(s) pendiente(s) de acreditación")).toBeNull();
    expect(screen.queryByText("2 notificación(es) de pago fallida(s)")).toBeNull();
  });

  it("does not combine multiple currencies", () => {
    renderSummary({
      purchaseData: {
        ...purchaseData,
        current: { ...purchaseData.current, accreditedAmountByCurrency: [
          { currency: "USD", amount: "50.00" }, { currency: "ARS", amount: "1000.00" },
        ] },
      },
    });
    const amountCard = screen.getByText("Facturación Acreditada").closest(".app-card");
    expect(screen.getByText("2 monedas")).toBeDefined();
    expect(amountCard).not.toHaveTextContent(/respecto del período anterior/);
  });

  it("shows loading copy while purchase metrics load", () => {
    renderSummary({ purchaseData: null, purchaseLoading: true });
    // Tasa de Finalización and Vouchers Activos vs Canjeados show "—" when adminStats is null,
    // and Facturación Acreditada and Instituciones Activas show "Cargando compras…"
    expect(screen.getAllByText("Cargando compras…")).toHaveLength(2);
    expect(screen.queryByText("Datos no disponibles.")).toBeNull();
  });

  it("shows unavailable values and a retry control when purchase metrics fail", () => {
    const onRetry = vi.fn();
    renderSummary({ purchaseData: null, purchaseError: new Error("failed"), onRetry });
    expect(screen.getByRole("alert")).toHaveTextContent("métricas de compras no están disponibles");
    screen.getByRole("button", { name: "Reintentar" }).click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("keeps the summary free of technical alert copy", () => {
    renderSummary();
    expect(screen.queryByText(/PLATFORM|FULFILLED|[0-9a-f]{8}-/i)).toBeNull();
  });
});

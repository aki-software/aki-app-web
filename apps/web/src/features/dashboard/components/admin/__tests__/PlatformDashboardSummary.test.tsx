import { fireEvent, render, screen } from "@testing-library/react";
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
        triageCount={3}
        institutionAlertsCount={1}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("PlatformDashboardSummary", () => {
  it("renders exactly four primary metrics and separate conditional alerts", () => {
    renderSummary();
    expect(screen.getAllByText(/Vouchers acreditados|Monto acreditado|Instituciones compradoras|Sesiones por revisar/)).toHaveLength(4);
    expect(screen.getByText("1 compra pendiente de acreditación")).toBeDefined();
    expect(screen.getByText("2 notificaciones de compra no enviadas")).toBeDefined();
    expect(screen.getByText("1 alerta institucional pendiente")).toBeDefined();
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
    const amountCard = screen.getByText("Monto acreditado").closest(".app-card");
    expect(screen.getByText("2 monedas")).toBeDefined();
    expect(amountCard).not.toHaveTextContent(/respecto del período anterior/);
  });

      it("uses plural institution alert copy", () => {
        renderSummary({ institutionAlertsCount: 2 });
        expect(screen.getByText("2 alertas institucionales pendientes")).toBeDefined();
      });

      it("shows loading copy while purchase metrics load", () => {
        renderSummary({ purchaseData: null, purchaseLoading: true });
        expect(screen.getAllByText("Cargando compras…")).toHaveLength(3);
        expect(screen.queryByText("Datos de compras no disponibles.")).toBeNull();
      });

      it("shows unavailable values and a retry control when purchase metrics fail", () => {
    const onRetry = vi.fn();
    renderSummary({ purchaseData: null, purchaseError: new Error("failed"), onRetry, triageCount: null });
    expect(screen.getByRole("alert")).toHaveTextContent("métricas de compras no están disponibles");
    screen.getByRole("button", { name: "Reintentar" }).click();
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByText("Datos de sesiones no disponibles.")).toBeDefined();
  });

  it("dismisses alerts independently by type and exposes accessible close controls", () => {
    renderSummary();
    const purchaseClose = screen.getByRole("button", { name: "Cerrar alerta de compras pendientes de acreditación" });
    const notificationClose = screen.getByRole("button", { name: "Cerrar alerta de notificaciones de compra" });
    const institutionClose = screen.getByRole("button", { name: "Cerrar alerta institucional" });

    for (const closeButton of [purchaseClose, notificationClose, institutionClose]) {
      expect(closeButton.className).toContain("min-h-11");
      expect(closeButton.className).toContain("min-w-11");
    }

    fireEvent.click(purchaseClose);
    expect(screen.queryByText("1 compra pendiente de acreditación")).toBeNull();
    expect(screen.getByText("2 notificaciones de compra no enviadas")).toBeDefined();
    expect(screen.getByText("1 alerta institucional pendiente")).toBeDefined();
  });

  it("keeps a dismissed alert hidden at the same count but re-shows it when the count changes", () => {
    const { rerender } = renderSummary();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar alerta de compras pendientes de acreditación" }));

    rerender(
      <MemoryRouter>
        <PlatformDashboardSummary
          purchaseData={purchaseData}
          purchaseLoading={false}
          purchaseError={null}
          onRetry={vi.fn()}
          triageCount={3}
          institutionAlertsCount={1}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByText("1 compra pendiente de acreditación")).toBeNull();

    rerender(
      <MemoryRouter>
        <PlatformDashboardSummary
          purchaseData={{
            ...purchaseData,
            alerts: { ...purchaseData.alerts, paidButNotFulfilledCount: 2 },
          }}
          purchaseLoading={false}
          purchaseError={null}
          onRetry={vi.fn()}
          triageCount={3}
          institutionAlertsCount={1}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("2 compras pendientes de acreditación")).toBeDefined();
  });

  it("uses text-based alert links with no technical copy", () => {
    renderSummary();
    for (const link of screen.getAllByRole("link")) {
      expect(link.className).toContain("min-h-11");
    }
    expect(screen.queryByText(/PLATFORM|FULFILLED|[0-9a-f]{8}-/i)).toBeNull();
  });
});

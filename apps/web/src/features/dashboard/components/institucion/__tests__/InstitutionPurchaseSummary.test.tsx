import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { InstitutionPurchaseSummary } from "../InstitutionPurchaseSummary";

const data = {
  scope: "INSTITUTION" as const,
  institutionName: "A.kit",
  generatedAt: "2026-03-10T00:00:00.000Z",
  currentWindow: { from: "2026-03-03T00:00:00.000Z", to: "2026-03-10T00:00:00.000Z", days: 7 as const },
  priorWindow: { from: "2026-02-24T00:00:00.000Z", to: "2026-03-03T00:00:00.000Z", days: 7 as const },
  current: { accreditedPurchaseCount: 1, accreditedVoucherCount: 12, accreditedAmountByCurrency: [{ currency: "ARS", amount: "2500.00" }] },
  prior: { accreditedPurchaseCount: 0, accreditedVoucherCount: 0, accreditedAmountByCurrency: [] },
  alerts: { paidButNotFulfilledCount: 1, notificationAttentionCount: 1 },
  latestAccreditation: { accreditedAt: "2026-03-08T00:00:00.000Z", voucherCount: 12, amount: { currency: "ARS", amount: "2500.00" } },
};

function renderSummary(overrides = {}) {
  return render(<MemoryRouter><InstitutionPurchaseSummary data={data} error={null} loading={false} onRetry={vi.fn()} unassignedAvailable={3} {...overrides} /></MemoryRouter>);
}

describe("InstitutionPurchaseSummary", () => {
  it("shows the latest accredited purchase, secondary inventory, buyer-friendly warnings and billing actions", () => {
    renderSummary();
    expect(screen.getByText("Última compra acreditada")).toBeDefined();
    expect(screen.getByText(/12 vouchers acreditados/)).toBeDefined();
    expect(screen.getByText(/\$\s?2\.500,00/)).toBeDefined();
    expect(screen.getByText(/3 vouchers sin asignar listos para enviar/)).toBeDefined();
    expect(screen.getByText("1 compra pendiente de acreditación")).toBeDefined();
    expect(screen.getByText("1 notificación de compra no enviada")).toBeDefined();
    const billingLink = screen.getByRole("link", { name: /Ver compras y saldo/ });
    expect(billingLink.getAttribute("href")).toBe("/dashboard/billing");
    expect(billingLink.className).toContain("min-h-11");
    expect(screen.getByRole("link", { name: "1 compra pendiente de acreditación" }).className).toContain("min-h-11");
    expect(screen.getByRole("link", { name: "1 notificación de compra no enviada" }).className).toContain("min-h-11");
  });

      it("shows an explicit error and retries rather than a zero-like healthy state", () => {
        const onRetry = vi.fn();
        renderSummary({ data: null, error: new Error("offline"), onRetry });
        expect(screen.getByRole("alert").textContent).toContain("No pudimos cargar el resumen de compras");
        const retryButton = screen.getByRole("button", { name: "Reintentar" });
        expect(retryButton.className).toContain("min-h-11");
        fireEvent.click(retryButton);
        expect(onRetry).toHaveBeenCalledOnce();
      });

      it.each([
        [1, "1 voucher sin asignar listo para enviar"],
        [2, "2 vouchers sin asignar listos para enviar"],
        [0, "0 vouchers sin asignar listos para enviar"],
      ])("uses natural count-aware inventory copy for %s", (count, copy) => {
        renderSummary({ unassignedAvailable: count });
        expect(screen.getByText(new RegExp(copy))).toBeDefined();
      });

      it.each([
        [1, "1 notificación de compra no enviada"],
        [2, "2 notificaciones de compra no enviadas"],
      ])("uses count-aware notification copy for %s", (count, copy) => {
        renderSummary({ data: { ...data, alerts: { ...data.alerts, notificationAttentionCount: count } } });
        expect(screen.getByText(copy)).toBeDefined();
      });
});

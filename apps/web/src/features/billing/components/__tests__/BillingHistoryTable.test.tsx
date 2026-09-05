import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PaymentTransaction } from "@akit/contracts";
import { BillingHistoryTable } from "../BillingHistoryTable";

const transactions: PaymentTransaction[] = Array.from(
  { length: 7 },
  (_, index) => ({
    id: `11111111-1111-4111-8111-${String(index + 1).padStart(12, "0")}`,
    gateway: index % 2 === 0 ? "MERCADO_PAGO" : "STRIPE",
    externalReference: `REF-${index + 1}`,
    status: index % 2 === 0 ? "APPROVED" : "PENDING",
    amount: (index + 1) * 100,
    currency: "USD",
    createdAt: `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    plan: {
      id: `22222222-2222-4222-8222-${String(index + 1).padStart(12, "0")}`,
      name: index === 0 ? "Plan Inicial" : `Plan ${index + 1}`,
      voucherQuantity: 10,
      priceUsd: 10,
      isActive: true,
    },
  }),
);

describe("BillingHistoryTable", () => {
  it("filters the complete client-side history, sorts it, and resets to the first page", () => {
    render(<BillingHistoryTable transactions={transactions} />);

    expect(screen.getByText("1–6 de 7")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Página 2" }));
    expect(screen.getByText("7–7 de 7")).toBeDefined();

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Buscar compras" }),
      {
        target: { value: "mercado pago" },
      },
    );

    expect(screen.getByText("1–4 de 4")).toBeDefined();
    expect(screen.getAllByText("Plan Inicial")).not.toHaveLength(0);
    expect(screen.queryByText("Plan 2")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Ordenar por monto/ }));
    expect(
      screen.getByRole("button", { name: "Ordenar por monto descendente" }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /Ordenar por fecha/ }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /Ordenar por plan/ }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /Ordenar por medio/ }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /Ordenar por estado/ }),
    ).toBeDefined();

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Buscar compras" }),
      {
        target: { value: "REF-7" },
      },
    );
    expect(screen.getByText("1–1 de 1")).toBeDefined();
    expect(screen.getAllByText("Plan 7")).not.toHaveLength(0);
  });

  it("opens a purchase detail dialog with only commercial fields", () => {
    render(<BillingHistoryTable transactions={transactions} />);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Ver detalle de compra" })[0],
    );

    const dialog = screen.getByRole("dialog", { name: "Detalle de compra" });
    expect(dialog).toHaveTextContent("Plan 7");
    expect(dialog).toHaveTextContent("Mercado Pago");
    expect(dialog).toHaveTextContent("REF-7");
    expect(dialog).not.toHaveTextContent("voucherBatchId");
  });
});

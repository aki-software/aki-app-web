import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LowStockAlert } from "../LowStockAlert";

describe("LowStockAlert", () => {
  it("uses semantic warning tokens without light-mode overrides", () => {
    const { container } = render(
      <LowStockAlert available={3} threshold={3} onDismiss={vi.fn()} onNavigate={vi.fn()} />,
    );

    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("border-status-warning/30");
    expect(alert.className).toContain("bg-status-warning/10");
    expect(alert.className).not.toContain("warning-bg");
    expect(alert.className).not.toContain("shadow-2xl");
    expect(container.querySelector("[class*='dark:bg-']")).toBeNull();
  });

  it("retains accessible dismissal and navigation actions", () => {
    const onDismiss = vi.fn();
    const onNavigate = vi.fn();
    render(<LowStockAlert available={3} threshold={3} onDismiss={onDismiss} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByLabelText("Cerrar alerta de bajo stock"));
    fireEvent.click(screen.getByRole("button", { name: /ver vouchers/i }));

    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledOnce();
  });
});

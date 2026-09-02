import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { GatewaySelector } from "../GatewaySelector";

describe("GatewaySelector", () => {
  it("shows only the configured Mercado Pago gateway and marks it selected", () => {
    render(
      <GatewaySelector
        selectedGateway="MERCADO_PAGO"
        availableGateways={["MERCADO_PAGO"]}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /mercadopago/i }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: /stripe/i })).toBeNull();
  });

  it("remains reusable for another configured gateway", () => {
    const onSelect = vi.fn();
    render(
      <GatewaySelector
        selectedGateway="STRIPE"
        availableGateways={["STRIPE"]}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /stripe/i }));

    expect(onSelect).toHaveBeenCalledWith("STRIPE");
    expect(screen.queryByRole("button", { name: /mercadopago/i })).toBeNull();
  });
});

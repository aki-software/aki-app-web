import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { BillingDashboard } from "../BillingDashboard";
import { useBillingHistory, usePricingPlans } from "../../hooks/useBilling";

vi.mock("../../hooks/useBilling", () => ({
  useBillingHistory: vi.fn(),
  usePricingPlans: vi.fn(),
}));

vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<Record<string, React.ComponentType<Record<string, unknown>>>>();
  const MockIcon = (props: Record<string, unknown>) => {
    const { ...rest } = props ?? {};
    return React.createElement("span", { "data-testid": "mock-icon", ...rest });
  };
  const mocked: Record<string, React.ComponentType<Record<string, unknown>>> = {};
  for (const key of Object.keys(actual)) {
    mocked[key] = MockIcon;
  }
  return mocked;
});

describe("BillingDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state correctly when there are no plans", () => {
    (useBillingHistory as jest.Mock).mockReturnValue({ data: null, isLoading: false });
    (usePricingPlans as jest.Mock).mockReturnValue({ data: [], isLoading: false });

    render(<BillingDashboard />);

    expect(screen.getByText("No hay planes disponibles por el momento.")).toBeDefined();
  });

  it("renders plans correctly", () => {
    (useBillingHistory as jest.Mock).mockReturnValue({ data: null, isLoading: false });
    (usePricingPlans as jest.Mock).mockReturnValue({
      data: [{ id: "plan-1", name: "Plan 10", voucherCount: 10, priceAmount: 1000, priceCurrency: "ARS", description: "Desc", isActive: true }],
      isLoading: false
    });

    render(<BillingDashboard />);

    expect(screen.getByText("Plan 10")).toBeDefined();
    const btn = screen.getByText("Adquirir lote");
    expect(btn).toBeDefined();
  });
});

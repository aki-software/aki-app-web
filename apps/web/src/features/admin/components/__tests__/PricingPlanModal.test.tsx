import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../../api/client";
import { PricingPlanModal } from "../PricingPlanModal";

const { createPlan, updatePlan } = vi.hoisted(() => ({
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
}));

vi.mock("../../api/pricing-plans.api", () => ({
  useCreatePricingPlan: () => ({ mutateAsync: createPlan, isPending: false }),
  useUpdatePricingPlan: () => ({ mutateAsync: updatePlan, isPending: false }),
}));

const editingPlan = {
  id: "plan-1",
  name: "Plan actual",
  description: null,
  voucherQuantity: 10,
  priceUsd: "10.00" as unknown as number,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("PricingPlanModal", () => {
  it("submits a numeric price when editing a plan returned with a decimal string", async () => {
    updatePlan.mockResolvedValue(undefined);
    const onSuccess = vi.fn();

    render(
      <PricingPlanModal
        isOpen
        onClose={vi.fn()}
        editingPlan={editingPlan}
        onSuccess={onSuccess}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("Plan actual"), {
      target: { value: "Plan actualizado" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(updatePlan).toHaveBeenCalledWith({
        id: "plan-1",
        name: "Plan actualizado",
        description: undefined,
        voucherQuantity: 10,
        priceUsd: 10,
        isActive: true,
      });
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("renders the safe API error message inline", async () => {
    createPlan.mockRejectedValue(
      new ApiError({
        statusCode: 400,
        message: "El precio debe ser válido.",
        timestamp: "2026-01-01T00:00:00.000Z",
      }),
    );

    render(<PricingPlanModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Nombre del plan" }), {
      target: { value: "Plan inicial" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear plan" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El precio debe ser válido.",
    );
  });
});

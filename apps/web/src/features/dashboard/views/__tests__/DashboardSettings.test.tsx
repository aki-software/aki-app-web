import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardSettings } from "../DashboardSettings";

vi.mock("../../../auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: "ADMIN" } }),
}));

vi.mock("../../api/dashboard", () => ({
  fetchCategories: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../api/combinations.api", () => ({
  fetchCombinations: vi.fn(),
}));

describe("DashboardSettings", () => {
  it("presents report content as read-only reference material", async () => {
    render(<DashboardSettings />);

    expect(
      await screen.findByRole("heading", {
        name: "Contenido de reportes (solo lectura)",
      }),
    ).toBeDefined();
    expect(
      screen.getByText(
        "Consulta las dimensiones de referencia incluidas en los reportes de pacientes. Este contenido no se edita desde el panel.",
      ),
    ).toBeDefined();
    expect(screen.queryByRole("button", { name: /edit|editar/i })).toBeNull();
  });
});

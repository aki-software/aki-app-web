import { describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { DashboardSettings } from "../DashboardSettings";

const {
  category,
  combination,
  updateCategory,
  updateCombination,
  invalidateCategoriesCache,
} = vi.hoisted(() => ({
  category: {
    categoryId: "ART",
    title: "Artistic",
    description: "Creative work",
    occupations: ["Painter"],
    formalProfessions: ["Fine Arts"],
    competencies: ["Creativity"],
  },
  combination: {
    id: "comb-1",
    combinationKey: "ART-SOC-ENT",
    title: "Creative leader",
    area1: "ART",
    area2: "SOC",
    area3: "ENT",
    narrative: "Leads creatively",
    tendencies: ["Leading"],
    competencies: ["Empathy"],
    keyInsight: "Insight",
    possibleJobs: "Director",
    relatedProfessions: "Arts",
    customSections: [{ title: "More", items: ["Item"] }],
  },
  updateCategory: vi.fn(),
  updateCombination: vi.fn(),
  invalidateCategoriesCache: vi.fn(),
}));

vi.mock("../../../auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: "ADMIN" } }),
}));
vi.mock("../../api/dashboard", () => ({
  fetchCategories: vi.fn().mockResolvedValue([category]),
}));
vi.mock("../../api/combinations.api", () => ({
  fetchCombinations: vi.fn().mockResolvedValue({ data: [combination] }),
  updateCombination: (...args: unknown[]) => updateCombination(...args),
}));
vi.mock("../../api/categories.api", () => ({
  updateCategory: (...args: unknown[]) => updateCategory(...args),
}));
vi.mock("../../hooks/useCategories", () => ({
  invalidateCategoriesCache: () => invalidateCategoriesCache(),
}));

describe("DashboardSettings content editors", () => {
  it("uses Spanish copy and chips to submit typed category lists", async () => {
    updateCategory.mockResolvedValueOnce(category);
    render(<DashboardSettings />);
    fireEvent.click(
      await screen.findByRole("button", { name: /editar artistic/i }),
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("Editar dimensión");
    fireEvent.click(screen.getByRole("tab", { name: "Listas" }));
    expect(screen.getByLabelText("Ocupaciones")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Ocupaciones"), {
      target: { value: "Illustrator" },
    });
    fireEvent.keyDown(screen.getByLabelText("Ocupaciones"), { key: "Enter" });
    fireEvent.change(screen.getByLabelText("Ocupaciones"), {
      target: { value: "Painter" },
    });
    fireEvent.keyDown(screen.getByLabelText("Ocupaciones"), { key: "," });
    expect(screen.getAllByText("Painter")).toHaveLength(1);
    expect(screen.getByText("Illustrator")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Quitar Illustrator" }));
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));
    await waitFor(() =>
      expect(updateCategory).toHaveBeenCalledWith("ART", {
        title: "Artistic",
        description: "Creative work",
        occupations: ["Painter"],
        formalProfessions: ["Fine Arts"],
        competencies: ["Creativity"],
      }),
    );
    expect(invalidateCategoriesCache).toHaveBeenCalledOnce();
    expect(await screen.findByText("Cambios guardados.")).toBeDefined();
  });

  it("adds chips with Agregar and disables it for blank or duplicate drafts", async () => {
    render(<DashboardSettings />);
    fireEvent.click(
      await screen.findByRole("button", { name: /editar artistic/i }),
    );
    fireEvent.click(screen.getByRole("tab", { name: "Listas" }));

    const input = screen.getByLabelText("Ocupaciones");
    const addButton = within(input.parentElement!).getByRole("button", {
      name: "Agregar",
    });
    expect(addButton).toBeDisabled();

    fireEvent.change(input, { target: { value: "Illustrator" } });
    expect(addButton).toBeEnabled();
    fireEvent.click(addButton);
    expect(screen.getByText("Illustrator")).toBeDefined();
    expect(input).toHaveValue("");

    fireEvent.change(input, { target: { value: "Painter" } });
    expect(addButton).toBeDisabled();
  });

  it("serializes combination CSV fields, excludes identity fields, and keeps save errors visible", async () => {
    updateCombination.mockRejectedValueOnce(new Error("No disponible"));
    render(<DashboardSettings />);
    fireEvent.click(await screen.findByRole("tab", { name: /combinaciones/i }));
    fireEvent.click(
      await screen.findByRole("button", { name: /editar creative leader/i }),
    );
    fireEvent.click(screen.getByRole("tab", { name: "Listas" }));
    fireEvent.change(screen.getByLabelText("Posibles trabajos"), {
      target: { value: "Designer" },
    });
    fireEvent.keyDown(screen.getByLabelText("Posibles trabajos"), {
      key: "Enter",
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));
    await waitFor(() =>
      expect(updateCombination).toHaveBeenCalledWith(
        "comb-1",
        expect.objectContaining({
          title: "Creative leader",
          tendencies: ["Leading"],
          competencies: ["Empathy"],
          possibleJobs: "Director, Designer",
          relatedProfessions: "Arts",
          customSections: [{ title: "More", items: ["Item"] }],
        }),
      ),
    );
    expect(updateCombination.mock.calls[0][1]).not.toHaveProperty("id");
    expect(updateCombination.mock.calls[0][1]).not.toHaveProperty(
      "combinationKey",
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("No disponible");
  });
});

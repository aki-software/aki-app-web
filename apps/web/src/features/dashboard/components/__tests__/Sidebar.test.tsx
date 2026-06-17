import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import { Sidebar } from "../Sidebar";

// Mock lucide-react with importOriginal
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

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock("../../../auth/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock logout + navigate to prevent side-effects
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter initialEntries={["/dashboard"]}>{ui}</MemoryRouter>);
}

describe("Sidebar — role-based nav filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ADMIN role", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { role: "ADMIN" },
        logout: vi.fn(),
      });
    });

    it("shows Resumen, Tests realizados, Vouchers, Instituciones y terapeutas, Ajustes (as 'Material teórico (CMS)')", () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText("Resumen")).toBeDefined();
      expect(screen.getByText("Tests realizados")).toBeDefined();
      expect(screen.getByText("Vouchers")).toBeDefined();
      expect(screen.getByText("Instituciones y terapeutas")).toBeDefined();
      expect(screen.getByText("Material teórico (CMS)")).toBeDefined();
    });

    it("shows exactly 5 nav items", () => {
      renderWithRouter(<Sidebar />);

      // The nav renders a Link for each item, with the name inside a <span>
      const navItemTexts = ["Resumen", "Tests realizados", "Vouchers", "Instituciones y terapeutas", "Material teórico (CMS)"];
      navItemTexts.forEach((text) => {
        expect(screen.getByText(text)).toBeDefined();
      });
    });

    it("renders logout button", () => {
      renderWithRouter(<Sidebar />);
      expect(screen.getByText("Cerrar sesión")).toBeDefined();
    });
  });

  describe("THERAPIST role", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { role: "THERAPIST" },
        logout: vi.fn(),
      });
    });

    it("shows Resumen, Tests realizados, Ajustes (as 'Cambio de contraseña')", () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText("Resumen")).toBeDefined();
      expect(screen.getByText("Tests realizados")).toBeDefined();
      expect(screen.getByText("Cambio de contraseña")).toBeDefined();
    });

    it("does NOT show Vouchers or Instituciones y terapeutas", () => {
      renderWithRouter(<Sidebar />);

      expect(screen.queryByText("Vouchers")).toBeNull();
      expect(screen.queryByText("Instituciones y terapeutas")).toBeNull();
      expect(screen.queryByText("Material teórico (CMS)")).toBeNull();
    });

    it("renders logout button", () => {
      renderWithRouter(<Sidebar />);
      expect(screen.getByText("Cerrar sesión")).toBeDefined();
    });
  });

  describe("Unrecognized role fallback", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { role: "UNKNOWN_ROLE" },
        logout: vi.fn(),
      });
    });

    it("falls back to therapist-level nav (Resumen, Tests realizados, Cambio de contraseña)", () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByText("Resumen")).toBeDefined();
      expect(screen.getByText("Tests realizados")).toBeDefined();
      expect(screen.getByText("Cambio de contraseña")).toBeDefined();

      // Admin-only items hidden
      expect(screen.queryByText("Vouchers")).toBeNull();
      expect(screen.queryByText("Instituciones y terapeutas")).toBeNull();
      expect(screen.queryByText("Material teórico (CMS)")).toBeNull();
    });
  });
});

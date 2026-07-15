import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import React from "react";
import { InstitutionDetailOverview } from "../InstitutionDetailOverview";

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

// Mock useInstitutionDetailManager
const mockUseDetailMgr = vi.fn();
vi.mock("../../hooks/useInstitutionDetailManager", () => ({
  useInstitutionDetailManager: () => mockUseDetailMgr(),
}));

// Mock behavioral trends API — after refactor, should NOT be called
const mockFetchBehavioralTrends = vi.fn();
vi.mock("../../api/sessions.api", () => ({
  fetchBehavioralTrends: (...args: unknown[]) => mockFetchBehavioralTrends(...args),
}));

// Mock dashboard to provide fetchInstitutionOverview for the hook
vi.mock("../../api/dashboard", () => ({
  fetchInstitutionOverview: vi.fn().mockResolvedValue(null),
  fetchDashboardStats: vi.fn().mockResolvedValue({}),
}));

function renderWithRouter(ui: React.ReactElement, { route = "/dashboard/institutions/inst-1" } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/dashboard/institutions/:id" element={ui} />
        <Route path="/dashboard" element={<div>Dashboard Home</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("InstitutionDetailOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { role: "ADMIN" } });
    mockUseDetailMgr.mockReturnValue({
      loading: false,
      error: null,
      data: {
        vouchers: {
          available: 50,
          total: 200,
          vouchersRedeemedPeriod: 10,
          voucherRedemptionRatePeriod: 20,
        },
        tests: {
          testsStartedPeriod: 25,
          testsCompletedPeriod: 18,
        },
        periodDays: 7,
      },
    });
  });

  it("renders stat cards (vouchers, tests)", async () => {
    renderWithRouter(<InstitutionDetailOverview />);
    expect(screen.getByText("Vouchers disponibles")).toBeDefined();
    expect(screen.getByText("Vouchers canjeados")).toBeDefined();
    expect(screen.getByText("Tests iniciados")).toBeDefined();
    expect(screen.getByText("Tests completados")).toBeDefined();
  });

  it("does NOT render behavioral trends section", async () => {
    renderWithRouter(<InstitutionDetailOverview />);
    expect(screen.queryByText("Comportamiento en sesiones")).toBeNull();
  });

  it("does NOT call fetchBehavioralTrends", async () => {
    renderWithRouter(<InstitutionDetailOverview />);
    expect(mockFetchBehavioralTrends).not.toHaveBeenCalled();
  });
});

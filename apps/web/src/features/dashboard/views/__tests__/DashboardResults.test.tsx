import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import { DashboardResults } from "../DashboardResults";

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

// Mock API modules
vi.mock("../../api/dashboard", () => ({
  fetchSessionsList: vi.fn().mockResolvedValue([]),
  fetchAdminActivityHistory: vi.fn().mockResolvedValue([]),
  fetchDashboardStats: vi.fn().mockResolvedValue({}),
  fetchInstitutionOverview: vi.fn().mockResolvedValue(null),
}));

const mockFetchBehavioralTrends = vi.fn();
vi.mock("../../api/sessions.api", () => ({
  fetchBehavioralTrends: (...args: unknown[]) => mockFetchBehavioralTrends(...args),
  fetchTriageSessions: vi.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
  fetchSessionsList: vi.fn().mockResolvedValue([]),
  fetchSessionDetail: vi.fn().mockResolvedValue(null),
  downloadSessionPdf: vi.fn(),
  fetchVoucherSessions: vi.fn().mockResolvedValue([]),
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("DashboardResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchBehavioralTrends.mockResolvedValue({
      selectivityDistribution: { selective: 30, balanced: 40, exploratory: 30 },
      fatigueRate: 15,
      rushRate: 10,
      totalSessions: 100,
      eligibleSessions: 80,
      periodDays: 30,
    });
  });

  describe("Therapist role", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { role: "THERAPIST", institutionId: "inst-1" } });
    });

    it("renders BehavioralTrendsSection with trend gauges for therapist", async () => {
      renderWithRouter(<DashboardResults />);
      const trendHeading = await screen.findByText("Comportamiento en sesiones");
      expect(trendHeading).toBeDefined();
      expect(mockFetchBehavioralTrends).toHaveBeenCalledWith(
        expect.objectContaining({ scope: "global" })
      );
    });
  });

  describe("Admin role", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { role: "ADMIN" } });
    });

    it("does NOT render BehavioralTrendsSection for admin", async () => {
      renderWithRouter(<DashboardResults />);
      expect(screen.queryByText("Comportamiento en sesiones")).toBeNull();
      expect(mockFetchBehavioralTrends).not.toHaveBeenCalled();
    });
  });
});

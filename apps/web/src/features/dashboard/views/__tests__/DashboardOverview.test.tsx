import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import { DashboardOverview } from "../DashboardOverview";

// Mock lucide-react with importOriginal to preserve all exports
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

// Mock useAdminDashboardStats
const mockUseAdminStats = vi.fn();
vi.mock("../../hooks/useAdminDashboardStats", () => ({
  useAdminDashboardStats: () => mockUseAdminStats(),
}));

// Mock dashboard.ts (re-exports everything) and sessions.api
const mockFetchTriageSessions = vi.fn();
vi.mock("../../api/sessions.api", () => ({
  fetchTriageSessions: (...args: unknown[]) => mockFetchTriageSessions(...args),
  fetchBehavioralTrends: vi.fn().mockResolvedValue(null),
  fetchSessionsList: vi.fn().mockResolvedValue([]),
  fetchSessionDetail: vi.fn().mockResolvedValue(null),
  downloadSessionPdf: vi.fn(),
  fetchVoucherSessions: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../api/dashboard", () => ({
  fetchDashboardStats: vi.fn().mockResolvedValue({
    totalSessions: 100,
    totalHistoricalVouchers: 500,
    completionRate: 75,
    averageTimeSeconds: 1800,
    availableVouchers: 200,
    redeemedVouchers: 50,
    periodDays: 7,
    periodLabel: "Últimos 7 días",
    vouchersGeneratedPeriod: 30,
    vouchersRedeemedPeriod: 15,
    testsStartedPeriod: 40,
    testsCompletedPeriod: 30,
    voucherRedemptionRatePeriod: 50,
    reportsUnlockedPeriod: 20,
    channelBreakdown: {
      voucher: { started: 20, completed: 15, reportsUnlocked: 10 },
      individual: { started: 20, completed: 15, reportsUnlocked: 10 },
    },
    sessionsActivity: [
      { date: "2024-01-01", count: 10 },
      { date: "2024-01-02", count: 15 },
    ],
    resultsDistribution: [
      { categoryId: "R", percentage: 40, count: 4 },
      { categoryId: "I", percentage: 30, count: 3 },
    ],
    alerts: [
      { id: "1", severity: "warning", title: "Test alert", description: "Desc", actionLabel: "Ver", actionPath: "/test" },
    ],
    activity: [
      { id: "1", type: "voucher_redeemed", description: "Activity item", timestamp: "2024-01-01T00:00:00Z" },
    ],
  }),
  fetchAdminActivityHistory: vi.fn().mockResolvedValue([]),
  fetchInstitutionOverview: vi.fn().mockResolvedValue(null),
}));

const mockStats = {
  totalSessions: 100,
  totalHistoricalVouchers: 500,
  completionRate: 75,
  averageTimeSeconds: 1800,
  availableVouchers: 200,
  redeemedVouchers: 50,
  periodDays: 7,
  periodLabel: "Últimos 7 días",
  vouchersGeneratedPeriod: 30,
  vouchersRedeemedPeriod: 15,
  testsStartedPeriod: 40,
  testsCompletedPeriod: 30,
  voucherRedemptionRatePeriod: 50,
  reportsUnlockedPeriod: 20,
  channelBreakdown: {
    voucher: { started: 20, completed: 15, reportsUnlocked: 10 },
    individual: { started: 20, completed: 15, reportsUnlocked: 10 },
  },
  sessionsActivity: [
    { date: "2024-01-01", count: 10 },
    { date: "2024-01-02", count: 15 },
  ],
  resultsDistribution: [
    { categoryId: "R", percentage: 40, count: 4 },
    { categoryId: "I", percentage: 30, count: 3 },
  ],
  alerts: [
    { id: "1", severity: "warning", title: "Test alert", description: "Desc", actionLabel: "Ver", actionPath: "/test" },
  ],
  activity: [
    { id: "1", type: "voucher_redeemed", description: "Activity item", timestamp: "2024-01-01T00:00:00Z" },
  ],
};

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("DashboardOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchTriageSessions.mockResolvedValue({
      data: [],
      meta: { total: 5, page: 1, limit: 1, flaggedCount: 3 },
    });
  });

  describe("AdminDashboardOverview (admin role)", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { role: "ADMIN" } });
      mockUseAdminStats.mockReturnValue({
        stats: mockStats,
        loading: false,
        periodDays: 7,
        setPeriodDays: vi.fn(),
        error: null,
        refreshStats: vi.fn(),
      });
    });

    it("renders HealthBar with completion rate, alerts, and triage indicators", async () => {
      renderWithRouter(<DashboardOverview />);
      expect(screen.getByText("Tasa de finalización")).toBeDefined();
      expect(screen.getByText("Instituciones con alertas")).toBeDefined();
      expect(screen.getByText("Sesiones pendientes de revisión")).toBeDefined();
    });

    it("renders SessionsChart section with period summary", async () => {
      renderWithRouter(<DashboardOverview />);
      expect(screen.getByText("Volumen de Evaluaciones Diarias")).toBeDefined();
      expect(screen.getByText("Total del periodo")).toBeDefined();
      expect(screen.getByText("Promedio diario")).toBeDefined();
      expect(screen.getByText("Pico de actividad")).toBeDefined();
    });

    it("renders QuickActions and ActivityFeed", async () => {
      renderWithRouter(<DashboardOverview />);
      expect(screen.getByText("Centro de operación")).toBeDefined();
      expect(screen.getByText("Emitir lotes")).toBeDefined();
      expect(screen.getByText("Buscar sesiones")).toBeDefined();
    });

    it("does NOT render ResultsDistributionChart", async () => {
      renderWithRouter(<DashboardOverview />);
      expect(screen.queryByText("Resultados predominantes")).toBeNull();
    });

    it("does NOT render AdminAlerts component", async () => {
      renderWithRouter(<DashboardOverview />);
      expect(screen.queryByText("Alertas Operativas")).toBeNull();
    });

    it("shows loading spinner with correct text when loading", async () => {
      mockUseAdminStats.mockReturnValue({
        stats: null,
        loading: true,
        periodDays: 7,
        setPeriodDays: vi.fn(),
        error: null,
        refreshStats: vi.fn(),
      });
      renderWithRouter(<DashboardOverview />);
      expect(screen.getByText("Sincronizando panel operativo")).toBeDefined();
    });
  });
});

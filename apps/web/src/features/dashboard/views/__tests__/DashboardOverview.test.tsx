import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import { DashboardOverview } from "../DashboardOverview";
import { InstitutionDashboardOverview } from "../InstitutionDashboardOverview";

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

const mockInstitutionOverview = vi.fn();
vi.mock("../../hooks/useInstitutionOverviewManager", () => ({
  LOW_STOCK_ALERT_THRESHOLD: 3,
  useInstitutionOverviewManager: () => mockInstitutionOverview(),
}));

const mockPurchaseSummary = vi.fn();
vi.mock("../../hooks/usePurchaseSummary", () => ({
  usePurchaseSummary: (...args: unknown[]) => mockPurchaseSummary(...args),
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
    mockPurchaseSummary.mockReturnValue({
      data: {
        scope: "PLATFORM",
        generatedAt: "2026-03-10T00:00:00.000Z",
        currentWindow: { from: "2026-03-03T00:00:00.000Z", to: "2026-03-10T00:00:00.000Z", days: 7 },
        priorWindow: { from: "2026-02-24T00:00:00.000Z", to: "2026-03-03T00:00:00.000Z", days: 7 },
        current: { accreditedPurchaseCount: 1, accreditedVoucherCount: 10, purchasingInstitutionCount: 1, accreditedAmountByCurrency: [{ currency: "USD", amount: "25.00" }] },
        prior: { accreditedPurchaseCount: 0, accreditedVoucherCount: 0, purchasingInstitutionCount: 0, accreditedAmountByCurrency: [] },
        alerts: { paidButNotFulfilledCount: 0, notificationAttentionCount: 0 },
        latestAccreditation: null,
      },
      loading: false,
      error: null,
      retry: vi.fn(),
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

    describe("InstitutionDashboardOverview", () => {
      const institutionState = {
        loading: false,
        overview: { topSessions: [], resultsDistribution: [] },
        voucherStats: { available: 9, total: 12, vouchersRedeemedPeriod: 2, voucherRedemptionRatePeriod: 20, vouchersUnassignedAvailable: 3, vouchersExpiringSoon7d: 1 },
        testsStats: { testsStartedPeriod: 0, testsCompletedPeriod: 0, reportsUnlockedPeriod: 0 },
        showLowStockAlert: false,
        handleDismissAlert: vi.fn(),
        periodDays: 7,
        setPeriodDays: vi.fn(),
      };
      const purchaseData = {
        scope: "INSTITUTION" as const, institutionName: "A.kit", generatedAt: "2026-03-10T00:00:00.000Z",
        currentWindow: { from: "2026-03-03T00:00:00.000Z", to: "2026-03-10T00:00:00.000Z", days: 7 as const },
        priorWindow: { from: "2026-02-24T00:00:00.000Z", to: "2026-03-03T00:00:00.000Z", days: 7 as const },
        current: { accreditedPurchaseCount: 1, accreditedVoucherCount: 12, accreditedAmountByCurrency: [] },
        prior: { accreditedPurchaseCount: 0, accreditedVoucherCount: 0, accreditedAmountByCurrency: [] },
        alerts: { paidButNotFulfilledCount: 1, notificationAttentionCount: 1 }, latestAccreditation: null,
      };

      it("shows exactly four primary voucher metrics for institution admins without an unsafe prior-zero comparison", () => {
        mockUseAuth.mockReturnValue({ user: { role: "INSTITUTION_ADMIN", institutionId: "inst-1", name: "A.kit" } });
        mockInstitutionOverview.mockReturnValue(institutionState);
        mockPurchaseSummary.mockReturnValue({ data: purchaseData, loading: false, error: null, retry: vi.fn() });
        renderWithRouter(<InstitutionDashboardOverview />);
        expect(screen.getByText("Acreditados")).toBeDefined();
        expect(screen.getAllByText(/Sin asignar/)).toHaveLength(1);
        expect(screen.queryByText(/respecto del período anterior/)).toBeNull();
        expect(screen.getByText("Última compra acreditada")).toBeDefined();
      });

      it("keeps therapist inventory behavior and never enables the purchase summary", () => {
        mockUseAuth.mockReturnValue({ user: { role: "THERAPIST", institutionId: "inst-1", name: "Terapeuta" } });
        mockInstitutionOverview.mockReturnValue(institutionState);
        mockPurchaseSummary.mockReturnValue({ data: null, loading: false, error: null, retry: vi.fn() });
        renderWithRouter(<InstitutionDashboardOverview />);
        expect(screen.getByText("Sin asignar")).toBeDefined();
        expect(screen.queryByText("Acreditados")).toBeNull();
        expect(mockPurchaseSummary).toHaveBeenLastCalledWith(7, false);
      });
    });

    it("enables the platform purchase summary and replaces the HealthBar", async () => {
      renderWithRouter(<DashboardOverview />);
      expect(screen.getByText("Vouchers acreditados")).toBeDefined();
      expect(screen.getByText("Instituciones compradoras")).toBeDefined();
      expect(screen.queryByText("Instituciones con alertas")).toBeNull();
      expect(mockPurchaseSummary).toHaveBeenLastCalledWith(7, true);
    });

        it("shows triage success and unavailable state when the triage request fails", async () => {
          const { unmount } = renderWithRouter(<DashboardOverview />);
          await waitFor(() => expect(screen.getByText("5")).toBeDefined());
          unmount();

          mockFetchTriageSessions.mockRejectedValueOnce(new Error("offline"));
          renderWithRouter(<DashboardOverview />);
          await waitFor(() => expect(screen.getByText("Datos de sesiones no disponibles.")).toBeDefined());
        });

        it("renders SessionsChart section with period summary", async () => {
      renderWithRouter(<DashboardOverview />);
      expect(screen.getByText("Volumen de Evaluaciones Diarias")).toBeDefined();
      expect(screen.getByText("Total del período")).toBeDefined();
      expect(screen.getByText("Promedio diario")).toBeDefined();
      expect(screen.getByText("Tasa de finalización")).toBeDefined();
    });

        it("keeps operational details collapsed by default", () => {
          renderWithRouter(<DashboardOverview />);
          const details = screen.getByText("Ver detalle operativo de vouchers y canales").closest("details");
          expect(details).not.toHaveAttribute("open");
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

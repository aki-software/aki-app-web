import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import { DashboardVouchers } from "../DashboardVouchers";
import { useAuth } from "../../../auth/hooks/useAuth";

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

// Mock hooks
vi.mock("../../../auth/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../hooks/useVoucherStats", () => ({
  useVoucherStats: () => ({
    stats: { totalBatches: 0, totalVouchers: 0, availableVouchers: 0, usedVouchers: 0, sentVouchers: 0, expiredVouchers: 0, revokedVouchers: 0, redemptionRate: 0 },
    institutions: [],
    therapists: [],
    clientOptions: [],
    alerts: [],
    loading: false,
    refreshStats: vi.fn(),
  }),
}));

vi.mock("../../hooks/useVoucherForm", () => ({
  useVoucherForm: () => ({
    formState: { codeType: "AUTO" },
    setFormState: vi.fn(),
    saving: false,
    error: null,
    success: null,
    resetFormMessages: vi.fn(),
    handleEmitVoucher: vi.fn(),
  }),
}));

vi.mock("../../hooks/useVoucherActions", () => ({
  useVoucherActions: () => ({
    actionBusy: false,
    handleSendVoucher: vi.fn(),
    handleResendVoucher: vi.fn(),
    handleRevokeVoucher: vi.fn(),
  }),
}));

vi.mock("../../hooks/useVoucherList", () => ({
  useVoucherList: () => ({
    individualItems: [],
    batchItems: [
      {
        batchId: "batch-1",
        shortCode: "SCODE",
        name: "Compra del 15/05/2026",
        ownerInstitutionName: "Inst A",
        ownerUserName: "User A",
        createdAt: "2026-05-15T00:00:00Z",
        expiresAt: null,
        total: 10,
        available: 10,
        used: 0,
        pending: 10,
      }
    ],
    individualTotalPages: 1,
    batchTotalPages: 1,
    currentPage: 1,
    setCurrentPage: vi.fn(),
  }),
  calculateTotalPages: () => 1,
}));

vi.mock("../../api/dashboard", () => ({
  fetchVoucherBatchDetail: vi.fn(),
  fetchVoucherSessions: vi.fn(),
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("DashboardVouchers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults to BATCHES view for admin users", async () => {
    (useAuth as Mock).mockReturnValue({ user: { role: "ADMIN" } });
    renderWithRouter(<DashboardVouchers />);
    
    await waitFor(() => {
      // Should show the batch name
      expect(screen.getByText("Compra del 15/05/2026")).toBeDefined();
    });
  });

  it("defaults to BATCHES view for non-admin users", async () => {
    (useAuth as Mock).mockReturnValue({ user: { role: "USER" } });
    renderWithRouter(<DashboardVouchers />);
    
    await waitFor(() => {
      // Should show the batch name, not the individual table
      expect(screen.getByText("Compra del 15/05/2026")).toBeDefined();
    });
  });
});

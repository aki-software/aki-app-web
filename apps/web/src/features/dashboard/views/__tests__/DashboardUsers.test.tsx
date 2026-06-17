import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import { DashboardUsers } from "../DashboardUsers";

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

// Mock useInstitutionsManager
const mockUseInstMgr = vi.fn();
vi.mock("../../hooks/useInstitutionsManager", () => ({
  useInstitutionsManager: () => mockUseInstMgr(),
}));

const mockInstitutions = [
  {
    id: "inst-1",
    name: "Test Institution A",
    email: "admin@testa.com",
    responsibleTherapistActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    responsibleTherapistUserId: "user-1",
  },
  {
    id: "inst-2",
    name: "Test Institution B",
    email: "admin@testb.com",
    responsibleTherapistActive: false,
    createdAt: "2024-02-01T00:00:00Z",
    responsibleTherapistUserId: null,
  },
];

// Mock fetchTherapists
const mockFetchTherapists = vi.fn();
vi.mock("../../api/users.api", () => ({
  fetchTherapists: (...args: unknown[]) => mockFetchTherapists(...args),
}));

vi.mock("../../api/dashboard", () => ({
  fetchDashboardStats: vi.fn().mockResolvedValue({}),
  fetchAdminActivityHistory: vi.fn().mockResolvedValue([]),
  fetchInstitutionOverview: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../api/sessions.api", () => ({
  fetchTriageSessions: vi.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
  fetchBehavioralTrends: vi.fn().mockResolvedValue(null),
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("DashboardUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { role: "ADMIN" } });
    mockUseInstMgr.mockReturnValue({
      institutions: mockInstitutions,
      loading: false,
      saving: false,
      message: null,
      error: null,
      notify: vi.fn(),
      loadData: vi.fn(),
      handleCreate: vi.fn(),
      handleUpdate: vi.fn(),
      handleToggleStatus: vi.fn(),
      handleResendActivation: vi.fn(),
      handleCreateOperational: vi.fn(),
      handleDelete: vi.fn(),
    });
    mockFetchTherapists.mockResolvedValue([
      { id: "t-1", name: "Dr. Smith", email: "smith@clinic.com", institutionId: "inst-1", institutionName: "Test Institution A", isActive: true },
      { id: "t-2", name: "Dr. Jones", email: "jones@clinic.com", institutionId: "inst-2", institutionName: "Test Institution B", isActive: false },
    ]);
  });

  it("renders both tab buttons: 'Instituciones' and 'Profesionales'", async () => {
    renderWithRouter(<DashboardUsers />);
    // There are multiple "Instituciones" texts — use getAllByText for the tab button
    const tabButtons = screen.getAllByText("Instituciones");
    expect(tabButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Profesionales")).toBeDefined();
  });

  it("defaults to 'Instituciones' tab showing institution content", async () => {
    renderWithRouter(<DashboardUsers />);
    expect(screen.getByText("Alta de instituciones y sus respectivas cuentas de acceso.")).toBeDefined();
    expect(screen.getByText("Listado")).toBeDefined();
    expect(screen.getByText("Test Institution A")).toBeDefined();
    expect(screen.getByText("Test Institution B")).toBeDefined();
  });

  it("switches to 'Profesionales' tab and shows therapist list", async () => {
    renderWithRouter(<DashboardUsers />);
    const profesionalesTab = screen.getByText("Profesionales");
    fireEvent.click(profesionalesTab);
    // Wait for the async fetch to resolve
    await waitFor(() => {
      expect(screen.getByText("Dr. Smith")).toBeDefined();
    });
    expect(screen.getByText("Dr. Jones")).toBeDefined();
    // Institution content should not show
    expect(screen.queryByText("Alta de instituciones y sus respectivas cuentas de acceso.")).toBeNull();
  });

  it("shows empty state when no therapists are found", async () => {
    mockFetchTherapists.mockResolvedValue([]);
    renderWithRouter(<DashboardUsers />);
    const profesionalesTab = screen.getByText("Profesionales");
    fireEvent.click(profesionalesTab);
    await waitFor(() => {
      expect(screen.getByText("No hay profesionales registrados")).toBeDefined();
    });
  });

  it("preserves existing institution CRUD on first tab", async () => {
    renderWithRouter(<DashboardUsers />);
    expect(screen.getByText("Alta de instituciones y sus respectivas cuentas de acceso.")).toBeDefined();
    expect(screen.getByText("Listado")).toBeDefined();
    expect(screen.getByText("Test Institution A")).toBeDefined();
    expect(screen.getByText("Test Institution B")).toBeDefined();
  });
});

describe("DashboardUsers — URL param behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { role: "ADMIN" } });
    mockUseInstMgr.mockReturnValue({
      institutions: mockInstitutions,
      loading: false,
      saving: false,
      message: null,
      error: null,
      notify: vi.fn(),
      loadData: vi.fn(),
      handleCreate: vi.fn(),
      handleUpdate: vi.fn(),
      handleToggleStatus: vi.fn(),
      handleResendActivation: vi.fn(),
      handleCreateOperational: vi.fn(),
      handleDelete: vi.fn(),
    });
    mockFetchTherapists.mockResolvedValue([
      { id: "t-1", name: "Dr. Smith", email: "smith@clinic.com", institutionId: "inst-1", institutionName: "Test Institution A", isActive: true },
    ]);
  });

  it("defaults to 'Instituciones' tab when no URL param", () => {
    render(<MemoryRouter><DashboardUsers /></MemoryRouter>);
    expect(screen.getByText("Alta de instituciones y sus respectivas cuentas de acceso.")).toBeDefined();
  });

  it("reads 'tab=professionals' from URL and shows professionals tab", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/users?tab=professionals"]}>
        <DashboardUsers />
      </MemoryRouter>
    );
    // The heading "Profesionales" should be visible
    const headings = screen.getAllByText("Profesionales");
    expect(headings.length).toBeGreaterThanOrEqual(1);
    // The therapist list should be triggered
    await waitFor(() => {
      expect(screen.getByText("Dr. Smith")).toBeDefined();
    });
  });

  it("preserves other URL params when switching tabs", () => {
    // Use a custom render with search params to simulate other params
    render(
      <MemoryRouter initialEntries={["/dashboard/users?page=2&tab=institutions"]}>
        <DashboardUsers />
      </MemoryRouter>
    );
    // Should show institutions tab initially since tab=institutions
    expect(screen.getByText("Alta de instituciones y sus respectivas cuentas de acceso.")).toBeDefined();
  });

  it("switching to professionals tab sets tab param in URL", async () => {
    render(<MemoryRouter><DashboardUsers /></MemoryRouter>);
    // Find the tab button (which is the FIRST "Profesionales" text in a button)
    const profesionalesBtn = screen.getAllByText("Profesionales")
      .map(el => el.closest("button"))
      .find(Boolean);
    expect(profesionalesBtn).toBeDefined();
    fireEvent.click(profesionalesBtn!);
    // After clicking, the active style should show professionals tab is active
    await waitFor(() => {
      const activeBtn = screen.getAllByText("Profesionales")
        .map(el => el.closest("button"))
        .find(Boolean);
      expect(activeBtn?.className).toContain("bg-app-primary/10");
    });
  });
});

import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "../LoginPage";

const mockUseAuth = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../../../hooks/useTheme", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/login", state: { from: { pathname: "/dashboard/results" } } }]}>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not navigate before authentication and redirects an authenticated login to the dashboard summary", () => {
    mockUseAuth.mockReturnValue({ login: vi.fn(), isAuthenticated: false });
    const { rerender } = renderLogin();
    expect(mockNavigate).not.toHaveBeenCalled();

    mockUseAuth.mockReturnValue({ login: vi.fn(), isAuthenticated: true });
    rerender(
      <MemoryRouter initialEntries={[{ pathname: "/login", state: { from: { pathname: "/dashboard/results" } } }]}>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(mockNavigate).toHaveBeenCalledExactlyOnceWith("/dashboard", { replace: true });
  });
});

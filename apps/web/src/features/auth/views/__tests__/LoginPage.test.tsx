import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import { ApiError } from "../../../../api/client";

// Mock useAuth — we control what login() does
const mockLogin = vi.fn();
const mockLogout = vi.fn();
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
    login: mockLogin,
    logout: mockLogout,
  }),
}));

// Mock useTheme
vi.mock("../../../../hooks/useTheme", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }),
}));

// Mock lucide icons
vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const MockIcon = (props: Record<string, unknown>) =>
    React.createElement("span", { "data-testid": "mock-icon", ...props });
  const mocked: Record<string, React.ComponentType<Record<string, unknown>>> =
    {};
  for (const key of Object.keys(actual)) {
    mocked[key] = MockIcon;
  }
  return mocked;
});

async function renderPage() {
  const { LoginPage } = await import("../LoginPage");
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByPlaceholderText("admin@akit.com"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByPlaceholderText("••••••••"), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));
}

describe("LoginPage error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show generic error on unexpected Error", async () => {
    mockLogin.mockRejectedValueOnce(new Error("Network error"));
    await renderPage();

    fillAndSubmit("test@test.com", "password");

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("should show 'Credenciales incorrectas' on 401 ApiError", async () => {
    const apiError = new ApiError({
      statusCode: 401,
      message: "Unauthorized",
      timestamp: new Date().toISOString(),
    });
    mockLogin.mockRejectedValueOnce(apiError);
    await renderPage();

    fillAndSubmit("wrong@test.com", "wrong");

    await waitFor(() => {
      expect(
        screen.getByText(
          "Credenciales incorrectas. Verificá tu email y contraseña.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("should show API error message on non-401 ApiError", async () => {
    const apiError = new ApiError({
      statusCode: 429,
      message: "Demasiados intentos. Intentá de nuevo en 15 minutos.",
      timestamp: new Date().toISOString(),
    });
    mockLogin.mockRejectedValueOnce(apiError);
    await renderPage();

    fillAndSubmit("test@test.com", "password");

    await waitFor(() => {
      expect(
        screen.getByText(
          "Demasiados intentos. Intentá de nuevo en 15 minutos.",
        ),
      ).toBeInTheDocument();
    });
  });
});

describe("LoginPage — expired session param", () => {
  it("should show expired session message from ?expired=true", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as unknown as Record<string, unknown>).location;
    window.location = { ...window.location, search: "?expired=true" };

    const { LoginPage } = await import("../LoginPage");
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(
        "Tu sesión ha expirado por inactividad. Por favor, volvé a ingresar.",
      ),
    ).toBeInTheDocument();
  });
});

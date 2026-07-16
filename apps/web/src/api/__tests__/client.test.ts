import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { RequestOptions } from "../client";

// We test the real request() implementation by restoring apiClient from the
// auto-spy that mock-api-client sets up. We mock fetch and location directly.
beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal("fetch", vi.fn());
  vi.stubGlobal("location", { href: "" });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function getClient() {
  // Dynamic import so the mock-api-client auto-spy runs first in setup, then
  // we restore it in beforeEach before importing the real implementation.
  return import("../client");
}

describe("apiClient — skipAuthRedirect", () => {
  it("should redirect on 401 when skipAuthRedirect is NOT set", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () =>
        Promise.resolve({
          statusCode: 401,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        }),
    } as Response);

    const { apiClient } = await getClient();

    await expect(apiClient.get("/test")).rejects.toThrow();
    expect(window.location.href).toBe("/login?expired=true");
  });

  it("should NOT redirect on 401 when skipAuthRedirect is true", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () =>
        Promise.resolve({
          statusCode: 401,
          message: "Credenciales inválidas",
          timestamp: new Date().toISOString(),
        }),
    } as Response);

    const { apiClient, ApiError } = await getClient();
    window.location.href = ""; // ensure clean

    let error: unknown;
    try {
      await apiClient.get("/test", { skipAuthRedirect: true } as RequestOptions);
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(ApiError);
    if (error instanceof ApiError) {
      expect(error.data.statusCode).toBe(401);
      expect(error.data.message).toBe("Credenciales inválidas");
    }
    // Location should NOT have changed
    expect(window.location.href).toBe("");
  });

  it("should redirect on 401 when skipAuthRedirect is false (explicit)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () =>
        Promise.resolve({
          statusCode: 401,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        }),
    } as Response);

    const { apiClient } = await getClient();

    await expect(
      apiClient.get("/test", { skipAuthRedirect: false } as RequestOptions),
    ).rejects.toThrow();
    expect(window.location.href).toBe("/login?expired=true");
  });

  it("should throw ApiError with structured data on non-401 errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () =>
        Promise.resolve({
          statusCode: 500,
          message: "Database error",
          timestamp: new Date().toISOString(),
        }),
    } as Response);

    const { apiClient, ApiError } = await getClient();

    let error: unknown;
    try {
      await apiClient.get("/test");
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(ApiError);
    if (error instanceof ApiError) {
      expect(error.data.statusCode).toBe(500);
      expect(error.data.message).toBe("Database error");
    }
    // No redirect on non-401
    expect(window.location.href).toBe("");
  });
});

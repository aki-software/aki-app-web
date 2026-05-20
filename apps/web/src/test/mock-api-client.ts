import { vi } from "vitest";
import { apiClient } from "../api/client";

interface MockResponse {
  data: unknown;
  status: number;
}

const mockResponses = new Map<string, MockResponse>();

export function mockEndpoint(
  method: "get" | "post" | "patch" | "put" | "delete",
  endpoint: string,
  data: unknown,
  status = 200,
): void {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const key = `${method.toUpperCase()}:${cleanEndpoint}`;
  mockResponses.set(key, { data, status });
}

/**
 * Resets all mocked endpoints.
 */
export function resetMockApi(): void {
  mockResponses.clear();
}

// Set up automatic spies on all apiClient methods
const methods = ["get", "post", "patch", "put", "delete"] as const;

methods.forEach((method) => {
  vi.spyOn(apiClient, method).mockImplementation(async (endpoint: string) => {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const key = `${method.toUpperCase()}:${cleanEndpoint}`;
    const mock = mockResponses.get(key);

    if (mock) {
      if (mock.status >= 200 && mock.status < 300) {
        return mock.data;
      } else {
        // Mock ApiError structure
        const message =
          typeof mock.data === "string"
            ? mock.data
            : typeof mock.data === "object" && mock.data !== null && "message" in mock.data
            ? (mock.data as { message?: string }).message || "API Error"
            : "API Error";

        const errorResponse = {
          statusCode: mock.status,
          message,
          timestamp: new Date().toISOString(),
          ...(typeof mock.data === "object" && mock.data !== null ? mock.data : {}),
        };
        throw new Error(errorResponse.message);
      }
    }

    // Guard against unhandled requests to avoid real network access during testing
    throw new Error(
      `[MockAPI] Unhandled mock request for ${method.toUpperCase()} "${cleanEndpoint}"`,
    );
  });
});

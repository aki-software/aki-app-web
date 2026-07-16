import { API_URL } from "../config/app-config";
export { API_URL };
import { getStoredToken, clearStoredAuth } from "../utils/storage";
import { ApiErrorResponse } from "@akit/contracts";

export interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  skipAuthRedirect?: boolean;
}

export class ApiError extends Error {
  constructor(public readonly data: ApiErrorResponse) {
    super(data.message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, skipAuthRedirect, ...init } = options;
  
  // Build URL with query params
  const url = new URL(`${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
  }

  // Build headers
  const token = getStoredToken();
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const mergedHeaders = { ...defaultHeaders, ...headers };

  try {
    const response = await fetch(url.toString(), {
      ...init,
      headers: mergedHeaders,
    });

    if (!response.ok) {
      if (response.status === 401 && !skipAuthRedirect) {
        clearStoredAuth();
        window.location.href = '/login?expired=true';
      }

      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          statusCode: response.status,
          message: response.statusText,
          timestamp: new Date().toISOString(),
        };
      }
      throw new ApiError(errorData as ApiErrorResponse);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network or parsing error
    throw new ApiError({
      statusCode: 0,
      message: error instanceof Error ? error.message : 'Network Error',
      timestamp: new Date().toISOString(),
    });
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("akit_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

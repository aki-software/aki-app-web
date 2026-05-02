import { API_URL } from "../../../config/app-config";
import { getStoredToken } from "../../../utils/storage";

export { API_URL };

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

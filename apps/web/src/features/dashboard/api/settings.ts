import { API_URL, getAuthHeaders } from "./client";

export const changePasswordRequest = async (currentPassword: string, newPassword: string) => {
  const response = await fetch(`${API_URL}/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const msg = typeof data?.message === "string" ? data.message
      : Array.isArray(data?.message) ? data.message.join(". ")
      : "No se pudo cambiar la contraseña.";
    throw new Error(msg);
  }
  
  return true;
};
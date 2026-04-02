import { API_URL, getAuthHeaders } from "./client";

export interface TherapistOption {
  id: string;
  name: string;
  email?: string | null;
  institutionId: string | null;
  institutionName: string | null;
  isActive?: boolean;
  activationEmailSent?: boolean;
}

export async function fetchTherapists(): Promise<TherapistOption[]> {
  try {
    const response = await fetch(`${API_URL}/users?role=THERAPIST`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch therapists");

    const responseData = (await response.json()) as {
      data?: Array<{
        id: string;
        name: string;
        email?: string | null;
        institutionId?: string | null;
        institution?: { name?: string | null } | null;
        institutionName?: string | null;
        isActive?: boolean;
      }>;
    };
    const therapists = responseData.data || [];

    return therapists.map((therapist) => ({
      id: therapist.id,
      name: therapist.name,
      email: therapist.email ?? null,
      institutionId: therapist.institutionId ?? null,
      institutionName:
        therapist.institutionName ?? therapist.institution?.name ?? null,
      isActive: therapist.isActive ?? false,
      activationEmailSent: undefined,
    }));
  } catch (error) {
    console.error("Error fetching therapists:", error);
    return [];
  }
}

export async function createTherapist(input: {
  name: string;
  email?: string;
  institutionId?: string;
}): Promise<TherapistOption | null> {
  try {
    const response = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        ...input,
        role: "THERAPIST",
      }),
    });
    if (!response.ok) throw new Error("Failed to create therapist");

    const therapist = (await response.json()) as {
      id: string;
      name: string;
      email: string;
      institutionId?: string | null;
      isActive?: boolean;
      activationEmailSent?: boolean;
    };

    return {
      id: therapist.id,
      name: therapist.name,
      email: therapist.email,
      institutionId: therapist.institutionId ?? null,
      institutionName: null,
      isActive: therapist.isActive ?? false,
      activationEmailSent: therapist.activationEmailSent ?? false,
    };
  } catch (error) {
    console.error("Error creating therapist:", error);
    return null;
  }
}

export async function resendActivationInvitation(
  userId: string
): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/users/${userId}/resend-activation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) throw new Error("Failed to resend activation");

    const data = (await response.json()) as { activationEmailSent?: boolean };
    return data.activationEmailSent ?? false;
  } catch (error) {
    console.error("Error resending activation:", error);
    return false;
  }
}

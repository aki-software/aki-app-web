import { apiClient } from "../../../api/client";

export interface TherapistOption {
  id: string;
  name: string;
  email?: string | null;
  institutionId: string | null;
  institutionName: string | null;
  isActive?: boolean;
  activationEmailSent?: boolean;
}

export interface RawTherapist {
  id: string;
  name: string;
  email?: string | null;
  institutionId?: string | null;
  institution?: { name?: string | null } | null;
  institutionName?: string | null;
  isActive?: boolean;
}

export async function fetchTherapists(): Promise<TherapistOption[]> {
  try {
    const responseData = await apiClient.get<{
      data?: RawTherapist[];
    }>("/users?role=THERAPIST");
    
    const therapists = responseData.data || [];

    return therapists.map((therapist: RawTherapist) => ({
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
    const therapist = await apiClient.post<any>("/users", {
      ...input,
      role: "THERAPIST",
    });

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
    const data = await apiClient.post<{ activationEmailSent?: boolean }>(
      `/users/${userId}/resend-activation`
    );
    return data.activationEmailSent ?? false;
  } catch (error) {
    console.error("Error resending activation:", error);
    return false;
  }
}

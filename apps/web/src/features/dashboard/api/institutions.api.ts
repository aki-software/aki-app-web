import { apiClient } from "../../../api/client";
export type {
  InstitutionOption,
  InstitutionStats,
  InstitutionOverviewResponse,
  CreateInstitutionDto,
  UpdateInstitutionDto,
} from "@akit/contracts";

export async function resendInstitutionActivationInvitation(
  responsibleUserId: string,
): Promise<boolean> {
  try {
    const data = await apiClient.post<{ activationEmailSent?: boolean }>(
      `/users/${responsibleUserId}/resend-activation`
    );
    return data.activationEmailSent ?? false;
  } catch (error) {
    console.error("Error resending institution activation:", error);
    return false;
  }
}

export async function createInstitutionOperationalAccount(input: {
  institutionId: string;
  email: string;
}): Promise<any | null> {
  try {
    return await apiClient.post(
      `/institutions/${input.institutionId}/operational-account`,
      { email: input.email }
    );
  } catch (error) {
    console.error("Error creating institution operational account:", error);
    return null;
  }
}

export async function fetchInstitutions(): Promise<any[]> {
  try {
    const responseData = await apiClient.get<{ data?: any[] }>("/institutions");
    const institutions = responseData.data || [];

    return institutions.map((institution) => ({
      id: institution.id,
      name: institution.name,
      createdAt: institution.createdAt ?? null,
      billingEmail: institution.billingEmail ?? null,
      responsibleTherapistUserId: institution.responsibleTherapistUserId ?? null,
      responsibleTherapistName: institution.responsibleTherapistName ?? null,
      responsibleTherapistActive:
        institution.responsibleTherapistActive ?? false,
      activationEmailSent: undefined,
    }));
  } catch (error) {
    console.error("Error fetching institutions:", error);
    return [];
  }
}

export async function createInstitution(input: any): Promise<any | null> {
  try {
    return await apiClient.post("/institutions", input);
  } catch (error) {
    console.error("Error creating institution:", error);
    return null;
  }
}
 
export async function updateInstitution(
  id: string,
  input: any
): Promise<any | null> {
  try {
    return await apiClient.patch(`/institutions/${id}`, input);
  } catch (error) {
    console.error("Error updating institution:", error);
    return null;
  }
}
 
export async function updateInstitutionStatus(
  id: string,
  isActive: boolean
): Promise<boolean> {
  try {
    await apiClient.patch(`/institutions/${id}/status`, { isActive });
    return true;
  } catch (error) {
    console.error("Error updating institution status:", error);
    return false;
  }
}
 
export async function fetchInstitutionStats(
  institutionId: string
): Promise<any | null> {
  try {
    return await apiClient.get(`/institutions/${institutionId}/stats`);
  } catch (error) {
    console.error("Error fetching institution stats:", error);
    return null;
  }
}

export async function fetchInstitutionOverview(input: {
  institutionId: string;
  days?: number;
}): Promise<any | null> {
  try {
    const params: Record<string, string> = {};
    if (input.days) params.days = String(input.days);

    return await apiClient.get(`/institutions/${input.institutionId}/overview`, { params });
  } catch (error) {
    console.error("Error fetching institution overview:", error);
    return null;
  }
}

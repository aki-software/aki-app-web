import { apiClient } from "../../../api/client";
import type {
  InstitutionOption,
  InstitutionStats,
  InstitutionOverviewResponse,
  CreateInstitutionDto,
  UpdateInstitutionDto,
} from "@akit/contracts";

export type {
  InstitutionOption,
  InstitutionStats,
  InstitutionOverviewResponse,
  CreateInstitutionDto,
  UpdateInstitutionDto,
};

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
}): Promise<unknown> {
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

export async function fetchInstitutions(): Promise<InstitutionOption[]> {
  try {
    const responseData = await apiClient.get<{ data?: InstitutionOption[] }>("/institutions");
    const institutions = responseData.data || [];

    return institutions.map((institution) => ({
      id: institution.id,
      name: institution.name,
      isActive: institution.isActive ?? true,
      createdAt: institution.createdAt ?? null,
      billingEmail: institution.billingEmail ?? null,
      responsibleTherapistUserId: institution.responsibleTherapistUserId ?? null,
      responsibleTherapistName: institution.responsibleTherapistName ?? null,
      responsibleTherapistActive:
        institution.responsibleTherapistActive ?? false,
      activationEmailSent: institution.activationEmailSent,
    }));
  } catch (error) {
    console.error("Error fetching institutions:", error);
    return [];
  }
}

export async function fetchInstitutionStats(
  institutionId: string,
): Promise<InstitutionStats | null> {
  try {
    return await apiClient.get<InstitutionStats>(
      `/institutions/${institutionId}/stats`
    );
  } catch (error) {
    console.error("Error fetching institution stats:", error);
    return null;
  }
}

export async function fetchInstitutionOverview(
  institutionId: string,
  periodDays: number = 30
): Promise<InstitutionOverviewResponse | null> {
  try {
    return await apiClient.get<InstitutionOverviewResponse>(
      `/institutions/${institutionId}/overview`,
      { params: { periodDays: periodDays.toString() } }
    );
  } catch (error) {
    console.error("Error fetching institution overview:", error);
    return null;
  }
}

export async function createInstitution(
  data: CreateInstitutionDto
): Promise<{ id: string; name: string; activationEmailSent?: boolean } | null> {
  try {
    return await apiClient.post<{ id: string; name: string; activationEmailSent?: boolean }>("/institutions", data);
  } catch (error) {
    console.error("Error creating institution:", error);
    return null;
  }
}

export async function updateInstitution(
  id: string,
  data: UpdateInstitutionDto
): Promise<{ id: string; name: string } | null> {
  try {
    return await apiClient.patch<{ id: string; name: string }>(`/institutions/${id}`, data);
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

export async function deleteInstitution(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/institutions/${id}`);
    return true;
  } catch (error) {
    console.error("Error deleting institution:", error);
    return false;
  }
}

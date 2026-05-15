import { API_URL, getAuthHeaders } from "./client";
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
    const response = await fetch(
      `${API_URL}/users/${responsibleUserId}/resend-activation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      },
    );
    if (!response.ok) throw new Error("Failed to resend activation");

    const data = (await response.json()) as { activationEmailSent?: boolean };
    return data.activationEmailSent ?? false;
  } catch (error) {
    console.error("Error resending institution activation:", error);
    return false;
  }
}

export async function createInstitutionOperationalAccount(input: {
  institutionId: string;
  email: string;
}): Promise<InstitutionOption | null> {
  try {
    const response = await fetch(
      `${API_URL}/institutions/${input.institutionId}/operational-account`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ email: input.email }),
      },
    );
    if (!response.ok) throw new Error("Failed to create operational account");

    const institution = (await response.json()) as any;

    return {
      id: institution.id,
      name: institution.name,
      billingEmail: institution.billingEmail ?? null,
      responsibleTherapistUserId: institution.responsibleTherapistUserId ?? null,
      responsibleTherapistName: institution.responsibleTherapistName ?? null,
      responsibleTherapistActive: institution.responsibleTherapistActive ?? false,
      activationEmailSent: institution.activationEmailSent ?? false,
    };
  } catch (error) {
    console.error("Error creating institution operational account:", error);
    return null;
  }
}

export async function fetchInstitutions(): Promise<InstitutionOption[]> {
  try {
    const response = await fetch(`${API_URL}/institutions`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch institutions");

    const responseData = (await response.json()) as {
      data?: any[];
    };
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

export async function createInstitution(input: any): Promise<InstitutionOption | null> {
  try {
    const response = await fetch(`${API_URL}/institutions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error("Failed to create institution");
 
    const institution = (await response.json()) as any;
 
    return {
      id: institution.id,
      name: institution.name,
      billingEmail: institution.billingEmail ?? null,
      responsibleTherapistUserId: institution.responsibleTherapistUserId ?? null,
      responsibleTherapistName: institution.responsibleTherapistName ?? null,
      activationEmailSent: institution.activationEmailSent ?? false,
    };
  } catch (error) {
    console.error("Error creating institution:", error);
    return null;
  }
}
 
export async function updateInstitution(
  id: string,
  input: any
): Promise<InstitutionOption | null> {
  try {
    const response = await fetch(`${API_URL}/institutions/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error("Failed to update institution");
 
    const institution = (await response.json()) as any;
 
    return {
      id: institution.id,
      name: institution.name,
      billingEmail: institution.billingEmail ?? null,
      responsibleTherapistUserId: institution.responsibleTherapistUserId ?? null,
      responsibleTherapistName: institution.responsibleTherapistName ?? null,
      activationEmailSent: undefined,
    };
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
    const response = await fetch(`${API_URL}/institutions/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ isActive }),
    });
    return response.ok;
  } catch (error) {
    console.error("Error updating institution status:", error);
    return false;
  }
}
 
export async function fetchInstitutionStats(
  institutionId: string
): Promise<InstitutionStats | null> {
  try {
    const response = await fetch(
      `${API_URL}/institutions/${institutionId}/stats`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error("Failed to fetch institution stats");
    return (await response.json()) as InstitutionStats;
  } catch (error) {
    console.error("Error fetching institution stats:", error);
    return null;
  }
}

export async function fetchInstitutionOverview(input: {
  institutionId: string;
  days?: number;
}): Promise<InstitutionOverviewResponse | null> {
  try {
    const params = new URLSearchParams();
    if (input.days) params.set("days", String(input.days));

    const response = await fetch(
      `${API_URL}/institutions/${input.institutionId}/overview${params.toString() ? `?${params.toString()}` : ""}`,
      { headers: getAuthHeaders() },
    );
    if (!response.ok) throw new Error("Failed to fetch institution overview");
    return (await response.json()) as InstitutionOverviewResponse;
  } catch (error) {
    console.error("Error fetching institution overview:", error);
    return null;
  }
}

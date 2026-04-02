import { API_URL, getAuthHeaders } from "./client";

export interface InstitutionOption {
  id: string;
  name: string;
  billingEmail?: string | null;
  responsibleTherapistUserId?: string | null;
  responsibleTherapistName?: string | null;
  responsibleTherapistActive?: boolean;
  activationEmailSent?: boolean;
}

export interface InstitutionStats {
  totalSessions: number;
  availableVouchers: number;
  redeemedVouchers: number;
}

export async function fetchInstitutions(): Promise<InstitutionOption[]> {
  try {
    const response = await fetch(`${API_URL}/institutions`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch institutions");

    const responseData = (await response.json()) as {
      data?: Array<{
        id: string;
        name: string;
        billingEmail?: string | null;
        responsibleTherapistUserId?: string | null;
        responsibleTherapistName?: string | null;
        responsibleTherapistActive?: boolean;
      }>;
    };
    const institutions = responseData.data || [];

    return institutions.map((institution) => ({
      id: institution.id,
      name: institution.name,
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

export async function createInstitution(input: {
  name: string;
  billingEmail?: string;
  responsibleTherapistUserId?: string;
  responsibleName?: string;
  responsibleEmail?: string;
}): Promise<InstitutionOption | null> {
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

    const institution = (await response.json()) as {
      id: string;
      name: string;
      billingEmail?: string | null;
      responsibleTherapistUserId?: string | null;
      responsibleTherapistName?: string | null;
      activationEmailSent?: boolean;
    };

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

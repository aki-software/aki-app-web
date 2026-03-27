import { DashboardStatsResponse } from "@akit/contracts";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type SessionResultApi = {
  categoryId: string;
  percentage: number;
};

type SessionApi = {
  id: string;
  patientName: string;
  createdAt?: string | Date | number;
  totalTimeMs?: string | number;
  paymentStatus?: string;
  results?: SessionResultApi[];
  institution?: { name?: string | null } | null;
  therapist?: { name?: string | null } | null;
  voucher?: { code?: string | null } | null;
};

type VoucherApi = {
  id: string;
  code: string;
  batchId: string;
  status: string;
  ownerType: string;
  ownerInstitutionId?: string | null;
  ownerInstitution?: { name?: string | null } | null;
  ownerUserId?: string | null;
  ownerUser?: { name?: string | null } | null;
  assignedPatientName?: string | null;
  assignedPatientEmail?: string | null;
  redeemedSessionId?: string | null;
  createdAt: string | Date | number;
  redeemedAt?: string | Date | number | null;
  expiresAt?: string | Date | number | null;
};

export interface SessionData {
  id: string;
  patientName: string;
  hollandCode: string;
  sessionDate: string | Date | number;
  totalTimeMs: number;
  paymentStatus: string;
  institutionName: string | null;
  therapistName: string | null;
  voucherCode: string | null;
  results?: { categoryId: string; percentage: number }[];
}

export interface VoucherData {
  id: string;
  code: string;
  batchId: string;
  status: string;
  ownerType: string;
  ownerInstitutionId: string | null;
  ownerInstitutionName: string;
  ownerUserId: string | null;
  ownerUserName: string;
  assignedPatientName: string | null;
  assignedPatientEmail: string | null;
  redeemedSessionId: string | null;
  createdAt: string | Date | number;
  redeemedAt: string | Date | number | null;
  expiresAt: string | Date | number | null;
}

export interface InstitutionOption {
  id: string;
  name: string;
  billingEmail?: string | null;
  responsibleTherapistUserId?: string | null;
  responsibleTherapistName?: string | null;
  responsibleTherapistActive?: boolean;
  activationEmailSent?: boolean;
}

export interface TherapistOption {
  id: string;
  name: string;
  email?: string | null;
  institutionId: string | null;
  institutionName: string | null;
  isActive?: boolean;
  activationEmailSent?: boolean;
}

export interface VoucherBatchCreateResult {
  batchId: string;
  createdCount: number;
  codes: string[];
  ownerType: string;
  ownerUserId: string | null;
  ownerInstitutionId: string | null;
  expiresAt: string | Date | number | null;
}

export interface CategoryData {
  categoryId: string;
  title: string;
  description: string;
}

/** Lee el JWT almacenado por AuthContext y devuelve el encabezado Authorization */
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("akit_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchDashboardStats(): Promise<DashboardStatsResponse> {
  try {
    const response = await fetch(`${API_URL}/sessions`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch API data");
    const responseData = await response.json();
    const sessions: SessionApi[] = responseData.data || [];

    const sumTimeMs = sessions.reduce(
      (acc, session) => acc + Number(session.totalTimeMs || 0),
      0
    );
    const averageTimeSeconds =
      sessions.length > 0 ? Math.floor(sumTimeMs / sessions.length / 1000) : 0;

    const categories: Record<string, { count: number; name: string }> = {};
    sessions.forEach((session) => {
      session.results?.forEach((result) => {
        if (!categories[result.categoryId]) {
          categories[result.categoryId] = {
            count: 0,
            name: `Categoría ${result.categoryId}`,
          };
        }
        categories[result.categoryId].count++;
      });
    });

    const resultsDistribution = Object.keys(categories)
      .map((categoryId) => ({
        categoryId,
        name: categories[categoryId].name,
        count: categories[categoryId].count,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalSessions: sessions.length || 0,
      completionRate: sessions.length > 0 ? 100 : 0,
      averageTimeSeconds,
      sessionsActivity: [{ date: "Hoy", count: sessions.length }],
      resultsDistribution:
        resultsDistribution.length > 0
          ? resultsDistribution
          : [
              { categoryId: "R", name: "Realista", count: 0 },
              { categoryId: "I", name: "Investigador", count: 0 },
              { categoryId: "A", name: "Artístico", count: 0 },
              { categoryId: "S", name: "Social", count: 0 },
              { categoryId: "E", name: "Emprendedor", count: 0 },
              { categoryId: "C", name: "Convencional", count: 0 },
            ],
    };
  } catch (error) {
    console.error("Backend offline, returning zeroes.", error);
    return {
      totalSessions: 0,
      completionRate: 0,
      averageTimeSeconds: 0,
      sessionsActivity: [],
      resultsDistribution: [],
    };
  }
}

export async function fetchSessionsList(): Promise<SessionData[]> {
  try {
    const response = await fetch(`${API_URL}/sessions`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch API data");
    const responseData = await response.json();
    const sessions: SessionApi[] = responseData.data || [];

    return sessions.map((session) => {
      const topResults = [...(session.results || [])]
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 3);

      const hollandCode = topResults
        .map((result) => result.categoryId.charAt(0).toUpperCase())
        .join("");

      return {
        id: session.id,
        patientName: session.patientName,
        hollandCode: hollandCode || "N/A",
        sessionDate: session.createdAt || new Date(),
        totalTimeMs: Number(session.totalTimeMs || 0),
        paymentStatus: session.paymentStatus || "UNKNOWN",
        institutionName: session.institution?.name ?? null,
        therapistName: session.therapist?.name ?? null,
        voucherCode: session.voucher?.code ?? null,
        results: session.results,
      };
    });
  } catch (error) {
    console.error("Error fetching sessions list:", error);
    return [];
  }
}

export async function fetchVouchersList(): Promise<VoucherData[]> {
  try {
    const response = await fetch(`${API_URL}/vouchers`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch vouchers");
    const responseData = await response.json();
    const vouchers: VoucherApi[] = responseData.data || [];

    return vouchers.map((voucher) => ({
      id: voucher.id,
      code: voucher.code,
      batchId: voucher.batchId,
      status: voucher.status,
      ownerType: voucher.ownerType,
      ownerInstitutionId: voucher.ownerInstitutionId ?? null,
      ownerInstitutionName:
        voucher.ownerInstitution?.name ?? "Institución no informada",
      ownerUserId: voucher.ownerUserId ?? null,
      ownerUserName: voucher.ownerUser?.name ?? "Responsable no informado",
      assignedPatientName: voucher.assignedPatientName ?? null,
      assignedPatientEmail: voucher.assignedPatientEmail ?? null,
      redeemedSessionId: voucher.redeemedSessionId ?? null,
      createdAt: voucher.createdAt,
      redeemedAt: voucher.redeemedAt ?? null,
      expiresAt: voucher.expiresAt ?? null,
    }));
  } catch (error) {
    console.error("Error fetching vouchers list:", error);
    return [];
  }
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

export async function createVoucher(input: {
  ownerType: "INSTITUTION" | "THERAPIST";
  ownerInstitutionId?: string;
  ownerUserId?: string;
  quantity?: number;
  expiresAt?: string;
}): Promise<VoucherBatchCreateResult | null> {
  try {
    const response = await fetch(`${API_URL}/vouchers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error("Failed to create voucher");
    }

    return (await response.json()) as VoucherBatchCreateResult;
  } catch (error) {
    console.error("Error creating voucher:", error);
    return null;
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

export async function fetchCategories(): Promise<CategoryData[]> {
  try {
    const response = await fetch(`${API_URL}/categories`);
    if (!response.ok) throw new Error("Failed to fetch categories");
    return (await response.json()) as CategoryData[];
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function updateCategory(
  categoryId: string,
  data: { title: string; description: string }
): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/categories/${categoryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch (error) {
    console.error("Error updating category:", error);
    return false;
  }
}

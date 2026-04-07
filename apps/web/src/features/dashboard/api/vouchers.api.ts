import { API_URL, getAuthHeaders } from "./client";

export type VoucherApi = {
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

export interface VoucherBatchSummary {
  batchId: string;
  ownerInstitutionName: string;
  ownerUserName: string;
  createdAt: string | Date | number;
  expiresAt: string | Date | number | null;
  total: number;
  available: number;
  used: number;
  pending: number;
}

export interface VoucherBatchListResponse {
  data: VoucherBatchSummary[];
  count: number;
  page: number;
  limit: number;
}

export interface VoucherListResponse {
  data: VoucherData[];
  count: number;
  page?: number;
  limit?: number;
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
      ownerInstitutionName: voucher.ownerInstitution?.name ?? "Institución no informada",
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
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error("Failed to create voucher");
    return (await response.json()) as VoucherBatchCreateResult;
  } catch (error) {
    console.error("Error creating voucher:", error);
    return null;
  }
}

export async function fetchVouchersPage(input: {
  search?: string;
  status?: string;
  clientId?: string;
  expiration?: string;
  page?: number;
  limit?: number;
}): Promise<VoucherListResponse> {
  try {
    const params = new URLSearchParams();
    if (input.search?.trim()) params.set("search", input.search.trim());
    if (input.status && input.status !== "ALL") params.set("status", input.status);
    if (input.clientId?.trim()) params.set("clientId", input.clientId.trim());
    if (input.expiration && input.expiration !== "ALL") {
      params.set("expiration", input.expiration);
    }
    if (input.page) params.set("page", String(input.page));
    if (input.limit) params.set("limit", String(input.limit));

    const queryString = params.toString();
    const response = await fetch(
      `${API_URL}/vouchers${queryString ? `?${queryString}` : ""}`,
      {
        headers: getAuthHeaders(),
      },
    );
    if (!response.ok) throw new Error("Failed to fetch vouchers page");
    const responseData = await response.json();
    const vouchers: VoucherApi[] = responseData.data || [];
    return {
      data: vouchers.map((voucher) => ({
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
      })),
      count: Number(responseData.count ?? 0),
      page: responseData.page ? Number(responseData.page) : undefined,
      limit: responseData.limit ? Number(responseData.limit) : undefined,
    };
  } catch (error) {
    console.error("Error fetching vouchers page:", error);
    return {
      data: [],
      count: 0,
      page: input.page,
      limit: input.limit,
    };
  }
}

export async function fetchVoucherBatches(input: {
  search?: string;
  clientId?: string;
  expiration?: string;
  page?: number;
  limit?: number;
}): Promise<VoucherBatchListResponse> {
  try {
    const params = new URLSearchParams();
    if (input.search?.trim()) params.set("search", input.search.trim());
    if (input.clientId?.trim()) params.set("clientId", input.clientId.trim());
    if (input.expiration && input.expiration !== "ALL") {
      params.set("expiration", input.expiration);
    }
    if (input.page) params.set("page", String(input.page));
    if (input.limit) params.set("limit", String(input.limit));

    const queryString = params.toString();
    const response = await fetch(
      `${API_URL}/vouchers/batches${queryString ? `?${queryString}` : ""}`,
      {
        headers: getAuthHeaders(),
      },
    );
    if (!response.ok) throw new Error("Failed to fetch voucher batches");
    const responseData = (await response.json()) as Partial<VoucherBatchListResponse>;
    return {
      data: Array.isArray(responseData.data) ? responseData.data : [],
      count: Number(responseData.count ?? 0),
      page: Number(responseData.page ?? input.page ?? 1),
      limit: Number(responseData.limit ?? input.limit ?? 10),
    };
  } catch (error) {
    console.error("Error fetching voucher batches:", error);
    return {
      data: [],
      count: 0,
      page: input.page ?? 1,
      limit: input.limit ?? 10,
    };
  }
}

export async function sendVoucherEmail(id: string, email?: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/vouchers/${id}/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ email }),
    });
    return response.ok;
  } catch (error) {
    console.error("Error sending voucher email:", error);
    return false;
  }
}

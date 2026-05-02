import { API_URL, getAuthHeaders } from "./client";
import type {
  VoucherBatchCreateResult,
  VoucherBatchDetailResponse,
  VoucherBatchListResponse,
  VoucherOwnerType,
  VoucherStatus,
  VoucherData,
  VoucherListResponse,
} from "@akit/contracts";

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

export type {
  VoucherBatchCreateResult,
  VoucherBatchDetailItem,
  VoucherBatchDetailResponse,
  VoucherBatchListResponse,
  VoucherBatchSummary,
  VoucherData,
  VoucherListResponse,
} from "@akit/contracts";

export type VoucherStats = {
  totalBatches: number;
  totalVouchers: number;
  availableVouchers: number;
  usedVouchers: number;
  sentVouchers: number;
  expiredVouchers: number;
  revokedVouchers: number;
  redemptionRate: number;
};

export type VoucherAlert = {
  institutionId: string;
  institutionName: string;
  availableCount: number;
  message: string;
  severity: 'warning' | 'critical';
};

export async function fetchVoucherStats(institutionId?: string): Promise<{
  stats: VoucherStats;
  alerts: VoucherAlert[];
}> {
  try {
    const params = new URLSearchParams();
    if (institutionId) params.set("institutionId", institutionId);

    const response = await fetch(
      `${API_URL}/stats/vouchers${params.toString() ? `?${params.toString()}` : ""}`,
      {
        headers: getAuthHeaders(),
      },
    );
    if (!response.ok) throw new Error("Failed to fetch voucher stats");
    return await response.json();
  } catch (error) {
    console.error("Error fetching voucher stats:", error);
    return {
      stats: {
        totalBatches: 0,
        totalVouchers: 0,
        availableVouchers: 0,
        usedVouchers: 0,
        sentVouchers: 0,
        expiredVouchers: 0,
        revokedVouchers: 0,
        redemptionRate: 0,
      },
      alerts: [],
    };
  }
}

export async function fetchVouchersList(): Promise<VoucherData[]> {
  try {
    const response = await fetch(`${API_URL}/vouchers?limit=1000`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch vouchers");
    const responseData = await response.json();
    const vouchers: VoucherApi[] = responseData.data || [];
    const normalized = vouchers.map((voucher) => ({
      id: voucher.id,
      code: voucher.code,
      batchId: voucher.batchId,
      status: normalizeVoucherStatus(voucher.status),
      ownerType: normalizeVoucherOwnerType(voucher.ownerType),
      ownerInstitutionId: voucher.ownerInstitutionId ?? null,
      ownerInstitutionName: voucher.ownerInstitution?.name ?? "Institución no informada",
      ownerUserId: voucher.ownerUserId ?? null,
      ownerUserName: voucher.ownerUser?.name ?? "Cuenta operativa no informada",
      assignedPatientName: voucher.assignedPatientName ?? null,
      assignedPatientEmail: voucher.assignedPatientEmail ?? null,
      redeemedSessionId: voucher.redeemedSessionId ?? null,
      createdAt: voucher.createdAt,
      redeemedAt: voucher.redeemedAt ?? null,
      expiresAt: voucher.expiresAt ?? null,
    }));
    return normalized.map((voucher) => voucherBaseForUi(voucher));
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
    const mapped = vouchers.map((voucher) => ({
        id: voucher.id,
        code: voucher.code,
        batchId: voucher.batchId,
        status: normalizeVoucherStatus(voucher.status),
        ownerType: normalizeVoucherOwnerType(voucher.ownerType),
        ownerInstitutionId: voucher.ownerInstitutionId ?? null,
        ownerInstitutionName:
          voucher.ownerInstitution?.name ?? "Institución no informada",
        ownerUserId: voucher.ownerUserId ?? null,
        ownerUserName: voucher.ownerUser?.name ?? "Cuenta operativa no informada",
        assignedPatientName: voucher.assignedPatientName ?? null,
        assignedPatientEmail: voucher.assignedPatientEmail ?? null,
        redeemedSessionId: voucher.redeemedSessionId ?? null,
        createdAt: voucher.createdAt,
        redeemedAt: voucher.redeemedAt ?? null,
        expiresAt: voucher.expiresAt ?? null,
      }));
    const payload = {
      data: mapped.map((voucher) => voucherBaseForUi(voucher)),
      count: Number(responseData.count ?? 0),
      page: Number(responseData.page ?? input.page ?? 1),
      limit: Number(responseData.limit ?? input.limit ?? 10),
    };
    return payload;
  } catch (error) {
    console.error("Error fetching vouchers page:", error);
    return {
      data: [],
      count: 0,
      page: input.page ?? 1,
      limit: input.limit ?? 10,
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
    const responseData = await response.json();
    const payload = {
      data: Array.isArray(responseData.data) ? responseData.data : [],
      count: Number(responseData.count ?? 0),
      page: Number(responseData.page ?? input.page ?? 1),
      limit: Number(responseData.limit ?? input.limit ?? 10),
    };
    return payload;
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

export async function fetchVoucherBatchDetail(
  batchId: string,
): Promise<VoucherBatchDetailResponse | null> {
  try {
    const response = await fetch(`${API_URL}/vouchers/batches/${batchId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch voucher batch detail");
    return (await response.json()) as VoucherBatchDetailResponse;
  } catch (error) {
    console.error("Error fetching voucher batch detail:", error);
    return null;
  }
}

function voucherBaseForUi(voucher: Omit<VoucherData, "createdAt" | "redeemedAt" | "expiresAt"> & {
  createdAt: string | Date | number;
  redeemedAt: string | Date | number | null;
  expiresAt: string | Date | number | null;
}): VoucherData {
  return {
    ...voucher,
    createdAt: normalizeIsoDate(voucher.createdAt),
    redeemedAt: voucher.redeemedAt ? normalizeIsoDate(voucher.redeemedAt) : null,
    expiresAt: voucher.expiresAt ? normalizeIsoDate(voucher.expiresAt) : null,
  };
}

function normalizeIsoDate(value: string | Date | number): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return new Date(0).toISOString();
  return date.toISOString();
}

function normalizeVoucherStatus(value: string): VoucherStatus {
  const allowed: VoucherStatus[] = ["AVAILABLE", "SENT", "USED", "EXPIRED", "REVOKED"];
  return allowed.includes(value as VoucherStatus)
    ? (value as VoucherStatus)
    : "AVAILABLE";
}

function normalizeVoucherOwnerType(value: string): VoucherOwnerType {
  const allowed: VoucherOwnerType[] = ["THERAPIST", "INSTITUTION"];
  return allowed.includes(value as VoucherOwnerType)
    ? (value as VoucherOwnerType)
    : "INSTITUTION";
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

export async function resendVoucherEmail(id: string, email?: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/vouchers/${id}/resend`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ email }),
    });
    return response.ok;
  } catch (error) {
    console.error("Error resending voucher email:", error);
    return false;
  }
}

export async function revokeVoucher(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/vouchers/${id}/revoke`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    return response.ok;
  } catch (error) {
    console.error("Error revoking voucher:", error);
    return false;
  }
}

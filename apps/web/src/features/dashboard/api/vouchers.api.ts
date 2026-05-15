import { apiClient } from "../../../api/client";
import type {
  VoucherBatchCreateResult,
  VoucherBatchDetailItem,
  VoucherBatchDetailResponse,
  VoucherBatchListResponse,
  VoucherBatchSummary,
  VoucherOwnerType,
  VoucherStatus,
  VoucherData,
  VoucherListResponse,
  VoucherStats,
  VoucherAlert,
  VoucherApi,
} from "@akit/contracts";

export type {
  VoucherBatchCreateResult,
  VoucherBatchDetailItem,
  VoucherBatchDetailResponse,
  VoucherBatchListResponse,
  VoucherBatchSummary,
  VoucherOwnerType,
  VoucherStatus,
  VoucherData,
  VoucherListResponse,
  VoucherStats,
  VoucherAlert,
  VoucherApi,
};


export async function fetchVoucherStats(institutionId?: string): Promise<{
  stats: VoucherStats;
  alerts: VoucherAlert[];
}> {
  try {
    const params: Record<string, string> = {};
    if (institutionId) params.institutionId = institutionId;

    return await apiClient.get<{ stats: VoucherStats; alerts: VoucherAlert[] }>(
      "/stats/vouchers",
      { params }
    );
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
    const responseData = await apiClient.get<{ data: VoucherApi[] }>("/vouchers", {
      params: { limit: "1000" }
    });
    const vouchers = responseData.data || [];
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
    return await apiClient.post<VoucherBatchCreateResult>("/vouchers", input);
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
    const params: Record<string, string> = {};
    if (input.search?.trim()) params.search = input.search.trim();
    if (input.status && input.status !== "ALL") params.status = input.status;
    if (input.clientId?.trim()) params.clientId = input.clientId.trim();
    if (input.expiration && input.expiration !== "ALL") {
      params.expiration = input.expiration;
    }
    if (input.page) params.page = String(input.page);
    if (input.limit) params.limit = String(input.limit);

    const responseData = await apiClient.get<{ data: VoucherApi[], count: number, page: number, limit: number }>(
      "/vouchers",
      { params }
    );
    const vouchers = responseData.data || [];
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
    return {
      data: mapped.map((voucher) => voucherBaseForUi(voucher)),
      count: Number(responseData.count ?? 0),
      page: Number(responseData.page ?? input.page ?? 1),
      limit: Number(responseData.limit ?? input.limit ?? 10),
    };
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
    const params: Record<string, string> = {};
    if (input.search?.trim()) params.search = input.search.trim();
    if (input.clientId?.trim()) params.clientId = input.clientId.trim();
    if (input.expiration && input.expiration !== "ALL") {
      params.expiration = input.expiration;
    }
    if (input.page) params.page = String(input.page);
    if (input.limit) params.limit = String(input.limit);

    const responseData = await apiClient.get<VoucherBatchListResponse>(
      "/vouchers/batches",
      { params }
    );
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

export async function fetchVoucherBatchDetail(
  batchId: string,
): Promise<VoucherBatchDetailResponse | null> {
  try {
    return await apiClient.get<VoucherBatchDetailResponse>(`/vouchers/batches/${batchId}`);
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
    await apiClient.post(`/vouchers/${id}/send-email`, { email });
    return true;
  } catch (error) {
    console.error("Error sending voucher email:", error);
    return false;
  }
}

export async function resendVoucherEmail(id: string, email?: string): Promise<boolean> {
  try {
    await apiClient.post(`/vouchers/${id}/resend`, { email });
    return true;
  } catch (error) {
    console.error("Error resending voucher email:", error);
    return false;
  }
}

export async function revokeVoucher(id: string): Promise<boolean> {
  try {
    await apiClient.post(`/vouchers/${id}/revoke`);
    return true;
  } catch (error) {
    console.error("Error revoking voucher:", error);
    return false;
  }
}

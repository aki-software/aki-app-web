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

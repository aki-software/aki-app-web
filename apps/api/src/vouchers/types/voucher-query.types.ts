import { VoucherStatus } from '../entities/voucher.enums.js';

export interface VoucherScope {
  role?: string;
  ownerUserId?: string;
  ownerInstitutionId?: string | null;
}

export type VoucherBatchSummary = {
  batchId: string;
  ownerInstitutionName: string;
  ownerUserName: string;
  createdAt: Date | string;
  expiresAt: Date | string | null;
  total: number;
  available: number;
  used: number;
  pending: number;
};

export type VoucherBatchDetailItem = {
  id: string;
  code: string;
  status: VoucherStatus;
  assignedPatientName: string | null;
  assignedPatientEmail: string | null;
  redeemedSessionId: string | null;
  createdAt: Date | string;
  redeemedAt: Date | string | null;
  expiresAt: Date | string | null;
};

export type VoucherBatchDetail = {
  batchId: string;
  ownerInstitutionName: string;
  ownerUserName: string;
  createdAt: Date | string;
  expiresAt: Date | string | null;
  total: number;
  available: number;
  used: number;
  pending: number;
  vouchers: VoucherBatchDetailItem[];
};

export type RawVoucherBatchCountRow = { count: string };

export type RawVoucherBatchSummaryRow = {
  batch_id: string;
  ownerInstitutionName: string;
  ownerUserName: string;
  batchCreatedAt: Date | string;
  batchExpiresAt: Date | string | null;
  total: string;
  available: string;
  used: string;
  pending: string;
};

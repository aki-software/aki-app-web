import { z } from 'zod';

export const voucherStatusSchema = z.enum([
  'AVAILABLE',
  'SENT',
  'USED',
  'EXPIRED',
  'REVOKED',
]);

export const voucherOwnerTypeSchema = z.enum(['THERAPIST', 'INSTITUTION']);

export const voucherExpirationFilterSchema = z.enum([
  'ALL',
  'EXPIRING_7D',
  'NO_EXPIRATION',
]);

export interface VoucherScope {
  role?: string;
  email?: string;
  ownerUserId?: string;
  ownerInstitutionId?: string | null;
}

export type RawRecentVoucherRow = {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  sentAt?: string | null;
  redeemedAt?: string | null;
  ownerInstitutionName: string;
  ownerUserName: string;
};

export const voucherBaseSchema = z.object({
  id: z.string().uuid(),
  code: z.string().regex(/^[A-Za-z0-9]{8}$/),
  batchId: z.string().uuid(),
  status: voucherStatusSchema,
  ownerType: voucherOwnerTypeSchema,
  ownerInstitutionId: z.string().uuid().nullable(),
  ownerInstitutionName: z.string().optional(),
  ownerUserId: z.string().uuid().nullable(),
  ownerUserName: z.string().optional(),
  assignedPatientName: z.string().nullable().optional(),
  assignedPatientEmail: z.string().email().nullable().optional(),
  redeemedSessionId: z.string().uuid().nullable().optional(),
  createdAt: z.union([z.string(), z.instanceof(Date)]),
  redeemedAt: z.union([z.string(), z.instanceof(Date)]).nullable().optional(),
  expiresAt: z.union([z.string(), z.instanceof(Date)]).nullable().optional(),
  ownerInstitution: z.object({ name: z.string().nullable().optional() }).nullable().optional(),
  ownerUser: z.object({ name: z.string().nullable().optional() }).nullable().optional(),
});

export const voucherBatchSummarySchema = z.object({
  batchId: z.string().uuid(),
  ownerInstitutionName: z.string(),
  ownerUserName: z.string(),
  createdAt: z.union([z.string(), z.instanceof(Date)]),
  expiresAt: z.union([z.string(), z.instanceof(Date)]).nullable(),
  total: z.number().int(),
  available: z.number().int(),
  used: z.number().int(),
  pending: z.number().int(),
});

export const voucherBatchDetailItemSchema = z.object({
  id: z.string().uuid(),
  code: z.string().regex(/^[A-Za-z0-9]{8}$/),
  status: voucherStatusSchema,
  assignedPatientName: z.string().nullable(),
  assignedPatientEmail: z.string().email().nullable(),
  redeemedSessionId: z.string().uuid().nullable(),
  createdAt: z.union([z.string(), z.instanceof(Date)]),
  redeemedAt: z.union([z.string(), z.instanceof(Date)]).nullable(),
  expiresAt: z.union([z.string(), z.instanceof(Date)]).nullable(),
});

export const voucherBatchDetailResponseSchema = z.object({
  batchId: z.string().uuid(),
  ownerInstitutionName: z.string(),
  ownerUserName: z.string(),
  createdAt: z.union([z.string(), z.instanceof(Date)]),
  expiresAt: z.union([z.string(), z.instanceof(Date)]).nullable(),
  total: z.number().int(),
  available: z.number().int(),
  used: z.number().int(),
  pending: z.number().int(),
  vouchers: z.array(voucherBatchDetailItemSchema),
});

export const voucherBatchListResponseSchema = z.object({
  data: z.array(voucherBatchSummarySchema),
  count: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export const voucherListResponseSchema = z.object({
  data: z.array(voucherBaseSchema),
  count: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export const voucherBatchCreateResultSchema = z.object({
  batchId: z.string().uuid(),
  createdCount: z.number().int(),
  codes: z.array(z.string().regex(/^[A-Za-z0-9]{8}$/)),
  ownerType: voucherOwnerTypeSchema,
  ownerUserId: z.string().uuid().nullable(),
  ownerInstitutionId: z.string().uuid().nullable(),
  expiresAt: z.string().nullable(),
});

export const voucherApiSchema = z.object({
  id: z.string().uuid(),
  code: z.string().regex(/^[A-Za-z0-9]{8}$/),
  batchId: z.string().uuid(),
  status: z.string(),
  ownerType: z.string(),
  ownerInstitutionId: z.string().uuid().nullable().optional(),
  ownerInstitution: z.object({ name: z.string().nullable().optional() }).nullable().optional(),
  ownerUserId: z.string().uuid().nullable().optional(),
  ownerUser: z.object({ name: z.string().nullable().optional() }).nullable().optional(),
  assignedPatientName: z.string().nullable().optional(),
  assignedPatientEmail: z.string().email().nullable().optional(),
  redeemedSessionId: z.string().uuid().nullable().optional(),
  createdAt: z.union([z.string(), z.instanceof(Date), z.number()]),
  redeemedAt: z.union([z.string(), z.instanceof(Date), z.number()]).nullable().optional(),
  expiresAt: z.union([z.string(), z.instanceof(Date), z.number()]).nullable().optional(),
});

export type VoucherApi = z.infer<typeof voucherApiSchema>;

export const redeemVoucherRequestSchema = z.object({
  code: z.string().regex(/^[A-Za-z0-9]{8}$/),
  sessionId: z.string().uuid(),
});

export const redeemVoucherStatusSchema = z.enum([
  'REDEEMED',
  'ALREADY_REDEEMED_BY_THIS_SESSION',
]);

export const redeemVoucherResponseSchema = z.object({
  success: z.literal(true),
  status: redeemVoucherStatusSchema,
  voucherCode: z.string().regex(/^[A-Za-z0-9]{8}$/),
  sessionId: z.string().uuid(),
});

export const listVouchersQuerySchema = z.object({
  search: z.string().optional(),
  status: voucherStatusSchema.optional(),
  clientId: z.string().uuid().optional(),
  expiration: voucherExpirationFilterSchema.optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const listVoucherBatchesQuerySchema = z.object({
  search: z.string().optional(),
  clientId: z.string().uuid().optional(),
  expiration: voucherExpirationFilterSchema.optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export type VoucherStatus = z.infer<typeof voucherStatusSchema>;
export type VoucherOwnerType = z.infer<typeof voucherOwnerTypeSchema>;
export type VoucherExpirationFilter = z.infer<typeof voucherExpirationFilterSchema>;
export type VoucherData = z.infer<typeof voucherBaseSchema>;
export type VoucherBatchSummary = z.infer<typeof voucherBatchSummarySchema>;
export type VoucherBatchDetailItem = z.infer<typeof voucherBatchDetailItemSchema>;
export type VoucherBatchDetailResponse = z.infer<
  typeof voucherBatchDetailResponseSchema
>;
export type VoucherBatchListResponse = z.infer<
  typeof voucherBatchListResponseSchema
>;
export type VoucherListResponse = z.infer<typeof voucherListResponseSchema>;
export type VoucherBatchCreateResult = z.infer<
  typeof voucherBatchCreateResultSchema
>;
export type RedeemVoucherRequest = z.infer<typeof redeemVoucherRequestSchema>;
export type RedeemVoucherResponse = z.infer<typeof redeemVoucherResponseSchema>;
export type ListVouchersQuery = z.infer<typeof listVouchersQuerySchema>;
export type ListVoucherBatchesQuery = z.infer<typeof listVoucherBatchesQuerySchema>;

export interface VoucherStats {
  totalBatches: number;
  totalVouchers: number;
  availableVouchers: number;
  usedVouchers: number;
  sentVouchers: number;
  expiredVouchers: number;
  revokedVouchers: number;
  redemptionRate: number;
}

export interface VoucherStatsResponse {
  stats: VoucherStats;
  alerts: VoucherAlert[];
}

export type VoucherBatchDetail = VoucherBatchDetailResponse;

export type RawVoucherBatchCountRow = { count: string };

export type RawVoucherBatchSummaryRow = {
  batch_id: string;
  ownerInstitutionName: string;
  ownerUserName: string;
  batchCreatedAt: string;
  batchExpiresAt: string | null;
  total: string;
  available: string;
  used: string;
  pending: string;
};

export interface VoucherAlert {
  institutionId: string;
  institutionName: string;
  availableCount: number;
  message: string;
  severity: 'warning' | 'critical';
}

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

export const voucherBaseSchema = z.object({
  id: z.string().uuid(),
  code: z.string().regex(/^[A-Za-z0-9]{8}$/),
  batchId: z.string().uuid(),
  status: voucherStatusSchema,
  ownerType: voucherOwnerTypeSchema,
  ownerInstitutionId: z.string().uuid().nullable(),
  ownerInstitutionName: z.string(),
  ownerUserId: z.string().uuid().nullable(),
  ownerUserName: z.string(),
  assignedPatientName: z.string().nullable(),
  assignedPatientEmail: z.string().email().nullable(),
  redeemedSessionId: z.string().uuid().nullable(),
  createdAt: z.string(),
  redeemedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
});

export const voucherBatchSummarySchema = z.object({
  batchId: z.string().uuid(),
  ownerInstitutionName: z.string(),
  ownerUserName: z.string(),
  createdAt: z.string(),
  expiresAt: z.string().nullable(),
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
  createdAt: z.string(),
  redeemedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
});

export const voucherBatchDetailResponseSchema = z.object({
  batchId: z.string().uuid(),
  ownerInstitutionName: z.string(),
  ownerUserName: z.string(),
  createdAt: z.string(),
  expiresAt: z.string().nullable(),
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

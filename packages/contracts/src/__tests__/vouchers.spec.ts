import { describe, it, expect } from 'vitest';
import { voucherApiSchema, voucherBatchDetailResponseSchema } from '../vouchers';

describe('Voucher Contracts', () => {
  const validVoucher = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    code: 'AB12CD34',
    batchId: '123e4567-e89b-12d3-a456-426614174001',
    status: 'AVAILABLE',
    ownerType: 'INSTITUTION',
    ownerInstitutionId: '123e4567-e89b-12d3-a456-426614174002',
    ownerInstitution: { name: 'Institute A' },
    ownerUserId: null,
    ownerUser: null,
    assignedPatientName: 'Patient X',
    assignedPatientEmail: 'patient@example.com',
    redeemedSessionId: null,
    createdAt: '2026-05-15T12:00:00.000Z',
    redeemedAt: null,
    expiresAt: null
  };

  it('should validate a complete voucher object', () => {
    const result = voucherApiSchema.safeParse(validVoucher);
    expect(result.success).toBe(true);
  });

  it('should allow optional fields to be missing', () => {
    const minimalVoucher = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      code: 'AB12CD34',
      batchId: '123e4567-e89b-12d3-a456-426614174001',
      status: 'AVAILABLE',
      ownerType: 'THERAPIST',
      createdAt: '2026-05-15T12:00:00.000Z'
    };
    const result = voucherApiSchema.safeParse(minimalVoucher);
    expect(result.success).toBe(true);
  });

  describe('voucherBatchDetailResponseSchema (paginated)', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    const validBatchDetail = {
      batchId: uuid,
      ownerInstitutionName: 'Test Institution',
      ownerUserName: 'Test User',
      createdAt: '2026-05-15T12:00:00.000Z',
      expiresAt: null,
      total: 50,
      available: 30,
      used: 15,
      pending: 5,
      data: [
        {
          id: uuid,
          code: 'AB12CD34',
          status: 'AVAILABLE',
          assignedPatientName: null,
          assignedPatientEmail: null,
          redeemedSessionId: null,
          createdAt: '2026-05-15T12:00:00.000Z',
          redeemedAt: null,
          expiresAt: null,
        },
      ],
      count: 50,
      page: 1,
      limit: 20,
    };

    it('should validate a complete paginated batch detail response with data/count/page/limit', () => {
      const result = voucherBatchDetailResponseSchema.safeParse(validBatchDetail);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data.data)).toBe(true);
        expect(result.data.count).toBe(50);
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should require the "data" field and reject the old "vouchers" field', () => {
      const oldFormat = {
        ...validBatchDetail,
        vouchers: validBatchDetail.data,
        data: undefined,
      };
      const result = voucherBatchDetailResponseSchema.safeParse(oldFormat);
      expect(result.success).toBe(false);
    });

    it('should enforce numeric count/page/limit as integers', () => {
      const badTypes = {
        ...validBatchDetail,
        count: '50',
        page: '1',
        limit: '20',
      };
      const result = voucherBatchDetailResponseSchema.safeParse(badTypes);
      expect(result.success).toBe(false);
    });

    it('should reject missing pagination fields', () => {
      const noPagination = { ...validBatchDetail };
      delete (noPagination as Record<string, unknown>).count;
      const result = voucherBatchDetailResponseSchema.safeParse(noPagination);
      expect(result.success).toBe(false);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { voucherApiSchema } from '../vouchers';

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
});

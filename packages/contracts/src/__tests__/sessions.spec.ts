import { describe, it, expect } from 'vitest';
import { sessionApiSchema } from '../sessions';

describe('Session Contracts', () => {
  const validSession = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    patientName: 'John Doe',
    createdAt: '2026-05-15T12:00:00.000Z',
    totalTimeMs: 3600000,
    paymentStatus: 'PAID',
    reportUnlockedAt: null,
    results: [
      { categoryId: 'R', percentage: 80 }
    ],
    institution: { name: 'A.kit Institute' },
    therapist: { name: 'Dr. Smith' },
    voucher: { code: 'ABC12345' }
  };

  it('should validate a complete session object', () => {
    const result = sessionApiSchema.safeParse(validSession);
    expect(result.success).toBe(true);
  });

  it('should allow optional fields to be missing', () => {
    const minimalSession = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      patientName: 'John Doe'
    };
    const result = sessionApiSchema.safeParse(minimalSession);
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUIDs', () => {
    const invalidSession = { ...validSession, id: 'invalid-uuid' };
    const result = sessionApiSchema.safeParse(invalidSession);
    expect(result.success).toBe(false);
  });
});

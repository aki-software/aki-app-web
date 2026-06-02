import { describe, expect, it } from 'vitest';
import { appErrorCodeSchema, appErrorSchema } from '../errors.schemas';

describe('App error contracts', () => {
  it('accepts stable voucher redemption error codes', () => {
    const codes = [
      'INVALID_CODE',
      'ALREADY_USED',
      'SESSION_NOT_FOUND',
      'VOUCHER_EXPIRED',
      'SERVICE_UNAVAILABLE',
    ] as const;

    for (const code of codes) {
      expect(appErrorCodeSchema.safeParse(code).success).toBe(true);
    }
  });

  it('rejects unsupported error codes', () => {
    expect(appErrorCodeSchema.safeParse('DOES_NOT_EXIST').success).toBe(false);
  });

  it('validates structured app error envelopes with voucher codes', () => {
    const result = appErrorSchema.safeParse({
      code: 'VOUCHER_EXPIRED',
      message: 'Voucher expired',
      statusCode: 400,
      timestamp: '2026-06-01T12:00:00.000Z',
      path: '/api/v1/vouchers/redeem',
    });

    expect(result.success).toBe(true);
  });

  it('rejects envelopes missing the stable code field', () => {
    expect(
      appErrorSchema.safeParse({
        message: 'Voucher expired',
        statusCode: 400,
        timestamp: '2026-06-01T12:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});

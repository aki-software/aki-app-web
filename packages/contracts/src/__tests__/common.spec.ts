import { describe, it, expect } from 'vitest';
import { apiErrorResponseSchema } from '../common';

describe('Common Contracts', () => {
  const validError = {
    statusCode: 404,
    message: 'Not Found',
    error: 'Not Found',
    code: 'RESOURCE_NOT_FOUND',
    timestamp: '2026-05-15T12:00:00.000Z',
    path: '/api/v1/sessions'
  };

  it('should validate a complete error object', () => {
    const result = apiErrorResponseSchema.safeParse(validError);
    expect(result.success).toBe(true);
  });

  it('should allow optional fields to be missing', () => {
    const minimalError = {
      statusCode: 500,
      message: 'Internal Server Error',
      timestamp: '2026-05-15T12:00:00.000Z'
    };
    const result = apiErrorResponseSchema.safeParse(minimalError);
    expect(result.success).toBe(true);
  });
});

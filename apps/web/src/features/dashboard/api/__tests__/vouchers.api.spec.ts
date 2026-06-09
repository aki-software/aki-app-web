import { describe, it, expect, beforeEach } from 'vitest';
import { fetchVoucherBatchDetail } from '../vouchers.api';
import { mockEndpoint, resetMockApi } from '../../../../test/mock-api-client';

describe('fetchVoucherBatchDetail', () => {
  beforeEach(() => {
    resetMockApi();
  });

  it('fetches batch detail without pagination params', async () => {
    const mockResponse = {
      batchId: 'abc-123',
      total: 10,
      available: 5,
      used: 3,
      pending: 2,
      data: [{ id: 'v1', code: 'V001', status: 'AVAILABLE', createdAt: '2024-01-01', expiresAt: null }],
      count: 10,
      page: 1,
      limit: 20,
    };
    mockEndpoint('get', '/vouchers/batches/abc-123', mockResponse);

    const result = await fetchVoucherBatchDetail('abc-123');
    expect(result).not.toBeNull();
    expect(result!.batchId).toBe('abc-123');
    expect(result!.data).toHaveLength(1);
    expect(result!.count).toBe(10);
    expect(result!.page).toBe(1);
  });

  it('passes page and limit params when provided', async () => {
    const mockResponse = {
      batchId: 'abc-123',
      total: 50,
      available: 30,
      used: 10,
      pending: 10,
      data: [
        { id: 'v11', code: 'V011', status: 'AVAILABLE', createdAt: '2024-01-01', expiresAt: null },
        { id: 'v12', code: 'V012', status: 'AVAILABLE', createdAt: '2024-01-01', expiresAt: null },
      ],
      count: 50,
      page: 2,
      limit: 10,
    };
    mockEndpoint('get', '/vouchers/batches/abc-123', mockResponse);

    const result = await fetchVoucherBatchDetail('abc-123', { page: 2, limit: 10 });
    expect(result).not.toBeNull();
    expect(result!.data).toHaveLength(2);
    expect(result!.page).toBe(2);
    expect(result!.limit).toBe(10);
    expect(result!.count).toBe(50);
  });

  it('returns null on error', async () => {
    mockEndpoint('get', '/vouchers/batches/bad-id', null, 500);
    const result = await fetchVoucherBatchDetail('bad-id');
    expect(result).toBeNull();
  });
});

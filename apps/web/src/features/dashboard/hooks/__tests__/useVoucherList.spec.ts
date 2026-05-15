import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useVoucherList } from '../useVoucherList';
import * as dashboardApi from '../../api/dashboard';

vi.mock('../../api/dashboard', () => ({
  fetchVoucherBatches: vi.fn(),
  fetchVouchersPage: vi.fn(),
}));

describe('useVoucherList', () => {
  const mockFilters = {
    searchTerm: '',
    statusFilter: 'ALL' as const,
    expirationFilter: 'ALL' as const,
    clientFilter: 'ALL',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch batch data when viewMode is BATCHES', async () => {
    const mockData = { data: [{ batchId: '1' }], count: 1 };
    vi.mocked(dashboardApi.fetchVoucherBatches).mockResolvedValue(mockData as any);

    const { result } = renderHook(() => useVoucherList(mockFilters, 'BATCHES'));

    await waitFor(() => {
      expect(result.current.batchItems).toHaveLength(1);
    });

    expect(dashboardApi.fetchVoucherBatches).toHaveBeenCalled();
  });

  it('should fetch individual data when viewMode is INDIVIDUAL', async () => {
    const mockData = { data: [{ id: 'v1' }], count: 1 };
    vi.mocked(dashboardApi.fetchVouchersPage).mockResolvedValue(mockData as any);

    const { result } = renderHook(() => useVoucherList(mockFilters, 'INDIVIDUAL'));

    await waitFor(() => {
      expect(result.current.individualItems).toHaveLength(1);
    });

    expect(dashboardApi.fetchVouchersPage).toHaveBeenCalled();
  });

  it('should reset page when filters change', async () => {
    vi.mocked(dashboardApi.fetchVoucherBatches).mockResolvedValue({ data: [], count: 0 } as any);
    
    const { result, rerender } = renderHook(
      ({ filters }) => useVoucherList(filters, 'BATCHES'),
      { initialProps: { filters: mockFilters } }
    );

    // Manually set page
    act(() => {
      result.current.setCurrentPage(2);
    });
    
    expect(result.current.currentPage).toBe(2);

    // Change filters
    act(() => {
      rerender({ filters: { ...mockFilters, searchTerm: 'new search' } });
    });

    expect(result.current.currentPage).toBe(1);
  });
});

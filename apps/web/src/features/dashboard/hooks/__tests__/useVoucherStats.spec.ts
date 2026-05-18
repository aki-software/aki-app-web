import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVoucherStats } from '../useVoucherStats';
import * as dashboardApi from '../../api/dashboard';

vi.mock('../../api/dashboard', () => ({
  fetchInstitutions: vi.fn(),
  fetchTherapists: vi.fn(),
  fetchVoucherStats: vi.fn(),
  fetchVouchersList: vi.fn(),
}));

describe('useVoucherStats', () => {
  const mockUser = { 
    id: 'u-1', 
    email: 'test@example.com', 
    name: 'Test User', 
    role: 'ADMIN', 
    institutionId: 'inst-1' 
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch metrics and metadata on load', async () => {
    vi.mocked(dashboardApi.fetchVouchersList).mockResolvedValue([]);
    vi.mocked(dashboardApi.fetchInstitutions).mockResolvedValue([{ id: '1', name: 'Inst 1' }] as any);
    vi.mocked(dashboardApi.fetchTherapists).mockResolvedValue([]);
    vi.mocked(dashboardApi.fetchVoucherStats).mockResolvedValue({
      stats: { totalVouchers: 10 } as any,
      alerts: []
    });

    const { result } = renderHook(() => useVoucherStats(mockUser, true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.stats?.totalVouchers).toBe(10);
      expect(result.current.institutions).toHaveLength(1);
    });

    expect(dashboardApi.fetchVoucherStats).toHaveBeenCalledWith('inst-1');
  });

  it('should calculate clientOptions from vouchers', async () => {
    vi.mocked(dashboardApi.fetchVouchersList).mockResolvedValue([
      { ownerInstitutionId: 'i1', ownerInstitutionName: 'Inst A' },
      { ownerInstitutionId: 'i1', ownerInstitutionName: 'Inst A' },
      { ownerInstitutionId: 'i2', ownerInstitutionName: 'Inst B' },
    ] as any);
    vi.mocked(dashboardApi.fetchVoucherStats).mockResolvedValue({ stats: {} as any, alerts: [] });

    const { result } = renderHook(() => useVoucherStats(mockUser, false));

    await waitFor(() => {
      expect(result.current.clientOptions).toHaveLength(2);
      expect(result.current.clientOptions[0].name).toBe('Inst A');
    });
  });
});

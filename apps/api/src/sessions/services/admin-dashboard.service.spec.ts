import { Test, TestingModule } from '@nestjs/testing';
import { AdminDashboardService } from './admin-dashboard.service.js';
import { CategoriesService } from '../../categories/categories.service.js';
import { VouchersService } from '../../vouchers/vouchers.service.js';
import { AdminDashboardRepository } from '../repositories/admin-dashboard.repository.js';

jest.mock('../utils/admin-dashboard-formatter.util.js', () => ({
  getPeriodStart: jest.fn().mockReturnValue(new Date('2024-01-25T00:00:00Z')),
  formatResultsDistribution: jest.fn().mockReturnValue([]),
  buildOverviewPayload: jest.fn().mockReturnValue({ totalSessions: 10 }),
  formatSessionActivity: jest.fn().mockReturnValue([]),
  mergeActivity: jest.fn().mockReturnValue([]),
}));

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;

  const categoriesService = {
    findAll: jest.fn(),
  };
  const vouchersService = {
    getRecentActivity: jest.fn(),
    getExpiringSoonCount: jest.fn(),
  };

  const dashboardRepositoryMock = {
    getVoucherTotals: jest.fn().mockResolvedValue({}),
    getPeriodVoucherStats: jest.fn().mockResolvedValue({}),
    getStalledSessionsCount: jest.fn().mockResolvedValue(0),
    getSessionTotals: jest.fn().mockResolvedValue({}),
    getPeriodSessionStats: jest.fn().mockResolvedValue({}),
    getDailyActivity: jest.fn().mockResolvedValue([]),
    getTopResultsDistribution: jest.fn().mockResolvedValue([]),
    getRecentSessionRows: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDashboardService,
        { provide: CategoriesService, useValue: categoriesService },
        { provide: VouchersService, useValue: vouchersService },
        {
          provide: AdminDashboardRepository,
          useValue: dashboardRepositoryMock,
        },
      ],
    }).compile();

    service = module.get(AdminDashboardService);
    jest.clearAllMocks();
  });

  it('builds overview payload', async () => {
    vouchersService.getExpiringSoonCount.mockResolvedValue(1);
    categoriesService.findAll.mockResolvedValue([]);

    const result = await service.getAdminOverview(7);
    expect(result.totalSessions).toBe(10);
  });

  it('builds admin activity', async () => {
    vouchersService.getRecentActivity.mockResolvedValue([]);
    const result = await service.getAdminActivity(5);
    expect(result).toEqual([]);
  });
});

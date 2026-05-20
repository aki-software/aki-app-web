import { Test, TestingModule } from '@nestjs/testing';
import { AdminDashboardService } from './admin-dashboard.service.js';
import { AdminDashboardStatsService } from './admin-dashboard-stats.service.js';
import { AdminDashboardQueriesService } from './admin-dashboard-queries.service.js';
import { AdminDashboardFormatterService } from './admin-dashboard-formatter.service.js';
import { CategoriesService } from '../../categories/categories.service.js';
import { VouchersService } from '../../vouchers/vouchers.service.js';
import type { DashboardStatsPayload } from '@akit/contracts';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  const categoriesService = {
    findAll: jest.fn(),
  };
  const queriesService = {
    getRecentSessionRows: jest.fn(),
    getStalledSessionsCount: jest.fn(),
  };
  const vouchersService = {
    getRecentActivity: jest.fn(),
    getExpiringSoonCount: jest.fn(),
  };
  const statsService = {
    getVoucherTotals: jest.fn(),
    getPeriodVoucherStats: jest.fn(),
    getSessionTotals: jest.fn(),
    getPeriodSessionStats: jest.fn(),
    getDailyActivity: jest.fn(),
    getTopResultsDistribution: jest.fn(),
  };
  const formatter = {
    getPeriodStart: jest.fn(),
    formatResultsDistribution: jest.fn(),
    buildOverviewPayload: jest.fn(),
    formatSessionActivity: jest.fn(),
    mergeActivity: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDashboardService,
        { provide: CategoriesService, useValue: categoriesService },
        { provide: AdminDashboardQueriesService, useValue: queriesService },
        { provide: VouchersService, useValue: vouchersService },
        { provide: AdminDashboardStatsService, useValue: statsService },
        { provide: AdminDashboardFormatterService, useValue: formatter },
      ],
    }).compile();

    service = module.get(AdminDashboardService);
    jest.clearAllMocks();
  });

  it('builds overview using formatter and consolidated stats', async () => {
    const periodStart = new Date('2024-01-25T00:00:00Z');
    const voucherTotals = { available: '1', redeemed: '2', historical: '3' };
    const periodVoucherStats = { issued: '4', redeemed: '2' };
    const sessionTotals = {
      totalSessions: '10',
      totalTimeMs: '1000',
      completedSessions: '7',
    };
    const periodSessionStats = {
      started: '5',
      completed: '4',
      reportsUnlocked: '3',
      voucherStarted: '2',
      voucherCompleted: '1',
      voucherReportsUnlocked: '1',
      individualCompleted: '3',
    };
    const dailyActivityRows = [{ day: '2024-01-31', count: '2' }];
    const distributionRows = [{ categoryId: 'A', count: '1' }];
    const categories = [{ categoryId: 'A', title: 'Alpha', description: '' }];
    const resultsDistribution = [{ categoryId: 'A', name: 'Alpha', count: 1 }];
    const activity = [
      {
        id: 'session-1',
        type: 'SESSION_STARTED',
        title: 'Sesión iniciada',
        description: 'Test',
        occurredAt: '2024-01-01T00:00:00Z',
      },
    ];
    const expectedPayload = {
      totalSessions: 10,
    } as DashboardStatsPayload;

    formatter.getPeriodStart.mockReturnValue(periodStart);
    statsService.getVoucherTotals.mockResolvedValue(voucherTotals);
    statsService.getPeriodVoucherStats.mockResolvedValue(periodVoucherStats);
    vouchersService.getExpiringSoonCount.mockResolvedValue(1);
    queriesService.getStalledSessionsCount.mockResolvedValue(2);
    statsService.getSessionTotals.mockResolvedValue(sessionTotals);
    statsService.getPeriodSessionStats.mockResolvedValue(periodSessionStats);
    statsService.getDailyActivity.mockResolvedValue(dailyActivityRows);
    statsService.getTopResultsDistribution.mockResolvedValue(distributionRows);
    categoriesService.findAll.mockResolvedValue(categories);
    formatter.formatResultsDistribution.mockReturnValue(resultsDistribution);
    jest.spyOn(service, 'getAdminActivity').mockResolvedValue(activity);
    formatter.buildOverviewPayload.mockReturnValue(expectedPayload);

    const result = await service.getAdminOverview(7);

    expect(formatter.getPeriodStart).toHaveBeenCalledWith(7, expect.any(Date));
    expect(formatter.formatResultsDistribution).toHaveBeenCalledWith(
      categories,
      distributionRows,
    );
    expect(formatter.buildOverviewPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        periodDays: 7,
        periodStart,
        voucherTotals,
        periodVoucherStats,
        sessionTotals,
        periodSessionStats,
        dailyActivityRows,
        resultsDistribution,
        activity,
      }),
    );
    expect(result).toEqual(expectedPayload);
  });

  it('builds admin activity using formatter', async () => {
    const sessionRows = [{ id: '1' }];
    const voucherActivity = [
      {
        id: 'voucher-1',
        type: 'VOUCHER_ISSUED',
        title: 'Voucher emitido',
        description: 'Voucher',
        occurredAt: '2024-01-02T00:00:00Z',
      },
    ];
    const sessionActivity = [
      {
        id: 'session-1',
        type: 'SESSION_STARTED',
        title: 'Sesión iniciada',
        description: 'Test',
        occurredAt: '2024-01-01T00:00:00Z',
      },
    ];
    const merged = [voucherActivity[0]];

    queriesService.getRecentSessionRows.mockResolvedValue(sessionRows);
    vouchersService.getRecentActivity.mockResolvedValue(voucherActivity);
    formatter.formatSessionActivity.mockReturnValue(sessionActivity);
    formatter.mergeActivity.mockReturnValue(merged);

    const result = await service.getAdminActivity(5);

    expect(queriesService.getRecentSessionRows).toHaveBeenCalledWith(5);
    expect(formatter.formatSessionActivity).toHaveBeenCalledWith(sessionRows);
    expect(formatter.mergeActivity).toHaveBeenCalledWith(
      sessionActivity,
      voucherActivity,
      5,
    );
    expect(result).toEqual(merged);
  });
});

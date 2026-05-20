import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminDashboardStatsService } from './admin-dashboard-stats.service.js';
import { Session, SessionPaymentStatus } from '../entities/session.entity.js';
import { Voucher } from '../../vouchers/entities/voucher.entity.js';
import { VoucherStatus } from '../../vouchers/entities/voucher.enums.js';

describe('AdminDashboardStatsService', () => {
  let service: AdminDashboardStatsService;
  const voucherQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
  };
  const voucherRepository = {
    createQueryBuilder: jest.fn(() => voucherQueryBuilder),
  };
  const sessionRepository = {
    manager: {
      query: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDashboardStatsService,
        { provide: getRepositoryToken(Session), useValue: sessionRepository },
        { provide: getRepositoryToken(Voucher), useValue: voucherRepository },
      ],
    }).compile();

    service = module.get(AdminDashboardStatsService);
    voucherQueryBuilder.getRawOne.mockReset();
    sessionRepository.manager.query.mockReset();
  });

  it('consolidates voucher totals in one query', async () => {
    voucherQueryBuilder.getRawOne.mockResolvedValue({
      available: '2',
      redeemed: '1',
      historical: '3',
    });

    const result = await service.getVoucherTotals();

    expect(voucherRepository.createQueryBuilder).toHaveBeenCalledWith(
      'voucher',
    );
    expect(voucherQueryBuilder.setParameters).toHaveBeenCalledWith({
      availableStatus: VoucherStatus.AVAILABLE,
      usedStatus: VoucherStatus.USED,
    });
    expect(result).toEqual({
      available: '2',
      redeemed: '1',
      historical: '3',
    });
  });

  it('consolidates period voucher stats in one query', async () => {
    const periodStart = new Date('2024-01-01T00:00:00Z');
    voucherQueryBuilder.getRawOne.mockResolvedValue({
      issued: '4',
      redeemed: '2',
    });

    const result = await service.getPeriodVoucherStats(periodStart);

    expect(voucherQueryBuilder.setParameters).toHaveBeenCalledWith({
      periodStart,
      usedStatus: VoucherStatus.USED,
    });
    expect(result).toEqual({ issued: '4', redeemed: '2' });
  });

  it('returns consolidated session totals', async () => {
    sessionRepository.manager.query.mockResolvedValue([
      { totalSessions: '10', totalTimeMs: '5000', completedSessions: '7' },
    ]);

    const result = await service.getSessionTotals();

    expect(sessionRepository.manager.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM sessions'),
    );
    expect(result).toEqual({
      totalSessions: '10',
      totalTimeMs: '5000',
      completedSessions: '7',
    });
  });

  it('returns consolidated period session stats', async () => {
    const periodStart = new Date('2024-01-01T00:00:00Z');
    sessionRepository.manager.query.mockResolvedValue([
      {
        started: '5',
        completed: '4',
        reportsUnlocked: '3',
        voucherStarted: '2',
        voucherCompleted: '1',
        voucherReportsUnlocked: '1',
        individualCompleted: '3',
      },
    ]);

    const result = await service.getPeriodSessionStats(periodStart);

    expect(sessionRepository.manager.query).toHaveBeenCalledWith(
      expect.stringContaining('voucher_id IS NOT NULL'),
      [periodStart, SessionPaymentStatus.VOUCHER_REDEEMED],
    );
    expect(result.individualCompleted).toBe('3');
  });
});

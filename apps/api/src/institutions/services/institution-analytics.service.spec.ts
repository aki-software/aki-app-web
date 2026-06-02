import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InstitutionAnalyticsService } from './institution-analytics.service.js';
import { Voucher } from '../../vouchers/entities/voucher.entity.js';
import { Session } from '../../sessions/entities/session.entity.js';
import { CategoriesService } from '../../categories/categories.service.js';
import { VoucherStatus } from '../../vouchers/entities/voucher.enums.js';

describe('InstitutionAnalyticsService', () => {
  let service: InstitutionAnalyticsService;
  let voucherRepository: any;
  let sessionRepository: any;
  let categoriesService: any;

  beforeEach(async () => {
    voucherRepository = {
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    sessionRepository = {
      count: jest.fn(),
      find: jest.fn(),
      manager: {
        createQueryBuilder: jest.fn(),
      },
    };
    categoriesService = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstitutionAnalyticsService,
        {
          provide: getRepositoryToken(Voucher),
          useValue: voucherRepository,
        },
        {
          provide: getRepositoryToken(Session),
          useValue: sessionRepository,
        },
        {
          provide: CategoriesService,
          useValue: categoriesService,
        },
      ],
    }).compile();

    service = module.get<InstitutionAnalyticsService>(
      InstitutionAnalyticsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStats', () => {
    it('should aggregate counts correctly', async () => {
      voucherRepository.count.mockImplementation((params) => {
        if (params?.where?.status === VoucherStatus.USED)
          return Promise.resolve(10);
        return Promise.resolve(50); // Total vouchers
      });
      sessionRepository.count.mockImplementation((params) => {
        if (params?.where?.paymentStatus) return Promise.resolve(8);
        return Promise.resolve(12); // Total sessions
      });

      const result = await service.getStats('inst-123');
      expect(result).toEqual({
        totalVouchers: 50,
        usedVouchers: 10,
        availableVouchers: 40,
        totalSessions: 12,
        paidSessions: 8,
        pendingSessions: 4,
      });
    });
  });

  describe('getOverview', () => {
    it('should calculate overview and category distribution correctly', async () => {
      // Mock createQueryBuilder for voucher status counts
      const mockVoucherQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: VoucherStatus.AVAILABLE, count: '30' },
          { status: VoucherStatus.USED, count: '20' },
        ]),
      };
      voucherRepository.createQueryBuilder.mockReturnValue(
        mockVoucherQueryBuilder,
      );
      voucherRepository.count.mockResolvedValue(50);

      // Mock session queries
      sessionRepository.find.mockResolvedValue([
        { id: 's1', hollandCode: 'RIASEC', reportUnlockedAt: new Date() },
        { id: 's2', hollandCode: '', reportUnlockedAt: null },
      ]);

      // Mock categories
      categoriesService.findAll.mockResolvedValue([
        { categoryId: 'R', title: 'Realista' },
        { categoryId: 'I', title: 'Investigativo' },
      ]);

      // Mock manager query builder for topResultsRows
      const mockManagerQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { categoryId: 'R', count: '5' },
          { categoryId: 'I', count: '3' },
        ]),
      };
      sessionRepository.manager.createQueryBuilder.mockReturnValue(
        mockManagerQueryBuilder,
      );

      const result = await service.getOverview('inst-123', 7);

      expect(result.periodDays).toBe(7);
      expect(result.vouchers.total).toBe(50);
      expect(result.vouchers.available).toBe(30);
      expect(result.vouchers.used).toBe(20);
      expect(result.tests.testsStartedPeriod).toBe(2);
      expect(result.tests.testsCompletedPeriod).toBe(1);
      expect(result.resultsDistribution).toEqual([
        { categoryId: 'R', name: 'Realista', count: 5 },
        { categoryId: 'I', name: 'Investigativo', count: 3 },
      ]);
    });
  });
});

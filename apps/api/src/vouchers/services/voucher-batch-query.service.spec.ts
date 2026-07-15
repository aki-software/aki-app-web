import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VoucherBatchQueryService } from './voucher-batch-query.service.js';
import { VoucherAccessService } from './voucher-access.service.js';
import { Voucher } from '../entities/voucher.entity.js';
import { VoucherStatus } from '../entities/voucher.enums.js';

describe('VoucherBatchQueryService', () => {
  let service: VoucherBatchQueryService;
  let voucherRepository: { createQueryBuilder: jest.Mock };
  let accessService: { applyScopeFilter: jest.Mock };
  let mockQb: Record<string, jest.Mock>;

  const batchId = '123e4567-e89b-12d3-a456-426614174000';

  const buildMockVoucher = (overrides: Partial<Voucher> = {}) =>
    ({
      id: 'v-1',
      code: 'AB12CD34',
      status: VoucherStatus.AVAILABLE,
      batchId,
      assignedPatientName: null,
      assignedPatientEmail: null,
      redeemedSessionId: null,
      createdAt: new Date('2026-05-15T12:00:00.000Z'),
      redeemedAt: null,
      expiresAt: null,
      ownerInstitution: {
        name: 'Test Institution',
        deletedAt: null,
        isActive: true,
      },
      ownerUser: { name: 'Test User' },
      ...overrides,
    }) as Voucher;

  beforeEach(async () => {
    mockQb = {
      withDeleted: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
      getManyAndCount: jest.fn(),
      getRawMany: jest.fn(),
      getRawOne: jest.fn(),
      offset: jest.fn().mockReturnThis(),
    };

    // Each clone() returns a fresh copy of mockQb (same ref is fine for unit test)
    mockQb.clone.mockReturnValue(mockQb);

    voucherRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    };

    accessService = {
      applyScopeFilter: jest.fn().mockReturnValue(true),
    };

    const module = await Test.createTestingModule({
      providers: [
        VoucherBatchQueryService,
        { provide: getRepositoryToken(Voucher), useValue: voucherRepository },
        { provide: VoucherAccessService, useValue: accessService },
      ],
    }).compile();

    service = module.get(VoucherBatchQueryService);
  });

  describe('findBatchDetail()', () => {
    it('should apply default pagination params (page=1, limit=20) when none provided', async () => {
      const metaVoucher = buildMockVoucher();
      mockQb.getOne.mockResolvedValueOnce(metaVoucher);
      mockQb.getManyAndCount.mockResolvedValueOnce([[metaVoucher], 1]);
      mockQb.getRawMany.mockResolvedValueOnce([
        { status: VoucherStatus.AVAILABLE, cnt: '1' },
      ]);

      const result = await service.findBatchDetail(batchId, {
        role: 'ADMIN',
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.count).toBe(1);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should use custom page and limit when provided', async () => {
      const metaVoucher = buildMockVoucher();
      mockQb.getOne.mockResolvedValueOnce(metaVoucher);
      const vouchers = Array.from({ length: 10 }, (_, i) =>
        buildMockVoucher({
          id: `v-${i}`,
          code: `CODE${String(i).padStart(2, '0')}`,
        }),
      );
      mockQb.getManyAndCount.mockResolvedValueOnce([vouchers, 50]);
      mockQb.getRawMany.mockResolvedValueOnce([
        { status: VoucherStatus.AVAILABLE, cnt: '30' },
        { status: VoucherStatus.USED, cnt: '15' },
        { status: VoucherStatus.EXPIRED, cnt: '5' },
      ]);

      const result = await service.findBatchDetail(
        batchId,
        { role: 'ADMIN' },
        2,
        10,
      );

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.count).toBe(50);
      expect(result.data).toHaveLength(10);
    });

    it('should clamp limit to maximum of 100', async () => {
      const metaVoucher = buildMockVoucher();
      mockQb.getOne.mockResolvedValueOnce(metaVoucher);
      mockQb.getManyAndCount.mockResolvedValueOnce([[], 0]);
      mockQb.getRawMany.mockResolvedValueOnce([]);

      const result = await service.findBatchDetail(
        batchId,
        { role: 'ADMIN' },
        1,
        200,
      );

      expect(result.limit).toBe(100);
    });

    it('should return empty data array with correct count for page beyond available data', async () => {
      const metaVoucher = buildMockVoucher();
      mockQb.getOne.mockResolvedValueOnce(metaVoucher);
      mockQb.getManyAndCount.mockResolvedValueOnce([[], 5]);
      mockQb.getRawMany.mockResolvedValueOnce([
        { status: VoucherStatus.AVAILABLE, cnt: '5' },
      ]);

      const result = await service.findBatchDetail(
        batchId,
        { role: 'ADMIN' },
        2,
        10,
      );

      expect(result.data).toEqual([]);
      expect(result.count).toBe(5);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should throw NotFoundException when batch has no vouchers', async () => {
      mockQb.getOne.mockResolvedValueOnce(null);

      await expect(
        service.findBatchDetail(batchId, { role: 'ADMIN' }),
      ).rejects.toThrow('Lote no encontrado');
    });

    it('should throw NotFoundException when scope denies access', async () => {
      accessService.applyScopeFilter.mockReturnValueOnce(false);

      await expect(
        service.findBatchDetail(batchId, { role: 'RESTRICTED' }),
      ).rejects.toThrow('Lote no encontrado');
    });
  });
});

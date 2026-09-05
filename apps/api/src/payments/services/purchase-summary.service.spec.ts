import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Institution } from '../../institutions/entities/institution.entity';
import { VoucherBatch } from '../../vouchers/entities/voucher-batch.entity';
import { PurchaseSummaryService } from './purchase-summary.service';

const now = new Date('2026-02-01T00:00:00.000Z');
const id = '11111111-1111-4111-8111-111111111111';
type QueryBuilderResult = {
  value: { andWhere: { mock: { calls: Array<[string, ...unknown[]]> } } };
};

describe('PurchaseSummaryService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves with only its two repository providers', async () => {
    const module = await Test.createTestingModule({
      providers: [
        PurchaseSummaryService,
        { provide: getRepositoryToken(VoucherBatch), useValue: {} },
        { provide: getRepositoryToken(Institution), useValue: {} },
      ],
    }).compile();

    expect(module.get(PurchaseSummaryService)).toBeInstanceOf(
      PurchaseSummaryService,
    );
  });

  it('rejects an unavailable institution before creating aggregate queries', async () => {
    const createQueryBuilder = jest.fn(() => {
      throw new Error('aggregate query should not run');
    });
    const service = new PurchaseSummaryService(
      { createQueryBuilder } as never,
      { findOne: jest.fn().mockResolvedValue(null) } as never,
    );

    await expect(
      service.get(
        { periodDays: 7 },
        { scope: 'INSTITUTION', institutionId: id },
      ),
    ).rejects.toThrow('Institution scope unavailable');
    expect(createQueryBuilder).not.toHaveBeenCalled();
  });

  it('uses one clock snapshot, half-open windows, and scopes every batch query', async () => {
    const builders = Array.from({ length: 5 }, () => ({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue(null),
    }));
    const batchRepository = {
      createQueryBuilder: jest.fn().mockImplementation(() => builders.shift()),
    };
    const institutionRepository = {
      findOne: jest.fn().mockResolvedValue({ name: 'Institution' }),
    };
    const service = new PurchaseSummaryService(
      batchRepository as never,
      institutionRepository as never,
    );
    await service.get(
      { periodDays: 7 },
      { scope: 'INSTITUTION', institutionId: id },
    );
    for (const builder of builders)
      expect(builder.andWhere).toHaveBeenCalledWith(
        'batch.ownerInstitutionId = :institutionId',
        { institutionId: id },
      );
    const all = batchRepository.createQueryBuilder.mock.results.map(
      (result) => result.value as { andWhere: jest.Mock },
    );
    for (const builder of all)
      expect(builder.andWhere).toHaveBeenCalledWith(
        'batch.ownerInstitutionId = :institutionId',
        { institutionId: id },
      );
    for (const builder of all.slice(0, 2))
      expect(builder.andWhere).toHaveBeenCalledWith(
        'batch.fulfilledAt >= :from AND batch.fulfilledAt < :to',
        expect.any(Object),
      );
  });

  it('uses approved-event and voucher-completeness predicates and keeps institution alerts buyer-only', async () => {
    const makeRepository = (count: number) => {
      const builders = Array.from({ length: count }, () => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue(null),
      }));
      return {
        builders,
        repository: {
          createQueryBuilder: jest
            .fn()
            .mockImplementation(() => builders.shift()),
        },
      };
    };
    const platform = makeRepository(7);
    await new PurchaseSummaryService(
      platform.repository as never,
      {} as never,
    ).get({ periodDays: 7 }, { scope: 'PLATFORM' });
    const platformConditions = (
      platform.repository.createQueryBuilder.mock
        .results as unknown as QueryBuilderResult[]
    ).flatMap((result) => result.value.andWhere.mock.calls.map(([sql]) => sql));
    expect(platformConditions).toContainEqual(
      expect.stringContaining("payment.status = 'APPROVED'"),
    );
    expect(platformConditions).toContainEqual(
      expect.stringContaining('voucher.batch_id = batch.id'),
    );
    expect(platformConditions).toContainEqual(
      expect.stringContaining("'BUYER', 'PLATFORM_ADMIN'"),
    );

    const institution = makeRepository(5);
    await new PurchaseSummaryService(
      institution.repository as never,
      { findOne: jest.fn().mockResolvedValue({ name: 'A.kit' }) } as never,
    ).get({ periodDays: 7 }, { scope: 'INSTITUTION', institutionId: id });
    const institutionConditions = (
      institution.repository.createQueryBuilder.mock
        .results as unknown as QueryBuilderResult[]
    ).flatMap((result) => result.value.andWhere.mock.calls.map(([sql]) => sql));
    expect(institutionConditions).toContainEqual(
      expect.stringContaining("IN ('BUYER')"),
    );
    expect(institutionConditions).not.toContainEqual(
      expect.stringContaining('PLATFORM_ADMIN'),
    );
  });

  it('maps grouped currency metrics, global distinct institutions, alerts, and latest without identifiers', async () => {
    const results = [
      {
        many: [
          {
            currency: 'USD',
            accreditedPurchaseCount: '2',
            accreditedVoucherCount: '4',
            amount: '10.50',
          },
        ],
      },
      { one: { count: '2' } },
      { many: [] },
      { one: { count: '0' } },
      { one: { count: '3' } },
      { one: { count: '4' } },
      {
        one: {
          institutionName: 'A.kit',
          fulfilledAt: new Date('2026-01-31T00:00:00.000Z'),
          quantity: '2',
          currency: 'USD',
          amount: '10.50',
        },
      },
    ];
    const repository = {
      createQueryBuilder: jest.fn().mockImplementation(() => {
        const result = results.shift()!;
        return {
          innerJoin: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          addGroupBy: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          addOrderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue(result.many ?? []),
          getRawOne: jest.fn().mockResolvedValue(result.one ?? null),
        };
      }),
    };
    const service = new PurchaseSummaryService(
      repository as never,
      {} as never,
    );
    const summary = await service.get({ periodDays: 7 }, { scope: 'PLATFORM' });
    expect(summary).toMatchObject({
      scope: 'PLATFORM',
      current: {
        purchasingInstitutionCount: 2,
        accreditedAmountByCurrency: [{ currency: 'USD', amount: '10.50' }],
      },
      alerts: { paidButNotFulfilledCount: 3, notificationAttentionCount: 4 },
      latestAccreditation: { institutionName: 'A.kit' },
    });
    expect(JSON.stringify(summary)).not.toMatch(
      /voucherBatchId|institutionId|paymentEventId|buyer|gateway/i,
    );
  });
});

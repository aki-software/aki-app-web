import { AdminDashboardFormatterService } from './admin-dashboard-formatter.service.js';
import { SessionPaymentStatus } from '../entities/session.entity.js';
import type {
  AdminActivityItem,
  CategoryResponse,
  RawRecentSessionRow,
  RawTopCategoryRow,
} from '@akit/contracts';

describe('AdminDashboardFormatterService', () => {
  const service = new AdminDashboardFormatterService();

  it('builds overview payload with computed metrics', () => {
    const now = new Date('2024-02-01T12:00:00Z');
    const periodStart = service.getPeriodStart(7, now);

    const payload = service.buildOverviewPayload({
      periodDays: 7,
      now,
      periodStart,
      voucherTotals: { available: '2', redeemed: '3', historical: '10' },
      periodVoucherStats: { issued: '4', redeemed: '2' },
      expiringSoonCount: 1,
      stalledSessionsCount: 2,
      sessionTotals: {
        totalSessions: '10',
        totalTimeMs: '600000',
        completedSessions: '7',
      },
      periodSessionStats: {
        started: '5',
        completed: '4',
        reportsUnlocked: '3',
        voucherStarted: '2',
        voucherCompleted: '1',
        voucherReportsUnlocked: '1',
        individualCompleted: '3',
      },
      dailyActivityRows: [{ day: '2024-01-31', count: '2' }],
      resultsDistribution: [{ categoryId: 'A', name: 'Alpha', count: 4 }],
      activity: [
        {
          id: 'session-1',
          type: 'SESSION_STARTED',
          title: 'Sesión iniciada',
          description: 'Test',
          occurredAt: '2024-01-31T00:00:00Z',
        },
      ],
    });

    expect(payload.totalSessions).toBe(10);
    expect(payload.completionRate).toBe(70);
    expect(payload.averageTimeSeconds).toBe(60);
    expect(payload.vouchersGeneratedPeriod).toBe(4);
    expect(payload.voucherRedemptionRatePeriod).toBe(50);
    expect(payload.channelBreakdown.voucher.started).toBe(2);
    expect(payload.channelBreakdown.individual.started).toBe(3);
    expect(payload.channelBreakdown.individual.completed).toBe(3);
    expect(payload.sessionsActivity).toHaveLength(7);
  });

  it('formats session activity rows', () => {
    const rows: RawRecentSessionRow[] = [
      {
        id: '1',
        patientName: 'Ana',
        createdAt: '2024-01-01T10:00:00Z',
        sessionDate: '2024-01-01T09:00:00Z',
        reportUnlockedAt: null,
        paidAt: null,
        voucherId: null,
        paymentStatus: null,
        resultsCount: '0',
      },
      {
        id: '2',
        patientName: null,
        createdAt: '2024-01-02T10:00:00Z',
        sessionDate: '2024-01-02T09:00:00Z',
        reportUnlockedAt: '2024-01-02T11:00:00Z',
        paidAt: null,
        voucherId: 'voucher-1',
        paymentStatus: SessionPaymentStatus.VOUCHER_REDEEMED,
        resultsCount: '1',
      },
    ];

    const activity = service.formatSessionActivity(rows);

    expect(activity).toHaveLength(2);
    expect(activity[0].type).toBe('SESSION_STARTED');
    expect(activity[1].type).toBe('SESSION_COMPLETED');
    expect(activity[1].description).toContain('con voucher');
    expect(activity[1].occurredAt).toBe('2024-01-02T11:00:00.000Z');
  });

  it('merges activity in descending order', () => {
    const sessionActivity: AdminActivityItem[] = [
      {
        id: 'session-1',
        type: 'SESSION_STARTED',
        title: 'Sesión iniciada',
        description: 'Test',
        occurredAt: '2024-01-01T00:00:00Z',
      },
    ];
    const voucherActivity: AdminActivityItem[] = [
      {
        id: 'voucher-1',
        type: 'VOUCHER_ISSUED',
        title: 'Voucher emitido',
        description: 'Voucher',
        occurredAt: '2024-01-02T00:00:00Z',
      },
    ];

    const merged = service.mergeActivity(sessionActivity, voucherActivity, 1);

    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('voucher-1');
  });

  it('formats results distribution with empty buckets', () => {
    const categories: CategoryResponse[] = [
      { categoryId: 'A', title: 'Alpha', description: '' },
      { categoryId: 'B', title: 'Beta', description: '' },
    ];
    const rows: RawTopCategoryRow[] = [{ categoryId: 'A', count: '2' }];

    const distribution = service.formatResultsDistribution(categories, rows);

    expect(distribution).toEqual([
      { categoryId: 'A', name: 'Alpha', count: 2 },
      { categoryId: 'B', name: 'Beta', count: 0 },
    ]);
  });
});

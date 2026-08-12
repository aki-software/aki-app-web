import { Report, ReportEntitlementSource, ReportStatus } from './report.entity';

describe('Report', () => {
  it('defers retention until a pending report becomes available', () => {
    const generatedAt = new Date('2026-08-11T00:00:00.000Z');
    const report = Report.createPending({
      sessionId: 'session-1',
      entitlementSource: ReportEntitlementSource.VOUCHER,
      entitledUserId: 'patient-1',
      voucherId: 'voucher-1',
      generatedAt,
    });

    expect(report).toMatchObject({
      sessionId: 'session-1',
      entitlementSource: ReportEntitlementSource.VOUCHER,
      entitledUserId: 'patient-1',
      status: ReportStatus.PENDING,
      version: 1,
      availableUntil: null,
    });
  });

  it.each([
    [ReportEntitlementSource.VOUCHER, null],
    [ReportEntitlementSource.GOOGLE_PLAY, 'voucher-1'],
  ])(
    'rejects invalid %s voucher provenance',
    (entitlementSource, voucherId) => {
      expect(() =>
        Report.createPending({
          sessionId: 'session-provenance',
          entitlementSource,
          entitledUserId: 'patient-provenance',
          generatedAt: new Date(),
          voucherId,
        }),
      ).toThrow('voucher provenance');
    },
  );

  it('accepts voucher provenance only with a voucher ID', () => {
    expect(() =>
      Report.createPending({
        sessionId: 'session-voucher',
        entitlementSource: ReportEntitlementSource.VOUCHER,
        entitledUserId: 'patient-voucher',
        generatedAt: new Date(),
        voucherId: 'voucher-1',
      }),
    ).not.toThrow();
  });

  it('records immutable object metadata when generation succeeds', () => {
    const report = Report.createPending({
      sessionId: 'session-2',
      entitlementSource: ReportEntitlementSource.GOOGLE_PLAY,
      entitledUserId: 'patient-2',
      generatedAt: new Date('2026-08-11T00:00:00.000Z'),
    });

    report.markAvailable({
      objectKey: 'reports/session-2/v1.pdf',
      contentHash: 'sha256:abc',
      generatedAt: new Date('2026-08-12T00:00:00.000Z'),
    });

    expect(report).toMatchObject({
      status: ReportStatus.AVAILABLE,
      objectKey: 'reports/session-2/v1.pdf',
      contentHash: 'sha256:abc',
      generatedAt: new Date('2026-08-12T00:00:00.000Z'),
      availableUntil: new Date('2027-08-12T00:00:00.000Z'),
    });
  });

  it('clamps leap-day availability to the last day of the twelfth month', () => {
    const report = Report.createPending({
      sessionId: 'session-3',
      entitlementSource: ReportEntitlementSource.GOOGLE_PLAY,
      entitledUserId: 'patient-3',
      generatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    report.markAvailable({
      objectKey: 'reports/session-3/v1.pdf',
      contentHash: 'sha256:def',
      generatedAt: new Date('2028-02-29T10:00:00.000Z'),
    });

    expect(report.availableUntil).toEqual(new Date('2029-02-28T10:00:00.000Z'));
  });

  it('does not overwrite metadata when an available report is processed again', () => {
    const report = Report.createPending({
      sessionId: 'session-4',
      entitlementSource: ReportEntitlementSource.VOUCHER,
      entitledUserId: 'patient-4',
      voucherId: 'voucher-4',
      generatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    report.markAvailable({
      objectKey: 'reports/session-4/v1.pdf',
      contentHash: 'sha256:first',
      generatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    report.markAvailable({
      objectKey: 'reports/session-4/v2.pdf',
      contentHash: 'sha256:second',
      generatedAt: new Date('2026-01-03T00:00:00.000Z'),
    });
    expect(report.objectKey).toBe('reports/session-4/v1.pdf');
  });

  it.each([
    [ReportStatus.PENDING, ReportStatus.GENERATING],
    [ReportStatus.GENERATING, ReportStatus.FAILED],
    [ReportStatus.FAILED, ReportStatus.PENDING],
  ])('transitions %s through its guarded lifecycle', (from, expected) => {
    const report = Report.createPending({
      sessionId: 'session-transition',
      entitlementSource: ReportEntitlementSource.VOUCHER,
      entitledUserId: 'patient-transition',
      voucherId: 'voucher-transition',
      generatedAt: new Date(),
    });
    report.status = from;
    if (expected === ReportStatus.GENERATING) report.markGenerating();
    if (expected === ReportStatus.FAILED) report.markFailed();
    if (expected === ReportStatus.PENDING) report.retry();
    expect(report.status).toBe(expected);
  });

  it.each([ReportStatus.FAILED, ReportStatus.EXPIRED])(
    'does not reopen immutable metadata when status becomes %s',
    (status) => {
      const report = Report.createPending({
        sessionId: 'session-5',
        entitlementSource: ReportEntitlementSource.VOUCHER,
        entitledUserId: 'patient-5',
        voucherId: 'voucher-5',
        generatedAt: new Date(),
      });
      report.markAvailable({
        objectKey: 'reports/session-5/v1.pdf',
        contentHash: 'sha256:first',
        generatedAt: new Date('2026-01-02T00:00:00.000Z'),
      });
      report.status = status;

      expect(() =>
        report.markAvailable({
          objectKey: 'reports/session-5/v2.pdf',
          contentHash: 'sha256:second',
          generatedAt: new Date(),
        }),
      ).toThrow('Report metadata is immutable once available.');
    },
  );
});

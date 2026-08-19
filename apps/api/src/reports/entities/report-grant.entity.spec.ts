import { createHash } from 'node:crypto';
import { ReportGrant } from './report-grant.entity';

describe('ReportGrant', () => {
  it('stores only a hash for a single-use access token', () => {
    const grant = ReportGrant.create({
      reportId: 'report-1',
      token: 'plain-text-token',
      expiresAt: new Date('2026-08-11T00:15:00.000Z'),
      scope: 'PATIENT',
    });

    expect(grant).toMatchObject({
      reportId: 'report-1',
      tokenHash: createHash('sha256').update('plain-text-token').digest('hex'),
      scope: 'PATIENT',
      usedAt: null,
    });
    expect(grant.tokenHash).not.toBe('plain-text-token');
  });

  it('allows a valid grant to be consumed only once', () => {
    const grant = ReportGrant.create({
      reportId: 'report-1',
      token: 'plain-text-token',
      expiresAt: new Date('2026-08-11T00:15:00.000Z'),
      scope: 'PATIENT',
    });

    expect(grant.consume(new Date('2026-08-11T00:10:00.000Z'))).toBe(true);
    expect(grant.usedAt).toEqual(new Date('2026-08-11T00:10:00.000Z'));
    expect(grant.consume(new Date('2026-08-11T00:11:00.000Z'))).toBe(false);
  });
});

import { ReportConsentPolicyService } from './report-consent-policy.service';

describe('ReportConsentPolicyService', () => {
  it('permits a private therapist to access their own session without an institution', async () => {
    const data = { query: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const service = new ReportConsentPolicyService(data as any);

    await expect(
      service.permits({ role: 'THERAPIST', userId: 'therapist-1' }, 'report-1'),
    ).resolves.toBe(true);
    expect(data.query).toHaveBeenCalledWith(
      expect.stringContaining('session."therapist_user_id" = $2'),
      ['report-1', 'therapist-1', null],
    );
  });

  it('denies an institution admin when the report session belongs to another institution', async () => {
    const data = { query: jest.fn().mockResolvedValue([]) };
    const service = new ReportConsentPolicyService(data as any);

    await expect(
      service.permits(
        { role: 'INSTITUTION_ADMIN', institutionId: 'institution-1' },
        'report-1',
      ),
    ).resolves.toBe(false);
    expect(data.query).toHaveBeenCalledWith(
      expect.stringContaining('session."institution_id" = $2'),
      ['report-1', 'institution-1'],
    );
  });

  it('denies institution admins without an institution identity before querying', async () => {
    const data = { query: jest.fn() };
    const service = new ReportConsentPolicyService(data as any);

    await expect(
      service.permits({ role: 'INSTITUTION_ADMIN' }, 'report-1'),
    ).resolves.toBe(false);
    expect(data.query).not.toHaveBeenCalled();
  });
});

import { ReportAccessService } from './report-access.service';
import { ReportStatus } from './entities/report.entity';

describe('ReportAccessService scope persistence', () => {
  it('normalizes INSTITUTION_ADMIN to INSTITUTION for grants and audits', async () => {
    const report = {
      id: 'report-1',
      status: ReportStatus.AVAILABLE,
      version: 1,
      availableUntil: new Date('2027-01-01'),
    } as any;
    const manager = {
      query: jest.fn().mockResolvedValue([{ id: 'grant-1' }]),
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(report),
      }),
    } as any;
    const audit = { append: jest.fn().mockResolvedValue({}) };
    const service = new ReportAccessService(
      { transaction: jest.fn((fn) => fn(manager)) } as any,
      audit as any,
      { permits: jest.fn().mockResolvedValue(true) } as any,
    );

    await service.issue(
      'report-1',
      {
        role: 'INSTITUTION_ADMIN',
        userId: 'admin-1',
        institutionId: 'institution-1',
      },
      'issue-1',
    );

    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO "report_grants"'),
      expect.arrayContaining(['INSTITUTION']),
    );
    expect(audit.append).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ scope: 'INSTITUTION' }),
    );
  });
});

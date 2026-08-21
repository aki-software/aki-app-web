import { ReportAccessService } from './report-access.service';
import { ReportStatus } from './entities/report.entity';
import { ReportsController } from './reports.controller';

describe('session report download', () => {
  const report = {
    id: 'report-2',
    sessionId: 'session-1',
    version: 2,
    status: ReportStatus.AVAILABLE,
    entitledPatientId: 'patient-1',
    availableUntil: new Date('2027-01-01'),
    objectKey: 'private/reports/report-2.pdf',
  } as any;

  const accessService = (consentAllowed = true) => {
    const repository = {
      findOne: jest.fn().mockResolvedValue(report),
      update: jest.fn(),
    };
    const manager = {
      query: jest.fn().mockResolvedValue([{ id: 'patient-1' }]),
      getRepository: jest.fn().mockReturnValue(repository),
    };
    const data = { transaction: jest.fn((callback) => callback(manager)) };
    const audit = { append: jest.fn().mockResolvedValue({}) };
    const consent = { permits: jest.fn().mockResolvedValue(consentAllowed) };
    return {
      service: new ReportAccessService(
        data as any,
        audit as any,
        consent as any,
      ),
      repository,
      consent,
    };
  };

  it('selects the highest report version for the session before authorizing it', async () => {
    const { service, repository } = accessService();

    await expect(
      service.downloadForSession('session-1', {
        role: 'PATIENT',
        userId: 'firebase-patient-1',
      }),
    ).resolves.toEqual(report);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { sessionId: 'session-1' },
      order: { version: 'DESC' },
    });
  });

  it.each(['THERAPIST', 'INSTITUTION_ADMIN'])(
    'delegates %s institution authorization to the consent policy',
    async (role) => {
      const { service, consent } = accessService();
      const scope = { role, institutionId: 'institution-1' };

      await expect(
        service.downloadForSession('session-1', scope),
      ).resolves.toEqual(report);
      expect(consent.permits).toHaveBeenCalledWith(scope, report.id);
    },
  );

  it.each([
    [ReportStatus.PENDING, 'pending'],
    [ReportStatus.GENERATING, 'being generated'],
    [ReportStatus.STORAGE_PENDING, 'storage'],
    [ReportStatus.EXPIRED, 'expired'],
    [ReportStatus.FAILED, 'failed'],
  ])('reports %s as unavailable', async (status, message) => {
    const { service, repository } = accessService();
    repository.findOne.mockResolvedValue({ ...report, status });

    await expect(
      service.downloadForSession('session-1', {
        role: 'PATIENT',
        userId: 'firebase-patient-1',
      }),
    ).rejects.toThrow(message);
  });

  it('streams the resolved private object through the session route', async () => {
    const access = {
      downloadForSession: jest.fn().mockResolvedValue(report),
      recordDownload: jest.fn(),
    };
    const storage = { get: jest.fn().mockResolvedValue(Buffer.from('pdf')) };
    const response = {
      set: jest.fn(),
      removeHeader: jest.fn(),
      attachment: jest.fn(),
      status: jest.fn().mockReturnThis(),
      end: jest.fn(),
    };
    const controller = new ReportsController(
      access as any,
      storage as any,
      {} as any,
    );

    await expect(
      controller.downloadForSession(
        'session-1',
        {
          user: { role: 'INSTITUTION_ADMIN', institutionId: 'institution-1' },
        } as any,
        response as any,
      ),
    ).resolves.toBeUndefined();
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.end).toHaveBeenCalledWith(Buffer.from('pdf'));
    expect(access.downloadForSession).toHaveBeenCalledWith('session-1', {
      role: 'INSTITUTION_ADMIN',
      userId: undefined,
      institutionId: 'institution-1',
    });
    expect(storage.get).toHaveBeenCalledWith(report.objectKey);
  });
});

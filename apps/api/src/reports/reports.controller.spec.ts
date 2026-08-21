import { validate } from 'class-validator';
import { ReportsController } from './reports.controller';
import { RequestReportDeliveryDto } from './dto/request-report-delivery.dto';

describe('ReportsController', () => {
  const access = {
    status: jest
      .fn()
      .mockResolvedValue({ id: 'report-1', status: 'AVAILABLE', version: 1 }),
    download: jest.fn(),
    downloadForSession: jest.fn(),
    recordDownload: jest.fn(),
    issue: jest.fn(),
    renew: jest.fn(),
    consume: jest.fn(),
    authorizeDelivery: jest.fn(),
  };
  const storage = { get: jest.fn() };
  const reports = { enqueueDelivery: jest.fn() };
  const controller = new ReportsController(
    access as any,
    storage as any,
    reports as any,
  );
  const req = (role = 'PATIENT', userId = 'patient-1') =>
    ({ user: { role, userId } }) as any;
  const response = () => {
    const result = {
      set: jest.fn(),
      removeHeader: jest.fn(),
      type: jest.fn(),
      attachment: jest.fn(),
      status: jest.fn(),
      end: jest.fn(),
    };
    result.status.mockReturnValue(result);
    return result as any;
  };

  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['status', () => controller.status('report-1', req())],
    [
      'issue',
      () => controller.issue('report-1', { operationKey: 'issue-1' }, req()),
    ],
    [
      'renew',
      () => controller.renew('report-1', { operationKey: 'renew-1' }, req()),
    ],
  ])('derives request scope for %s', async (_name, invoke) => {
    await invoke();
    expect(
      Object.values(access).some((method: any) =>
        method.mock.calls.some((call: any[]) =>
          call.some((value) => value?.userId === 'patient-1'),
        ),
      ),
    ).toBe(true);
  });

  it('consumes a token without returning it or storage internals', async () => {
    access.consume.mockResolvedValue(undefined);
    await expect(
      controller.consume(
        { token: 'plain-token', operationKey: 'consume-1' },
        req(),
      ),
    ).resolves.toEqual({ consumed: true });
    expect(JSON.stringify(access.consume.mock.calls)).not.toContain(
      'objectKey',
    );
  });

  it('resolves the current report by session before streaming the authorized private PDF', async () => {
    const report = {
      id: 'report-2',
      objectKey: 'private/reports/report-2.pdf',
    };
    access.downloadForSession.mockResolvedValue(report);
    storage.get.mockResolvedValue(Buffer.from('pdf'));
    const res = response();

    await controller.downloadForSession(
      'session-1',
      req('INSTITUTION_ADMIN'),
      res,
    );

    expect(access.downloadForSession).toHaveBeenCalledWith('session-1', {
      role: 'INSTITUTION_ADMIN',
      userId: 'patient-1',
      institutionId: undefined,
    });
    expect(access.download).not.toHaveBeenCalled();
    expect(storage.get).toHaveBeenCalledWith('private/reports/report-2.pdf');
    expect(res.set).toHaveBeenCalledWith({
      'Cache-Control':
        'private, no-cache, no-store, max-age=0, must-revalidate',
      Pragma: 'no-cache',
      'Content-Type': 'application/pdf',
    });
    expect(res.removeHeader).toHaveBeenCalledWith('ETag');
    expect(res.attachment).toHaveBeenCalledWith('report-session-1.pdf');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalledWith(Buffer.from('pdf'));
  });

  it('streams an authorized private PDF with attachment headers', async () => {
    const report = {
      id: 'report-1',
      objectKey: 'private/reports/report-1.pdf',
    };
    access.download.mockResolvedValue(report);
    storage.get.mockResolvedValue(Buffer.from('pdf'));
    const res = response();

    await controller.download('report-1', req(), res);

    expect(storage.get).toHaveBeenCalledWith('private/reports/report-1.pdf');
    expect(access.recordDownload).toHaveBeenCalledWith(report, {
      role: 'PATIENT',
      userId: 'patient-1',
      institutionId: undefined,
    });
    expect(res.set).toHaveBeenCalledWith({
      'Cache-Control':
        'private, no-cache, no-store, max-age=0, must-revalidate',
      Pragma: 'no-cache',
      'Content-Type': 'application/pdf',
    });
    expect(res.removeHeader).toHaveBeenCalledWith('ETag');
    expect(res.attachment).toHaveBeenCalledWith('report-report-1.pdf');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalledWith(Buffer.from('pdf'));
  });

  it('rejects an invalid alternate recipient email', async () => {
    const dto = Object.assign(new RequestReportDeliveryDto(), {
      recipientEmail: 'not-an-email',
      operationKey: 'delivery-1',
    });
    await expect(validate(dto)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'recipientEmail' }),
      ]),
    );
  });

  it.each(['PATIENT', 'ADMIN'])(
    'authorizes %s to queue an alternate recipient without exposing storage',
    async (role) => {
      access.authorizeDelivery.mockResolvedValue({ id: 'report-1' });
      reports.enqueueDelivery.mockResolvedValue({
        queued: true,
        idempotent: false,
      });

      await expect(
        (controller as any).requestDelivery(
          'report-1',
          { recipientEmail: 'ada@example.com', operationKey: 'delivery-1' },
          req(role),
        ),
      ).resolves.toEqual({ queued: true, idempotent: false });
      expect(access.authorizeDelivery).toHaveBeenCalledWith(
        'report-1',
        expect.objectContaining({ role }),
        'ada@example.com',
        'delivery-1',
      );
      expect(reports.enqueueDelivery).toHaveBeenCalledWith(
        'report-1',
        'ada@example.com',
      );
      expect(storage.get).not.toHaveBeenCalled();
    },
  );

  it('does not fetch storage when access is denied', async () => {
    access.download.mockRejectedValue(
      new Error('Report access is not permitted.'),
    );

    await expect(
      controller.download('report-1', req(), response()),
    ).rejects.toThrow('not permitted');
    expect(storage.get).not.toHaveBeenCalled();
    expect(access.recordDownload).not.toHaveBeenCalled();
  });

  it('does not record a download when the private object is missing', async () => {
    access.download.mockResolvedValue({
      id: 'report-1',
      objectKey: 'private/reports/report-1.pdf',
    });
    storage.get.mockResolvedValue(null);

    await expect(
      controller.download('report-1', req(), response()),
    ).rejects.toThrow('Report file not found.');
    expect(access.recordDownload).not.toHaveBeenCalled();
  });
});

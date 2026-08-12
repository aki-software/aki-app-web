import { ReportsController } from './reports.controller';

describe('ReportsController', () => {
  const access = {
    status: jest.fn().mockResolvedValue({ id: 'report-1', status: 'AVAILABLE', version: 1 }),
    issue: jest.fn(),
    renew: jest.fn(),
    consume: jest.fn(),
  };
  const controller = new ReportsController(access as any);
  const req = (role = 'PATIENT', userId = 'patient-1') =>
    ({ user: { role, userId } }) as any;

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
});

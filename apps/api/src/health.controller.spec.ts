import { PATH_METADATA } from '@nestjs/common/constants';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  const dataSource = { query: jest.fn() };
  let controller: HealthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new HealthController(dataSource as never);
  });

  it('keeps liveness independent from PostgreSQL', () => {
    const result = controller.checkHealth();

    expect(result.status).toBe('ok');
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('keeps the existing liveness and readiness aliases', () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        HealthController.prototype.checkHealth,
      ),
    ).toEqual(['health', 'api/v1/health']);
    expect(
      Reflect.getMetadata(PATH_METADATA, HealthController.prototype.checkReady),
    ).toEqual(['health/ready', 'api/v1/health/ready']);
  });

  it('checks readiness with one lightweight query', async () => {
    dataSource.query.mockResolvedValue([{ '?column?': 1 }]);

    await expect(controller.checkReady()).resolves.toMatchObject({
      status: 'ready',
    });
    expect(dataSource.query).toHaveBeenCalledTimes(1);
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('fails readiness with HTTP 503 when PostgreSQL is unavailable', async () => {
    dataSource.query.mockRejectedValue(new Error('database unavailable'));

    await expect(controller.checkReady()).rejects.toMatchObject({
      status: 503,
    });
  });
});

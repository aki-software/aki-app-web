import { PATH_METADATA } from '@nestjs/common/constants';
import { DataSource } from 'typeorm';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HealthController } from './health.controller.js';
import { configureApiGlobalPrefix } from './config/api-routing.js';

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

  it('serves readiness at both documented paths without a duplicated prefix', async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DataSource,
          useValue: { query: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();
    const app = module.createNestApplication();
    configureApiGlobalPrefix(app);
    await app.init();

    try {
      expect(
        (await request(app.getHttpServer()).get('/health/ready')).status,
      ).toBe(200);
      expect(
        (await request(app.getHttpServer()).get('/api/v1/health/ready')).status,
      ).toBe(200);
      expect(
        (await request(app.getHttpServer()).get('/api/v1/api/v1/health/ready'))
          .status,
      ).toBe(404);
      expect((await request(app.getHttpServer()).get('/health')).status).toBe(
        200,
      );
      expect(
        (await request(app.getHttpServer()).get('/api/v1/health')).status,
      ).toBe(200);
      expect(
        (await request(app.getHttpServer()).get('/api/v1/api/v1/health'))
          .status,
      ).toBe(404);
      expect((await request(app.getHttpServer()).get('/')).status).toBe(200);
    } finally {
      await app.close();
    }
  });
});

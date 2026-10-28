import { OperationalMetricsService } from './operational-metrics.service.js';

describe('OperationalMetricsService', () => {
  it('samples database and enabled queues with bounded labels', async () => {
    const previous = process.env.ENABLE_BULLMQ;
    process.env.ENABLE_BULLMQ = 'true';
    const metrics = {
      setOperational: jest.fn(),
      observePostgresProbe: jest.fn(),
    };
    const database = {
      query: jest.fn().mockResolvedValue([{ connections: '2' }]),
    };
    const queue = {
      getJobCounts: jest
        .fn()
        .mockResolvedValue({ waiting: 3, active: 1, delayed: 0, failed: 2 }),
      getWaiting: jest
        .fn()
        .mockResolvedValue([{ timestamp: Date.now() - 5000 }]),
      client: Promise.resolve({ ping: jest.fn().mockResolvedValue('PONG') }),
    };
    const sampler = new OperationalMetricsService(
      metrics as never,
      database as never,
      queue as never,
      queue as never,
      queue as never,
      queue as never,
      queue as never,
    );
    await sampler.collect();
    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining('pg_stat_database'),
    );
    expect(metrics.setOperational).toHaveBeenCalledWith(
      'postgres_connections',
      2,
    );
    expect(metrics.observePostgresProbe).toHaveBeenCalledWith(
      expect.any(Number),
    );
    expect(metrics.setOperational).toHaveBeenCalledWith('redis_up', 1);
    expect(metrics.setOperational).toHaveBeenCalledWith('queue_waiting', 3, {
      queue: 'email',
    });
    expect(metrics.setOperational).toHaveBeenCalledWith(
      'queue_oldest_waiting_age_seconds',
      expect.any(Number),
      { queue: 'email' },
    );
    await sampler.collect();
    expect(database.query).toHaveBeenCalledTimes(1);
    if (previous === undefined) delete process.env.ENABLE_BULLMQ;
    else process.env.ENABLE_BULLMQ = previous;
  });

  it('does not poll Redis when BullMQ is disabled', async () => {
    const previous = process.env.ENABLE_BULLMQ;
    delete process.env.ENABLE_BULLMQ;
    const metrics = {
      setOperational: jest.fn(),
      observePostgresProbe: jest.fn(),
    };
    const database = {
      query: jest.fn().mockResolvedValue([{ connections: 1 }]),
    };
    const queue = { getJobCounts: jest.fn(), getWaiting: jest.fn() };
    const sampler = new OperationalMetricsService(
      metrics as never,
      database as never,
      queue as never,
      queue as never,
      queue as never,
      queue as never,
      queue as never,
    );
    await sampler.collect();
    expect(metrics.setOperational).toHaveBeenCalledWith('queue_enabled', 0);
    expect(queue.getJobCounts).not.toHaveBeenCalled();
    if (previous !== undefined) process.env.ENABLE_BULLMQ = previous;
  });

  it('marks failed dependency reads unhealthy instead of exposing stale counts', async () => {
    const previous = process.env.ENABLE_BULLMQ;
    process.env.ENABLE_BULLMQ = 'true';
    const metrics = {
      setOperational: jest.fn(),
      observePostgresProbe: jest.fn(),
    };
    const database = {
      query: jest.fn().mockRejectedValue(new Error('database offline')),
    };
    const queue = {
      getJobCounts: jest.fn().mockRejectedValue(new Error('queue offline')),
      getWaiting: jest.fn().mockResolvedValue([]),
      get client() {
        return Promise.reject(new Error('redis offline'));
      },
    };
    const sampler = new OperationalMetricsService(
      metrics as never,
      database as never,
      queue as never,
      queue as never,
      queue as never,
      queue as never,
      queue as never,
    );
    await sampler.collect();
    expect(metrics.setOperational).toHaveBeenCalledWith('postgres_up', 0);
    expect(metrics.setOperational).toHaveBeenCalledWith('redis_up', 0);
    expect(metrics.setOperational).toHaveBeenCalledWith('queue_up', 0, {
      queue: 'email',
    });
    expect(metrics.setOperational).toHaveBeenCalledWith('queue_waiting', 0, {
      queue: 'email',
    });
    if (previous === undefined) delete process.env.ENABLE_BULLMQ;
    else process.env.ENABLE_BULLMQ = previous;
  });
});

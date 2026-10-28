import { PinoLogger } from 'nestjs-pino';
import { RequestCorrelationContext } from '../context/request-correlation.context.js';
import { RequestLoggerMiddleware } from './request-logger.middleware.js';
import { LocalMetricsService } from '../metrics/local-metrics.service.js';

describe('RequestLoggerMiddleware', () => {
  it('logs structured method, request ID, and normalized path without sensitive values', () => {
    const info = jest.fn();
    const logger = { info, setContext: jest.fn() } as unknown as PinoLogger;
    const correlationContext = {
      getRequestId: jest.fn().mockReturnValue('request-safe-123'),
    } as unknown as RequestCorrelationContext;
    const metrics = {
      recordHttpRequest: jest.fn(),
    } as unknown as LocalMetricsService;
    const middleware = new RequestLoggerMiddleware(
      logger,
      correlationContext,
      metrics,
    );
    const finishHandlers: Array<() => void> = [];
    const request = {
      method: 'GET',
      originalUrl:
        '/api/v1/reports/123e4567-e89b-12d3-a456-426614174000?token=secret',
      headers: { 'x-request-id': 'customer-123' },
    } as never;
    const response = {
      statusCode: 503,
      on: (_event: string, handler: () => void) => finishHandlers.push(handler),
    } as never;
    const next = jest.fn();

    middleware.use(request, response, next);
    finishHandlers[0]();

    expect(info).toHaveBeenCalledTimes(2);
    const logged = JSON.stringify(info.mock.calls);
    expect(logged).toContain('http.request');
    expect(logged).toContain('GET');
    expect(logged).toContain('/api/v1/reports/:id');
    expect(logged).toContain('http.response');
    expect(logged).toContain('503');
    expect(logged).toContain('durationMs');
    expect(logged).toContain('request-safe-123');
    expect(logged).not.toContain('secret');
    expect(logged).not.toContain('customer-123');
    expect(logged).not.toContain('123e4567-e89b-12d3-a456-426614174000');
    expect(next).toHaveBeenCalledTimes(1);
    expect(metrics.recordHttpRequest).toHaveBeenCalledWith(
      request,
      503,
      expect.any(Number),
    );
  });
});

describe('RequestLoggerMiddleware metric failure', () => {
  it('keeps response logging fail-open when metric recording fails', () => {
    const info = jest.fn();
    const logger = { info, setContext: jest.fn() } as unknown as PinoLogger;
    const context = {
      getRequestId: () => 'request-safe',
    } as unknown as RequestCorrelationContext;
    const metrics = {
      recordHttpRequest: () => {
        throw new Error('registry failure');
      },
    } as unknown as LocalMetricsService;
    const middleware = new RequestLoggerMiddleware(logger, context, metrics);
    let finish: (() => void) | undefined;
    middleware.use(
      { method: 'GET', originalUrl: '/health' } as never,
      {
        statusCode: 200,
        on: (_event: string, callback: () => void) => {
          finish = callback;
        },
      } as never,
      jest.fn(),
    );
    expect(finish).toBeDefined();
    expect(() => finish?.()).not.toThrow();
    expect(info).toHaveBeenCalledTimes(2);
  });
});

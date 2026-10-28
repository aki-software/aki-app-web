import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

describe('AllExceptionsFilter', () => {
  const createHost = () => {
    const reply = jest.fn();
    const getRequestUrl = jest.fn().mockReturnValue('/api/v1/vouchers/redeem');
    const httpAdapter = { reply, getRequestUrl };
    const httpAdapterHost = { httpAdapter } as unknown as HttpAdapterHost;
    const logger = {
      setContext: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };
    const request = {};
    const response = {};
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as ArgumentsHost;

    return { reply, httpAdapterHost, host, logger };
  };

  it('preserves structured business error codes', () => {
    const { reply, httpAdapterHost, host, logger } = createHost();
    const filter = new AllExceptionsFilter(httpAdapterHost, logger as never);

    filter.catch(
      new HttpException(
        {
          code: 'SESSION_NOT_FOUND',
          message: 'Session missing',
          statusCode: 404,
        },
        HttpStatus.NOT_FOUND,
      ),
      host,
    );

    expect(reply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ code: 'SESSION_NOT_FOUND', statusCode: 404 }),
      404,
    );
  });

  it('maps unexpected errors to service unavailable without leaking internals', () => {
    const { reply, httpAdapterHost, host, logger } = createHost();
    const filter = new AllExceptionsFilter(httpAdapterHost, logger as never);

    filter.catch(new Error('provider token=secret@example.com'), host);

    expect(reply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ code: 'SERVICE_UNAVAILABLE', statusCode: 503 }),
      503,
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'http.exception', status: 503 }),
      'Request failed',
    );
    expect(logger.error.mock.calls[0][0]).toEqual(
      expect.objectContaining({ errorClass: 'Error' }),
    );
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(
      'secret@example.com',
    );
  });
});

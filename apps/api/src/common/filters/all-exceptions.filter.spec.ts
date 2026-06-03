import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

describe('AllExceptionsFilter', () => {
  const createHost = () => {
    const reply = jest.fn();
    const getRequestUrl = jest.fn().mockReturnValue('/api/v1/vouchers/redeem');
    const httpAdapter = { reply, getRequestUrl };
    const httpAdapterHost = { httpAdapter } as unknown as HttpAdapterHost;
    const request = {};
    const response = {};
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as ArgumentsHost;

    return { reply, httpAdapterHost, host };
  };

  it('preserves structured business error codes', () => {
    const { reply, httpAdapterHost, host } = createHost();
    const filter = new AllExceptionsFilter(httpAdapterHost);

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
    const { reply, httpAdapterHost, host } = createHost();
    const filter = new AllExceptionsFilter(httpAdapterHost);

    filter.catch(new Error('database exploded'), host);

    expect(reply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ code: 'SERVICE_UNAVAILABLE', statusCode: 503 }),
      503,
    );
  });
});

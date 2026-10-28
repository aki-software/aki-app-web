import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';

export const DEFAULT_ERROR_MESSAGES = {
  SERVER_ERROR: 'Servicio temporalmente no disponible',
  INTERNAL_ERROR: 'Internal server error',
};

export const DEFAULT_ERROR_CODES = {
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

interface ExceptionDetails {
  statusCode: number;
  message: string;
  code?: string;
}

function extractHttpExceptionDetails(
  exception: HttpException,
): ExceptionDetails {
  const statusCode = exception.getStatus();
  const response = exception.getResponse();

  if (typeof response === 'string') {
    return { statusCode, message: response };
  }

  if (typeof response === 'object' && response !== null) {
    const resObj = response as Record<string, unknown>;
    const rawMessage = resObj.message ?? exception.message;
    const message = Array.isArray(rawMessage) ? rawMessage[0] : rawMessage;

    return {
      statusCode,
      message: typeof message === 'string' ? message : String(message),
      code: typeof resObj.code === 'string' ? resObj.code : undefined,
    };
  }

  return { statusCode, message: exception.message };
}

function extractExceptionDetails(exception: unknown): ExceptionDetails {
  if (exception instanceof HttpException) {
    return extractHttpExceptionDetails(exception);
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message:
      exception instanceof Error
        ? exception.message
        : DEFAULT_ERROR_MESSAGES.INTERNAL_ERROR,
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const { statusCode, message, code } = extractExceptionDetails(exception);

    const isServerError = statusCode >= 500;
    const finalStatusCode = isServerError
      ? HttpStatus.SERVICE_UNAVAILABLE
      : statusCode;

    const finalCode = isServerError
      ? DEFAULT_ERROR_CODES.SERVICE_UNAVAILABLE
      : (code ?? DEFAULT_ERROR_CODES.UNKNOWN_ERROR);

    const finalMessage = isServerError
      ? DEFAULT_ERROR_MESSAGES.SERVER_ERROR
      : message;

    const responseBody = {
      code: finalCode,
      statusCode: finalStatusCode,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
      message: finalMessage,
    };

    const logFields = {
      event: 'http.exception',
      status: finalStatusCode,
      errorClass:
        exception instanceof Error
          ? exception.constructor.name
          : 'UnknownError',
    };

    if (isServerError) {
      this.logger.error(logFields, 'Request failed');
    } else {
      this.logger.warn(logFields, 'Request rejected');
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, finalStatusCode);
  }
}

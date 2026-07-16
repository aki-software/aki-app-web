import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

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
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

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

    if (isServerError) {
      this.logger.error(
        `Exception thrown at ${responseBody.path}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`Client error at ${responseBody.path}: ${message}`);
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, finalStatusCode);
  }
}

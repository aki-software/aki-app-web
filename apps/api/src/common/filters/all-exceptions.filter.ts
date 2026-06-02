import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;
    const responseObject =
      typeof exceptionResponse === 'object' && exceptionResponse
        ? (exceptionResponse as Record<string, unknown>)
        : null;
    const responseMessage =
      responseObject && 'message' in responseObject
        ? responseObject.message
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';
    const responseCode =
      responseObject && typeof responseObject.code === 'string'
        ? responseObject.code
        : undefined;

    const isServerError = httpStatus >= 500;
    const responseStatusCode = isServerError
      ? HttpStatus.SERVICE_UNAVAILABLE
      : httpStatus;
    const responseBody = {
      code: isServerError
        ? 'SERVICE_UNAVAILABLE'
        : (responseCode ?? 'UNKNOWN_ERROR'),
      statusCode: responseStatusCode,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
      message: isServerError
        ? 'Servicio temporalmente no disponible'
        : Array.isArray(responseMessage)
          ? responseMessage[0]
          : responseMessage,
    };

    this.logger.error(
      `Exception thrown at ${responseBody.path}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    httpAdapter.reply(ctx.getResponse(), responseBody, responseStatusCode);
  }
}

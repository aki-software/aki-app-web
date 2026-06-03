import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request } from 'express';
import { IdempotencyService } from '../services/idempotency.service.js';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(private readonly idempotencyService: IdempotencyService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.headers['x-idempotency-key'];

    if (!key || typeof key !== 'string' || !key.trim()) {
      return next.handle();
    }

    const trimmedKey = key.trim();

    let state = await this.idempotencyService.get(trimmedKey);

    if (state === 'processing') {
      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        state = await this.idempotencyService.get(trimmedKey);
        if (state !== 'processing') break;
      }

      if (state === 'processing') {
        throw new ConflictException(
          'A request with the same idempotency key is already being processed',
        );
      }
    }

    if (state) {
      try {
        return of(JSON.parse(state));
      } catch (err) {
        this.logger.error(
          `Failed to parse cached response for idempotency key ${trimmedKey}`,
          err,
        );
        await this.idempotencyService.delete(trimmedKey);
      }
    }

    const acquiredLock = await this.idempotencyService.tryLock(trimmedKey, 120);

    if (!acquiredLock) {
      throw new ConflictException(
        'A concurrent request with the same idempotency key is being processed',
      );
    }

    return next.handle().pipe(
      tap((response) => {
        this.idempotencyService
          .set(trimmedKey, JSON.stringify(response), 86400)
          .catch((setErr) => {
            this.logger.error(
              `Failed to cache response for key ${trimmedKey}`,
              setErr instanceof Error ? setErr.stack : String(setErr),
            );
          });
      }),
      catchError((err) => {
        this.idempotencyService.delete(trimmedKey).catch((deleteErr) => {
          this.logger.error(
            `Failed to clear key ${trimmedKey} on request error`,
            deleteErr instanceof Error ? deleteErr.stack : String(deleteErr),
          );
        });
        return throwError(() => err);
      }),
    );
  }
}

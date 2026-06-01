import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
} from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { IdempotencyService } from '../services/idempotency.service.js';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const key = request.headers['x-idempotency-key'];

    if (!key || typeof key !== 'string' || !key.trim()) {
      return next.handle();
    }

    const trimmedKey = key.trim();

    let state = await this.idempotencyService.get(trimmedKey);

    if (state === 'processing') {
      // Poll every 500ms for up to 10 seconds to handle race conditions
      // (e.g. Android's foreground UI and background SyncSessionWorker hitting the endpoint simultaneously)
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
      } catch {
        // Fallback to calling the handler if JSON parse fails
      }
    }

    // Set lock to prevent concurrent duplicates (TTL 2 minutes)
    await this.idempotencyService.set(trimmedKey, 'processing', 120);

    return next.handle().pipe(
      tap((response) => {
        // Cache successful response for 24h
        this.idempotencyService
          .set(trimmedKey, JSON.stringify(response), 86400)
          .catch((setErr) => {
            console.error(
              `[Idempotency] Failed to cache response for key ${trimmedKey}:`,
              setErr,
            );
          });
      }),
      catchError((err) => {
        // Release the lock immediately on error so the client can retry
        this.idempotencyService.delete(trimmedKey).catch((deleteErr) => {
          console.error(
            `[Idempotency] Failed to clear key ${trimmedKey} on request error:`,
            deleteErr,
          );
        });
        return throwError(() => err);
      }),
    );
  }
}

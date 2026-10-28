import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestCorrelationStore {
  requestId: string;
}

@Injectable()
export class RequestCorrelationContext {
  private readonly storage = new AsyncLocalStorage<RequestCorrelationStore>();

  run<T>(requestId: string, callback: () => T): T {
    return this.storage.run({ requestId }, callback);
  }

  getRequestId(): string | undefined {
    return this.storage.getStore()?.requestId;
  }
}

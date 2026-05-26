import { Injectable } from '@nestjs/common';

@Injectable()
export class SessionSyncKeyService {
  buildSyncKey(
    payloadId: string | null,
    userId: string | null,
    startedAt?: string,
  ): string | null {
    if (payloadId) return `id:${payloadId}`;
    if (!userId || !startedAt) return null;
    return `u:${userId}:s:${startedAt}`;
  }
}

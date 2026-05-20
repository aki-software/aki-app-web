import { Injectable } from '@nestjs/common';

@Injectable()
export class SessionSyncKeyService {
  /**
   * Builds a sync key to prevent duplicates from offline sync.
   */
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

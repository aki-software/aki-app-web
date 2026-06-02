export function buildSyncKey(
  payloadId: string | null,
  userId: string | null,
  startedAt?: string,
): string | null {
  if (payloadId) return `id:${payloadId}`;
  if (!userId || !startedAt) return null;
  return `u:${userId}:s:${startedAt}`;
}

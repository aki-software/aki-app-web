import { createHash, createHmac } from 'node:crypto';

export function createClientKeyDigest(
  clientKey: string,
  secret: string,
): string {
  if (!secret) throw new Error('PAYMENT_IDEMPOTENCY_SECRET is required');
  return createHmac('sha256', secret).update(clientKey, 'utf8').digest('hex');
}

export function createProviderIdempotencyKey(
  gateway: string,
  attemptId: string,
  secret: string,
): string {
  if (!secret) throw new Error('PAYMENT_IDEMPOTENCY_SECRET is required');
  return createHmac('sha256', secret)
    .update(`akit-checkout:v1:${gateway}:${attemptId}`, 'utf8')
    .digest('base64url');
}

export function createRequestFingerprint(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(value), 'utf8')
    .digest('hex');
}

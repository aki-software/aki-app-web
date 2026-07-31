import * as crypto from 'crypto';
import { InternalServerErrorException } from '@nestjs/common';

/** Parsed parts from the MercadoPago x-signature header. */
export interface MpSignatureHeader {
  ts: string;
  v1: string;
}

/**
 * Parses the MercadoPago x-signature header.
 * Format: "ts=<timestamp>,v1=<hmac>"
 */
export function parseSignatureHeader(signature: string): MpSignatureHeader {
  const result: MpSignatureHeader = { ts: '', v1: '' };
  for (const part of signature.split(',')) {
    const [key, value] = part.split('=');
    if (key === 'ts') result.ts = value;
    if (key === 'v1') result.v1 = value;
  }
  return result;
}

/**
 * Validates the HMAC-SHA256 signature of an incoming MP webhook.
 * Logs a warning on mismatch but does not throw — the subsequent
 * Payment API call acts as a second layer of truth.
 *
 * @see https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks
 */
export function validateSignature(
  paymentId: unknown,
  requestId: unknown,
  ts: string,
  v1: string,
  secret: string,
  warn: (msg: string) => void,
): void {
  const manifest = `id:${paymentId};request-id:${requestId ?? ''};ts:${ts};`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex');

  if (expected !== v1) {
    warn(
      `MercadoPago webhook signature mismatch. Expected ${expected}, got ${v1}`,
    );
  }
}

/**
 * Parses the raw webhook body and extracts the numeric payment ID.
 * Throws if the body is not valid JSON or the ID is missing.
 */
export function parseWebhookPayload(rawBody: Buffer): {
  payload: Record<string, unknown>;
  paymentId: unknown;
} {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
  } catch {
    throw new InternalServerErrorException('Invalid webhook payload format');
  }

  const dataObj = payload.data as Record<string, unknown> | undefined;
  const paymentId = dataObj?.id ?? payload.id;
  if (!paymentId) {
    throw new InternalServerErrorException(
      'Payment ID missing in webhook payload',
    );
  }

  return { payload, paymentId };
}

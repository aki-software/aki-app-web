export const PAYMENT_RATE_LIMIT_POLICIES = {
  checkout: { policy: 'payment.checkout', limit: 5, windowMs: 60_000 },
  googlePlayVerify: {
    policy: 'payment.google-play.verify',
    limit: 10,
    windowMs: 60_000,
  },
  webhook: { policy: 'payment.webhook', limit: 30, windowMs: 60_000 },
} as const;

export const PAYMENT_LOG_REDACTION_FIELDS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'stripe-signature',
  'x-signature',
  'x-idempotency-key',
  'purchasetoken',
  'rawbody',
  'body',
  'payeremail',
  'buyeremail',
  'email',
]);

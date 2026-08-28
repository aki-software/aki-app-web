import {
  createClientKeyDigest,
  createProviderIdempotencyKey,
  createRequestFingerprint,
} from './checkout-idempotency';

describe('checkout idempotency', () => {
  const secret = 'test-payment-idempotency-secret';

  it('derives fixed-length digests without retaining the raw client key', () => {
    const digest = createClientKeyDigest('client-key', secret);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).not.toContain('client-key');
    expect(createClientKeyDigest('client-key', secret)).toBe(digest);
  });

  it('derives a versioned 43-character base64url provider key', () => {
    expect(
      createProviderIdempotencyKey(
        'STRIPE',
        '11111111-1111-1111-1111-111111111111',
        secret,
      ),
    ).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('fingerprints canonical checkout terms deterministically', () => {
    const terms = {
      planId: 'plan',
      gateway: 'STRIPE',
      snapshot: { listedUsd: '1000' },
    };
    expect(createRequestFingerprint(terms)).toMatch(/^[0-9a-f]{64}$/);
    expect(createRequestFingerprint(terms)).toBe(
      createRequestFingerprint(terms),
    );
    expect(
      createRequestFingerprint({ ...terms, gateway: 'MERCADO_PAGO' }),
    ).not.toBe(createRequestFingerprint(terms));
  });
});

import { describe, it, expect } from 'vitest';
import {
  PaymentGateway,
  PricingPlan,
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  PaymentEventStatus,
  PaymentTransaction,
  BillingHistory,
  CommercialSnapshot,
  ExactDecimal,
  Money,
  PaymentState,
  FulfillmentState,
  ProviderFreshness,
  PaymentStatus,
  PaymentHistory,
  RemediationRequest,
  RemediationResponse,
} from './payments';

const id = '123e4567-e89b-12d3-a456-426614174000';
const usd = { amountMinor: '1050', currency: 'USD' };
const mercadoPago = {
  kind: 'COMPLETE',
  pricingPlanId: id,
  planName: 'Basic',
  voucherQuantity: 2,
  listedUsd: usd,
  charged: { amountMinor: '160000', currency: 'ARS' },
  gateway: 'MERCADO_PAGO',
  fxRate: '152.380952',
  fxQuotedAt: '2026-01-01T00:00:00.000Z',
  fxSource: 'DOLAR_API_BLUE',
};
const legacy = {
  kind: 'LEGACY_PARTIAL',
  pricingPlanId: null,
  planName: null,
  voucherQuantity: null,
  listedUsd: null,
  charged: null,
  gateway: null,
  fxRate: null,
  fxQuotedAt: null,
  fxSource: null,
  missingFields: [
    'pricingPlanId', 'planName', 'voucherQuantity', 'listedUsd', 'charged',
    'gateway', 'fxRate', 'fxQuotedAt', 'fxSource',
  ],
};

describe('Payment Schemas', () => {
  describe('PaymentGateway', () => {
    it('should parse valid gateways', () => {
      expect(PaymentGateway.parse('MERCADO_PAGO')).toBe('MERCADO_PAGO');
      expect(PaymentGateway.parse('STRIPE')).toBe('STRIPE');
    });

    it('should reject invalid gateways', () => {
      expect(() => PaymentGateway.parse('PAYPAL')).toThrow();
    });
  });

  describe('PricingPlan', () => {
    it('should parse valid plan', () => {
      const validPlan = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Basic Plan',
        voucherQuantity: 100,
        priceUsd: 10.5,
        isActive: true,
      };
      expect(PricingPlan.parse(validPlan)).toEqual(validPlan);
    });
  });

  describe('CheckoutSessionRequest', () => {
    it('should parse valid request', () => {
      const request = {
        planId: '123e4567-e89b-12d3-a456-426614174000',
        gateway: 'MERCADO_PAGO',
      };
      expect(CheckoutSessionRequest.parse(request)).toEqual(request);
    });
  });

  describe('CheckoutSessionResponse', () => {
    it('requires a checkout attempt and rejects stale event identity', () => {
      const response = {
        checkoutUrl: 'https://checkout.url',
        voucherBatchId: id,
        checkoutAttemptId: id,
      };
      expect(CheckoutSessionResponse.parse(response)).toEqual(response);
      expect(CheckoutSessionResponse.safeParse({ ...response, paymentEventId: id }).success).toBe(false);
    });
  });

  describe('PaymentTransaction', () => {
    it('should parse valid transaction', () => {
      const transaction = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        gateway: 'STRIPE',
        externalReference: 'ext-ref-123',
        status: 'APPROVED',
        amount: 10.5,
        currency: 'USD',
        createdAt: new Date().toISOString(),
        plan: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Basic',
          voucherQuantity: 100,
          priceUsd: 10.5,
          isActive: true,
        },
      };
      expect(PaymentTransaction.parse(transaction)).toEqual(transaction);
      expect(PaymentEventStatus.parse('APPROVED')).toBe('APPROVED');
      expect(BillingHistory.parse({
        transactions: [transaction], totalPaid: 10.5, currentBalance: 2,
      })).toMatchObject({ totalPaid: 10.5 });
    });
  });

  describe('commercial snapshots', () => {
    it('uses exact money and decimal values', () => {
      expect(Money.parse(usd)).toEqual(usd);
      expect(ExactDecimal.parse('0.125')).toBe('0.125');
      expect(Money.safeParse({ amountMinor: 1050, currency: 'usd' }).success).toBe(false);
      expect(ExactDecimal.safeParse('1e2').success).toBe(false);
    });

    it('accepts Mercado Pago FX and Stripe USD snapshots', () => {
      expect(CommercialSnapshot.parse(mercadoPago)).toEqual(mercadoPago);
      const {
        fxRate: _fxRate,
        fxQuotedAt: _fxQuotedAt,
        fxSource: _fxSource,
        ...stripe
      } = mercadoPago;
      expect(CommercialSnapshot.parse({
        ...stripe, gateway: 'STRIPE', charged: usd,
      })).toMatchObject({ gateway: 'STRIPE', charged: usd });
    });

    it('rejects incomplete provider facts and dishonest legacy facts', () => {
      expect(CommercialSnapshot.safeParse({ ...mercadoPago, fxRate: '01.2' }).success).toBe(false);
      expect(CommercialSnapshot.safeParse({ ...mercadoPago, fxQuotedAt: undefined }).success).toBe(false);
      expect(CommercialSnapshot.safeParse({ ...mercadoPago, gateway: 'STRIPE' }).success).toBe(false);
      expect(CommercialSnapshot.parse(legacy)).toEqual(legacy);
      expect(CommercialSnapshot.safeParse({ ...legacy, planName: 'invented' }).success).toBe(false);
      expect(CommercialSnapshot.safeParse({ ...legacy, missingFields: legacy.missingFields.slice(1) }).success).toBe(false);
      expect(CommercialSnapshot.safeParse({
        ...legacy,
        missingFields: [...legacy.missingFields, 'planName'],
      }).success).toBe(false);
    });
  });

  describe('canonical payment lifecycle', () => {
    const status = {
      paymentState: 'PAID',
      fulfillmentState: 'FULFILLED',
      provider: 'STRIPE',
      providerFreshness: 'CURRENT',
      observedAt: '2026-01-01T00:00:00.000Z',
      staleAfter: '2026-01-01T01:00:00.000Z',
      checkoutAttemptId: id,
      paymentEventId: id,
      voucherBatchId: id,
      commercialSnapshot: {
        kind: 'COMPLETE', pricingPlanId: id, planName: 'Basic', voucherQuantity: 2,
        listedUsd: usd, charged: usd, gateway: 'STRIPE',
      },
      chargedTotal: usd,
      issuedVoucherCount: 2,
      expectedVoucherCount: 2,
      voucherDiscrepancy: 0,
    };

    it('parses canonical states and the exact provider freshness timestamp matrix', () => {
      expect(PaymentState.parse('UNKNOWN')).toBe('UNKNOWN');
      expect(FulfillmentState.parse('BLOCKED')).toBe('BLOCKED');
      expect(ProviderFreshness.parse('STALE')).toBe('STALE');
      expect(PaymentStatus.parse(status)).toEqual(status);
      for (const providerFreshness of ['STALE', 'CURRENT']) {
        expect(PaymentStatus.safeParse({ ...status, providerFreshness }).success).toBe(true);
      }
      for (const providerFreshness of ['UNAVAILABLE', 'NOT_OBSERVED']) {
        expect(PaymentStatus.safeParse({ ...status, providerFreshness, observedAt: null, staleAfter: null }).success).toBe(true);
        expect(PaymentStatus.safeParse({ ...status, providerFreshness }).success).toBe(false);
      }
      expect(PaymentStatus.safeParse({ ...status, paymentState: 'APPROVED' }).success).toBe(false);
    });

    it('keeps cursor history currency-separated and excludes legacy scalar totals', () => {
      const history = { transactions: [status], nextCursor: 'cursor:opaque', totalsByCurrency: [usd, { amountMinor: '2000', currency: 'ARS' }], currentBalance: 2 };
      expect(PaymentHistory.parse(history)).toEqual(history);
      expect(PaymentHistory.safeParse({ ...history, totalPaid: 30 }).success).toBe(false);
    });

    it('requires bounded non-URL provider remediation evidence', () => {
      const request = {
        action: 'CONFIRM_EXTERNAL_FULL_REFUND_AND_REVOKE', institutionId: id,
        reason: 'The provider confirmed the full refund and the vouchers require revocation.',
        provider: 'STRIPE', providerCheckoutId: null, providerPaymentId: 'pi_123',
        providerActionReferences: ['refund_123'], providerOccurredAt: '2026-01-01T00:00:00.000Z',
        chargedTotal: usd, merchantReference: 'order_123',
      };
      expect(RemediationRequest.parse(request)).toEqual(request);
      expect(RemediationRequest.safeParse({ ...request, providerActionReferences: [] }).success).toBe(false);
      expect(RemediationRequest.safeParse({ ...request, providerActionReferences: ['https://provider.example/refund'] }).success).toBe(false);
      expect(RemediationRequest.safeParse({ ...request, providerActionReferences: ['ftp://provider.example/refund'] }).success).toBe(false);
      expect(RemediationRequest.safeParse({ ...request, providerPaymentId: 'malformed evidence' }).success).toBe(false);
      expect(RemediationRequest.safeParse({ ...request, evidence: { secret: 'no' } }).success).toBe(false);
      expect(RemediationResponse.parse({ decision: 'ACCEPTED', remediationId: id, auditId: id })).toEqual({ decision: 'ACCEPTED', remediationId: id, auditId: id });
    });

    it('preserves the legacy APPROVED transaction shape', () => {
      const transaction = { id, gateway: 'STRIPE', externalReference: 'legacy', status: 'APPROVED', amount: 10.5, currency: 'USD', createdAt: '2026-01-01T00:00:00.000Z', plan: { id, name: 'Basic', voucherQuantity: 2, priceUsd: 10.5, isActive: true } };
      expect(PaymentTransaction.parse(transaction)).toEqual(transaction);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  PaymentGateway,
  PricingPlan,
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  PaymentEventStatus,
  PaymentTransaction,
  BillingHistory,
} from './payments';

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
    it('should parse valid response', () => {
      const response = {
        checkoutUrl: 'https://checkout.url',
        voucherBatchId: '123e4567-e89b-12d3-a456-426614174000',
        paymentEventId: '123e4567-e89b-12d3-a456-426614174001',
      };
      expect(CheckoutSessionResponse.parse(response)).toEqual(response);
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
    });
  });
});

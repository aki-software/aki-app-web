import { z } from 'zod';

export const PaymentGateway = z.enum(['MERCADO_PAGO', 'STRIPE']);
export type PaymentGateway = z.infer<typeof PaymentGateway>;

export const PricingPlan = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  voucherQuantity: z.number().int().nonnegative(),
  priceUsd: z.number().nonnegative(),
  isActive: z.boolean(),
});
export type PricingPlan = z.infer<typeof PricingPlan>;

export const CheckoutSessionRequest = z.object({
  planId: z.string().uuid(),
  gateway: PaymentGateway,
});
export type CheckoutSessionRequest = z.infer<typeof CheckoutSessionRequest>;

export const CheckoutSessionResponse = z.object({
  checkoutUrl: z.string().url(),
  voucherBatchId: z.string().uuid(),
  paymentEventId: z.string().uuid(),
});
export type CheckoutSessionResponse = z.infer<typeof CheckoutSessionResponse>;

export const PaymentEventStatus = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED']);
export type PaymentEventStatus = z.infer<typeof PaymentEventStatus>;

export const PaymentTransaction = z.object({
  id: z.string().uuid(),
  gateway: PaymentGateway,
  externalReference: z.string(),
  status: PaymentEventStatus,
  amount: z.number().nonnegative(),
  currency: z.string(),
  createdAt: z.string().datetime(),
  plan: PricingPlan,
});
export type PaymentTransaction = z.infer<typeof PaymentTransaction>;

export const BillingHistory = z.object({
  transactions: z.array(PaymentTransaction),
  totalPaid: z.number().nonnegative(),
  currentBalance: z.number().int().nonnegative(),
});
export type BillingHistory = z.infer<typeof BillingHistory>;

import { z } from 'zod';

const uuid = z.string().uuid();
const datetime = z.string().datetime();

export const PaymentGateway = z.enum(['MERCADO_PAGO', 'STRIPE']);
export type PaymentGateway = z.infer<typeof PaymentGateway>;

export const Money = z
  .object({
    amountMinor: z.string().regex(/^(0|[1-9]\d*)$/),
    currency: z.string().regex(/^[A-Z]{3}$/),
  })
  .strict();
export type Money = z.infer<typeof Money>;

export const ExactDecimal = z.string().regex(/^(?:0\.[0-9]*[1-9]|[1-9]\d*(?:\.[0-9]*[1-9])?)$/);
export type ExactDecimal = z.infer<typeof ExactDecimal>;

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
  checkoutAttemptId: uuid.optional(),
});
export type CheckoutSessionRequest = z.infer<typeof CheckoutSessionRequest>;

export const CheckoutSessionResponse = z
  .object({
    checkoutUrl: z.string().url(),
    voucherBatchId: z.string().uuid(),
    checkoutAttemptId: uuid,
  })
  .strict();
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

const completeSnapshot = z.object({
  kind: z.literal('COMPLETE'),
  pricingPlanId: uuid,
  planName: z.string().min(1),
  voucherQuantity: z.number().int().positive(),
  listedUsd: Money,
  charged: Money,
});
const fxSource = z.string().min(1).max(64).regex(/^[A-Z0-9_]+$/);
const missingFact = z.enum([
  'pricingPlanId', 'planName', 'voucherQuantity', 'listedUsd', 'charged',
  'gateway', 'fxRate', 'fxQuotedAt', 'fxSource',
]);

const legacySnapshot = z
  .object({
    kind: z.literal('LEGACY_PARTIAL'),
    pricingPlanId: uuid.nullable(),
    planName: z.string().min(1).nullable(),
    voucherQuantity: z.number().int().positive().nullable(),
    listedUsd: Money.nullable(),
    charged: Money.nullable(),
    gateway: PaymentGateway.nullable(),
    fxRate: ExactDecimal.nullable(),
    fxQuotedAt: datetime.nullable(),
    fxSource: fxSource.nullable(),
    missingFields: z.array(missingFact).min(1),
  })
  .strict()
  .superRefine((snapshot, ctx) => {
    const fields = missingFact.options;
    if (new Set(snapshot.missingFields).size !== snapshot.missingFields.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['missingFields'], message: 'missingFields must be unique' });
    }
    for (const field of fields) {
      if (snapshot.missingFields.includes(field) !== (snapshot[field] === null)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'missingFields must exactly identify null facts' });
      }
    }
  });

export const CommercialSnapshot = z.union([
  completeSnapshot.extend({ gateway: z.literal('MERCADO_PAGO'), fxRate: ExactDecimal, fxQuotedAt: datetime, fxSource }).strict(),
  completeSnapshot.extend({ gateway: z.literal('STRIPE') }).strict(),
  legacySnapshot,
]);
export type CommercialSnapshot = z.infer<typeof CommercialSnapshot>;

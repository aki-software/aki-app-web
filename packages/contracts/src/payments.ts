import { z } from "zod";

const uuid = z.string().uuid();
const datetime = z.string().datetime();

export const PaymentGateway = z.enum(["MERCADO_PAGO", "STRIPE"]);
export type PaymentGateway = z.infer<typeof PaymentGateway>;

export const Money = z
  .object({
    amountMinor: z.string().regex(/^(0|[1-9]\d*)$/),
    currency: z.string().regex(/^[A-Z]{3}$/),
  })
  .strict();
export type Money = z.infer<typeof Money>;

export const ExactDecimal = z
  .string()
  .regex(/^(?:0\.[0-9]*[1-9]|[1-9]\d*(?:\.[0-9]*[1-9])?)$/);
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

export const PaymentEventStatus = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
]);
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
  kind: z.literal("COMPLETE"),
  pricingPlanId: uuid,
  planName: z.string().min(1),
  voucherQuantity: z.number().int().positive(),
  listedUsd: Money,
  charged: Money,
});
const fxSource = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Z0-9_]+$/);
const missingFact = z.enum([
  "pricingPlanId",
  "planName",
  "voucherQuantity",
  "listedUsd",
  "charged",
  "gateway",
  "fxRate",
  "fxQuotedAt",
  "fxSource",
]);

const legacySnapshot = z
  .object({
    kind: z.literal("LEGACY_PARTIAL"),
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
    if (
      new Set(snapshot.missingFields).size !== snapshot.missingFields.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["missingFields"],
        message: "missingFields must be unique",
      });
    }
    for (const field of fields) {
      if (
        snapshot.missingFields.includes(field) !==
        (snapshot[field] === null)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: "missingFields must exactly identify null facts",
        });
      }
    }
  });

export const CommercialSnapshot = z.union([
  completeSnapshot
    .extend({
      gateway: z.literal("MERCADO_PAGO"),
      fxRate: ExactDecimal,
      fxQuotedAt: datetime,
      fxSource,
    })
    .strict(),
  completeSnapshot.extend({ gateway: z.literal("STRIPE") }).strict(),
  legacySnapshot,
]);
export type CommercialSnapshot = z.infer<typeof CommercialSnapshot>;

/** Canonical lifecycle contracts; migrate downstream consumers by PR5. Remove legacy contracts only after PR8 confirms no consumers and a separately approved removal. */
export const PaymentState = z.enum([
  "PENDING",
  "PAID",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
  "REFUNDED",
  "UNKNOWN",
]);
export type PaymentState = z.infer<typeof PaymentState>;

export const FulfillmentState = z.enum([
  "NOT_APPLICABLE",
  "QUEUED",
  "IN_PROGRESS",
  "DELAYED",
  "FULFILLED",
  "REVOKED",
  "BLOCKED",
]);
export type FulfillmentState = z.infer<typeof FulfillmentState>;

export const ProviderFreshness = z.enum([
  "CURRENT",
  "STALE",
  "UNAVAILABLE",
  "NOT_OBSERVED",
]);
export type ProviderFreshness = z.infer<typeof ProviderFreshness>;

const paymentStatusFields = {
  paymentState: PaymentState,
  fulfillmentState: FulfillmentState,
  provider: PaymentGateway,
  checkoutAttemptId: uuid.nullable(),
  paymentEventId: uuid.nullable(),
  voucherBatchId: uuid.nullable(),
  commercialSnapshot: CommercialSnapshot,
  chargedTotal: Money.nullable(),
  issuedVoucherCount: z.number().int().nonnegative().nullable(),
  expectedVoucherCount: z.number().int().nonnegative().nullable(),
  voucherDiscrepancy: z.number().int().nullable(),
};

export const PaymentStatus = z.discriminatedUnion("providerFreshness", [
  z
    .object({
      ...paymentStatusFields,
      providerFreshness: z.literal("CURRENT"),
      observedAt: datetime,
      staleAfter: datetime,
    })
    .strict(),
  z
    .object({
      ...paymentStatusFields,
      providerFreshness: z.literal("STALE"),
      observedAt: datetime,
      staleAfter: datetime,
    })
    .strict(),
  z
    .object({
      ...paymentStatusFields,
      providerFreshness: z.literal("UNAVAILABLE"),
      observedAt: z.null(),
      staleAfter: z.null(),
    })
    .strict(),
  z
    .object({
      ...paymentStatusFields,
      providerFreshness: z.literal("NOT_OBSERVED"),
      observedAt: z.null(),
      staleAfter: z.null(),
    })
    .strict(),
]);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

export const PaymentHistory = z
  .object({
    transactions: z.array(PaymentStatus),
    nextCursor: z.string().min(1).max(512).nullable(),
    totalsByCurrency: z.array(Money),
    currentBalance: z.number().int().nonnegative(),
  })
  .strict();
export type PaymentHistory = z.infer<typeof PaymentHistory>;

const sanitizedReference = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
const remediationAction = z.enum([
  "CONFIRM_EXTERNAL_CANCELLATION",
  "CONFIRM_EXTERNAL_FULL_REFUND_AND_REVOKE",
]);

export const RemediationRequest = z
  .object({
    action: remediationAction,
    institutionId: uuid,
    reason: z.string().trim().min(20).max(2000),
    provider: PaymentGateway,
    providerCheckoutId: sanitizedReference.nullable(),
    providerPaymentId: sanitizedReference.nullable(),
    providerActionReferences: z.array(sanitizedReference).max(20),
    providerOccurredAt: datetime,
    chargedTotal: Money,
    merchantReference: sanitizedReference,
  })
  .strict()
  .superRefine((request, ctx) => {
    if (
      request.providerCheckoutId === null &&
      request.providerPaymentId === null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["providerCheckoutId"],
        message: "providerCheckoutId or providerPaymentId is required",
      });
    }
    if (
      request.action === "CONFIRM_EXTERNAL_FULL_REFUND_AND_REVOKE" &&
      request.providerActionReferences.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["providerActionReferences"],
        message: "full refund and revoke requires provider action references",
      });
    }
  });
export type RemediationRequest = z.infer<typeof RemediationRequest>;

export const RemediationResponse = z
  .object({
    decision: z.enum([
      "ACCEPTED",
      "REJECTED",
      "DEFERRED",
      "CONFLICT",
      "DUPLICATE",
    ]),
    remediationId: uuid,
    auditId: uuid,
  })
  .strict();
export type RemediationResponse = z.infer<typeof RemediationResponse>;

export const PaymentNotificationRecipientKind = z.enum(['BUYER', 'PLATFORM_ADMIN']);
export type PaymentNotificationRecipientKind = z.infer<typeof PaymentNotificationRecipientKind>;

export const PaymentNotificationDeliveryStatus = z.enum(['PENDING', 'QUEUED', 'SENT', 'RETRYABLE_FAILED', 'DEAD_LETTER']);
export type PaymentNotificationDeliveryStatus = z.infer<typeof PaymentNotificationDeliveryStatus>;

export const PaymentNotificationErrorClassification = z.enum([
  'RECIPIENT_UNRESOLVED', 'QUEUE_FAILURE', 'RENDER_FAILURE', 'TRANSPORT_TRANSIENT', 'TRANSPORT_PERMANENT',
]);
export type PaymentNotificationErrorClassification = z.infer<typeof PaymentNotificationErrorClassification>;

const safeIdentity = z.object({ id: uuid, name: z.string().min(1) }).strict();
const safeRecipientSnapshot = z.object({ userId: uuid, name: z.string().min(1), email: z.string().email() }).strict();
const safeCommercialSnapshot = z.object({ pricingPlanId: uuid.nullable(), planName: z.string().min(1).nullable() }).strict();
const exactMonetaryValue = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/);

export const PaymentNotificationContextSnapshotV1 = z.object({
  version: z.literal(1),
  voucherBatchId: uuid,
  checkoutAttemptId: uuid.nullable(),
  paymentEventId: uuid.nullable(),
  institution: safeIdentity,
  buyer: safeRecipientSnapshot.nullable(),
  commercial: z.object({ pricingPlanId: uuid.nullable(), planName: z.string().min(1).nullable(), voucherQuantity: z.number().int().positive() }).strict(),
  charged: Money.nullable(),
  payment: z.object({ gateway: PaymentGateway, externalReference: z.string().min(1), settledAt: datetime }).strict().nullable(),
  fulfilledAt: datetime,
}).strict();
export type PaymentNotificationContextSnapshotV1 = z.infer<typeof PaymentNotificationContextSnapshotV1>;

const assertInclusiveRange = (from: string | undefined, to: string | undefined, field: string, ctx: z.RefinementCtx) => {
  if (from && to && from > to) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${field} must be before or equal to its end` });
  }
};

export const AdminPaymentLedgerQuery = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  fulfillmentState: z.enum(['PENDING', 'FULFILLED']).optional(),
  notificationRecipient: z.enum(['ANY', 'BUYER', 'PLATFORM_ADMIN']).default('ANY'),
  notificationStatus: z.enum(['ABSENT', 'PENDING', 'QUEUED', 'SENT', 'RETRYABLE_FAILED', 'DEAD_LETTER']).optional(),
  institutionId: uuid.optional(),
  settledFrom: datetime.optional(), settledTo: datetime.optional(),
  fulfilledFrom: datetime.optional(), fulfilledTo: datetime.optional(),
  sort: z.literal('FULFILLED_DESC').default('FULFILLED_DESC'),
}).strict().superRefine((query, ctx) => {
  assertInclusiveRange(query.settledFrom, query.settledTo, 'settledFrom', ctx);
  assertInclusiveRange(query.fulfilledFrom, query.fulfilledTo, 'fulfilledFrom', ctx);
});
export type AdminPaymentLedgerQuery = z.infer<typeof AdminPaymentLedgerQuery>;

const AdminPaymentLedgerDeliverySummary = z.object({
  deliveryId: uuid,
  status: PaymentNotificationDeliveryStatus,
  attemptCount: z.number().int().nonnegative(),
  enqueueAttemptCount: z.number().int().nonnegative(),
  recipient: safeRecipientSnapshot.nullable(),
  queuedAt: datetime.nullable(), lastAttemptAt: datetime.nullable(), sentAt: datetime.nullable(),
  error: z.object({ classification: PaymentNotificationErrorClassification, message: z.string().min(1).max(256) }).strict().nullable(),
}).strict();
export type AdminPaymentLedgerDeliverySummary = z.infer<typeof AdminPaymentLedgerDeliverySummary>;

export const AdminPaymentLedgerEntry = z.object({
  voucherBatchId: uuid, checkoutAttemptId: uuid.nullable(), paymentEventId: uuid.nullable(),
  institution: safeIdentity, buyer: safeRecipientSnapshot.nullable(),
  commercial: safeCommercialSnapshot,
  amount: z.object({ value: exactMonetaryValue, currency: z.string().regex(/^[A-Z]{3}$/) }).strict(),
  payment: z.object({ gateway: PaymentGateway, externalReference: z.string().min(1), settledAt: datetime }).strict().nullable(),
  fulfillment: z.object({ state: z.enum(['PENDING', 'FULFILLED']), fulfilledAt: datetime.nullable(), expectedVoucherCount: z.number().int().nonnegative(), actualVoucherCount: z.number().int().nonnegative(), discrepancy: z.number().int() }).strict(),
  notifications: z.object({ buyer: AdminPaymentLedgerDeliverySummary.nullable(), platformAdmin: AdminPaymentLedgerDeliverySummary.nullable() }).strict(),
}).strict();
export type AdminPaymentLedgerEntry = z.infer<typeof AdminPaymentLedgerEntry>;

export const AdminPaymentLedgerPage = z.object({
  items: z.array(AdminPaymentLedgerEntry), page: z.number().int().min(1), pageSize: z.number().int().min(1).max(100),
  total: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(), sort: z.literal('FULFILLED_DESC'),
}).strict();
export type AdminPaymentLedgerPage = z.infer<typeof AdminPaymentLedgerPage>;

export const AdminPaymentLedgerDetail = AdminPaymentLedgerEntry;
export type AdminPaymentLedgerDetail = z.infer<typeof AdminPaymentLedgerDetail>;

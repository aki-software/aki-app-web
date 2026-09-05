import { z } from "zod";

const datetime = z.string().datetime();
const currencyAmount = z
  .object({
    currency: z.string().regex(/^[A-Z]{3}$/),
    amount: z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/),
  })
  .strict();
const metrics = z
  .object({
    accreditedPurchaseCount: z.number().int().nonnegative(),
    accreditedVoucherCount: z.number().int().nonnegative(),
    accreditedAmountByCurrency: z.array(currencyAmount),
  })
  .strict();
const window = z
  .object({ from: datetime, to: datetime, days: z.union([z.literal(7), z.literal(30), z.literal(90)]) })
  .strict();
const latestAccreditation = z
  .object({
    accreditedAt: datetime,
    voucherCount: z.number().int().nonnegative(),
    amount: currencyAmount,
  })
  .strict();
const common = {
  generatedAt: datetime,
  currentWindow: window,
  priorWindow: window,
  current: metrics,
  prior: metrics,
  alerts: z
    .object({
      paidButNotFulfilledCount: z.number().int().nonnegative(),
      notificationAttentionCount: z.number().int().nonnegative(),
    })
    .strict(),
};

export const PurchaseSummaryQuery = z
  .object({
    periodDays: z.coerce.number().int().refine((value) => [7, 30, 90].includes(value)).default(7),
  })
  .strict();
export type PurchaseSummaryQuery = z.infer<typeof PurchaseSummaryQuery>;

export const PurchaseSummaryResponse = z.discriminatedUnion("scope", [
  z
    .object({
      ...common,
      scope: z.literal("PLATFORM"),
      current: metrics.extend({ purchasingInstitutionCount: z.number().int().nonnegative() }).strict(),
      prior: metrics.extend({ purchasingInstitutionCount: z.number().int().nonnegative() }).strict(),
      latestAccreditation: latestAccreditation.extend({ institutionName: z.string().trim().min(1) }).strict().nullable(),
    })
    .strict(),
  z
    .object({
      ...common,
      scope: z.literal("INSTITUTION"),
      institutionName: z.string().trim().min(1),
      latestAccreditation: latestAccreditation.nullable(),
    })
    .strict(),
]);
export type PurchaseSummaryResponse = z.infer<typeof PurchaseSummaryResponse>;

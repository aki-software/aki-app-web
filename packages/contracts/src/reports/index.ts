import { z } from "zod";

export const reportStatusSchema = z.enum([
  "PENDING",
  "GENERATING",
  "AVAILABLE",
  "EXPIRED",
  "FAILED",
]);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

export const reportStateSchema = z
  .object({
    status: reportStatusSchema,
    version: z.number().int().positive().optional(),
    generatedAt: z.string().datetime().nullable().optional(),
    availableUntil: z.string().datetime().nullable().optional(),
    deliveryReady: z.boolean().default(false),
  })
  .superRefine((state, context) => {
    if (
      state.deliveryReady &&
      (state.status !== "AVAILABLE" ||
        !state.version ||
        !state.generatedAt ||
        !state.availableUntil)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Delivery readiness requires an available immutable report.",
      });
    }
  });
export type ReportStateDto = z.infer<typeof reportStateSchema>;

export const reportGenerationJobSchema = z.object({
  reportId: z.string().uuid(),
  sessionId: z.string().uuid(),
  version: z.number().int().positive(),
});
export type ReportGenerationJob = z.infer<typeof reportGenerationJobSchema>;

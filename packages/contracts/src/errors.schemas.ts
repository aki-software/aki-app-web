import { z } from 'zod';

export const appErrorCodeSchema = z.enum([
  'INVALID_CODE',
  'ALREADY_USED',
  'SESSION_NOT_FOUND',
  'UNAUTHORIZED',
  'VALIDATION_ERROR',
]);

export const appErrorSchema = z.object({
  code: appErrorCodeSchema,
  message: z.string(),
  statusCode: z.number().int(),
  timestamp: z.string().optional(),
  path: z.string().optional(),
});

export type AppErrorCode = z.infer<typeof appErrorCodeSchema>;
export type AppError = z.infer<typeof appErrorSchema>;

import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_METADATA_KEY = 'rate_limit_meta';

export type RateLimitMeta = {
  limit: number;
  windowMs: number;
};

export const RateLimit = (limit: number, windowMs: number) =>
  SetMetadata(RATE_LIMIT_METADATA_KEY, { limit, windowMs } satisfies RateLimitMeta);

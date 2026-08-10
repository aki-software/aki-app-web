import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_METADATA_KEY = 'rate_limit_meta';

export type RateLimitMeta = {
  policy?: string;
  keyPrefix?: string;
  limit: number;
  windowMs: number;
};

export const RateLimit = (limit: number, windowMs: number, policy?: string) =>
  SetMetadata(RATE_LIMIT_METADATA_KEY, {
    policy,
    keyPrefix: policy,
    limit,
    windowMs,
  } satisfies RateLimitMeta);

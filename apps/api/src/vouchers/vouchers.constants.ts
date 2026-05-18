export enum VoucherExpirationFilter {
  ALL = 'ALL',
  EXPIRING_7D = 'EXPIRING_7D',
  NO_EXPIRATION = 'NO_EXPIRATION',
}

export const VOUCHER_CONFIG = {
  CODE_LENGTH: 8,
  GENERATION_ATTEMPTS: 10,
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },
  EXPIRATION_7D_MS: 7 * 24 * 60 * 60 * 1000,
  FORBIDDEN_ID: '__forbidden__',
};

export const VOUCHER_EMAIL_JOB_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_MS: 60_000,
  BACKOFF_TYPE: 'exponential' as const,
  TIMEOUT_MS: 20_000,
  CONCURRENCY_KEY: 'email',
  CONCURRENCY_LIMIT: 10,
};

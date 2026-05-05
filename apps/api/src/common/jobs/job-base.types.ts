export type JobRetryOptions = {
  attempts?: number;
  backoffMs?: number;
  backoffType?: 'fixed' | 'exponential';
  timeoutMs?: number;
  concurrencyKey?: string;
  concurrencyLimit?: number;
};

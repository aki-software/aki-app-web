export type QueueJobOptions = {
  attempts?: number;
  backoffMs?: number;
  backoffType?: 'fixed' | 'exponential';
  delayMs?: number;
  timeoutMs?: number;
  concurrencyKey?: string;
  concurrencyLimit?: number;
};

export interface QueueAdapter {
  isConfigured(): boolean;
  enqueue(
    jobName: string,
    payload: unknown,
    options?: QueueJobOptions,
  ): Promise<void>;
}

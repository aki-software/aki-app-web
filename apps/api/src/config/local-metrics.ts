const ALLOWED_METRICS_BIND_ADDRESSES = ['127.0.0.1', '0.0.0.0'];

export function resolveLocalMetricsBindAddress(
  configuredAddress: string | undefined,
  enabled: boolean,
): string {
  const bindAddress = configuredAddress ?? '127.0.0.1';
  if (enabled && !ALLOWED_METRICS_BIND_ADDRESSES.includes(bindAddress)) {
    throw new Error('LOCAL_METRICS_BIND_ADDRESS must be 127.0.0.1 or 0.0.0.0');
  }
  return bindAddress;
}

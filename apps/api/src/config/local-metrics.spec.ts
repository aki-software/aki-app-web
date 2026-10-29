import { resolveLocalMetricsBindAddress } from './local-metrics.js';

describe('resolveLocalMetricsBindAddress', () => {
  it('defaults enabled metrics to loopback', () => {
    expect(resolveLocalMetricsBindAddress(undefined, true)).toBe('127.0.0.1');
  });

  it('allows a wildcard bind for the isolated container network', () => {
    expect(resolveLocalMetricsBindAddress('0.0.0.0', true)).toBe('0.0.0.0');
  });

  it('rejects non-loopback addresses when metrics are enabled', () => {
    expect(() => resolveLocalMetricsBindAddress('192.168.1.10', true)).toThrow(
      'LOCAL_METRICS_BIND_ADDRESS must be 127.0.0.1 or 0.0.0.0',
    );
  });
});

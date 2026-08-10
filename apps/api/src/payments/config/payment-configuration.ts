export class PaymentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = PaymentConfigurationError.name;
  }
}

export interface PaymentConfiguration {
  simulationEnabled: boolean;
}

const productionRequiredKeys = [
  'FRONTEND_URL',
  'API_URL',
  'REDIS_HOST',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'MP_ACCESS_TOKEN',
  'MP_WEBHOOK_SECRET',
  'GOOGLE_PLAY_PACKAGE_NAME',
  'GOOGLE_PLAY_REPORT_SKU',
  'GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64',
] as const;

export function resolvePaymentConfiguration(
  environment: NodeJS.ProcessEnv,
): PaymentConfiguration {
  const isProduction = environment.NODE_ENV === 'production';
  const simulationEnabled = environment.PAYMENT_SIMULATION === 'true';

  if (
    simulationEnabled &&
    !['development', 'test'].includes(environment.NODE_ENV ?? '')
  ) {
    throw new PaymentConfigurationError(
      isProduction
        ? 'PAYMENT_SIMULATION cannot be enabled in production'
        : 'PAYMENT_SIMULATION is only allowed in test or development',
    );
  }

  if (isProduction) {
    const missing = productionRequiredKeys.filter((key) => !environment[key]);
    if (missing.length > 0) {
      throw new PaymentConfigurationError(
        `Missing required production payment configuration: ${missing.join(', ')}`,
      );
    }
    validateProductionPaymentConfiguration(environment);
  }

  return { simulationEnabled };
}

function validateProductionPaymentConfiguration(
  environment: NodeJS.ProcessEnv,
): void {
  validatePublicHttpsUrl(environment.FRONTEND_URL!, 'FRONTEND_URL');
  validatePublicHttpsUrl(environment.API_URL!, 'API_URL');
  validateCredential(
    environment.STRIPE_SECRET_KEY!,
    /^sk_live_[A-Za-z0-9]{16,}$/,
    'STRIPE_SECRET_KEY',
  );
  validateCredential(
    environment.STRIPE_WEBHOOK_SECRET!,
    /^whsec_[A-Za-z0-9]{16,}$/,
    'STRIPE_WEBHOOK_SECRET',
  );
  validateCredential(
    environment.MP_ACCESS_TOKEN!,
    /^APP_USR-[A-Za-z0-9_-]{16,}$/,
    'MP_ACCESS_TOKEN',
  );
  validateCredential(
    environment.MP_WEBHOOK_SECRET!,
    /^[A-Za-z0-9_-]{20,}$/,
    'MP_WEBHOOK_SECRET',
  );
  if (
    !/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/.test(
      environment.GOOGLE_PLAY_PACKAGE_NAME!,
    )
  ) {
    throw new PaymentConfigurationError('GOOGLE_PLAY_PACKAGE_NAME is invalid');
  }
  if (environment.GOOGLE_PLAY_REPORT_SKU !== 'report_unlock_v2') {
    throw new PaymentConfigurationError(
      'GOOGLE_PLAY_REPORT_SKU must be report_unlock_v2',
    );
  }
}

function validateCredential(value: string, pattern: RegExp, key: string): void {
  if (!pattern.test(value)) {
    throw new PaymentConfigurationError(
      `${key} is malformed or not a live credential`,
    );
  }
}

function validatePublicHttpsUrl(value: string, key: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new PaymentConfigurationError(
      `${key} must be a valid public HTTPS URL`,
    );
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    !isPublicHostname(url.hostname)
  ) {
    throw new PaymentConfigurationError(
      `${key} must be a valid public HTTPS URL`,
    );
  }
}

function isPublicHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (normalized === 'localhost' || normalized.endsWith('.local')) return false;
  const ipVersion = isIP(normalized);
  if (ipVersion === 4) return isPublicIpv4(normalized);
  if (ipVersion === 6) return isPublicIpv6(normalized);
  return true;
}

function isPublicIpv4(address: string): boolean {
  const [first, second] = address.split('.').map(Number);
  if (first === 0 || first === 10 || first === 127 || first >= 224)
    return false;
  if (first === 100 && second >= 64 && second <= 127) return false;
  if (first === 169 && second === 254) return false;
  if (first === 172 && second >= 16 && second <= 31) return false;
  if (first === 192 && (second === 0 || second === 2 || second === 168))
    return false;
  if (first === 198 && (second === 18 || second === 19 || second === 51))
    return false;
  return !(first === 203 && second === 0);
}

function isPublicIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  const value = ipv6ToBigInt(normalized);
  if (value === null) return false;
  const isPrefix = (prefix: bigint, bits: bigint) =>
    value >> (128n - bits) === prefix >> (128n - bits);
  if (
    isPrefix(0n, 3n) ||
    isPrefix(0xfc00n << 112n, 7n) ||
    isPrefix(0xfe80n << 112n, 10n) ||
    isPrefix(0xff00n << 112n, 8n)
  )
    return false;
  if (
    isPrefix(0x20010000n << 96n, 32n) ||
    isPrefix(0x20010db8n << 96n, 32n) ||
    isPrefix(0x3fffn << 112n, 20n)
  )
    return false;
  return true;
}

function ipv6ToBigInt(address: string): bigint | null {
  const [left, right = ''] = address.split('::');
  if (address.split('::').length > 2) return null;
  const leftParts = left ? left.split(':') : [];
  const rightParts = right ? right.split(':') : [];
  const parts = [
    ...leftParts,
    ...Array(8 - leftParts.length - rightParts.length).fill('0'),
    ...rightParts,
  ];
  if (parts.length !== 8 || parts.some((part) => !/^[0-9a-f]{1,4}$/.test(part)))
    return null;
  return parts.reduce(
    (value, part) => (value << 16n) + BigInt(`0x${part}`),
    0n,
  );
}
import { isIP } from 'node:net';

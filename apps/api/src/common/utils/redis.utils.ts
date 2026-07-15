import { ConfigService } from '@nestjs/config';

export type RedisConnectionConfig =
  | { url: string }
  | { host: string; port: number }
  | null;

export function getRedisConnection(
  configService: ConfigService,
): RedisConnectionConfig {
  const url = getRedisUrl(configService);
  if (url) {
    return { url };
  }

  const host = configService.get<string>('REDIS_HOST');
  if (!host?.trim()) {
    return null;
  }

  const port = getRedisPort(configService);
  if (port === null) {
    return null;
  }

  return { host: host.trim(), port };
}

function getRedisUrl(configService: ConfigService): string | null {
  const primary = configService.get<string>('REDIS_URL');
  if (primary?.trim()) {
    return primary.trim();
  }

  const legacy = configService.get<string>('QUEUE_REDIS_URL');
  return legacy?.trim() ?? null;
}

function getRedisPort(configService: ConfigService): number | null {
  const portValue = configService.get<string>('REDIS_PORT');
  if (!portValue) {
    return 6379;
  }

  const parsed = Number(portValue);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

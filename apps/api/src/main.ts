import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { createCorsOptions } from './config/cors-policy.js';

/**
 * Production guard: prevents the app from starting with the in-memory
 * queue fallback. In production, silent job loss is unacceptable —
 * we require BullMQ + Redis to be explicitly enabled and configured.
 */
function assertProductionQueueConfig(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const bullMqEnabled = process.env.ENABLE_BULLMQ === 'true';
  const redisConfigured =
    !!(process.env.REDIS_URL ?? process.env.QUEUE_REDIS_URL ?? process.env.REDIS_HOST);

  if (isProduction && !bullMqEnabled) {
    console.error(
      '[Bootstrap] FATAL: ENABLE_BULLMQ must be set to "true" in production. ' +
        'The in-memory queue fallback is not safe for production workloads (no persistence, no retries). ' +
        'Set ENABLE_BULLMQ=true and configure REDIS_URL.',
    );
    process.exit(1);
  }

  if (isProduction && bullMqEnabled && !redisConfigured) {
    console.error(
      '[Bootstrap] FATAL: ENABLE_BULLMQ=true but no Redis connection is configured. ' +
        'Set REDIS_URL (or REDIS_HOST + REDIS_PORT + REDIS_PASSWORD).',
    );
    process.exit(1);
  }
}

async function bootstrap() {
  assertProductionQueueConfig();

  const start = Date.now();
  console.log(`[Bootstrap] Starting application...`);

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  console.log(
    `[Bootstrap] NestFactory.create completed in ${Date.now() - start}ms`,
  );

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.useLogger(app.get(Logger));

  app.enableCors(createCorsOptions());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1', {
    exclude: ['health', '/'],
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`[Bootstrap] Application listening on 0.0.0.0:${port}`);
}

void bootstrap().catch((error: unknown) => {
  console.error('[Bootstrap] Application startup failed', error);
  process.exitCode = 1;
});

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { createCorsOptions } from './config/cors-policy.js';

async function bootstrap() {
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

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

void bootstrap().catch((error: unknown) => {
  console.error('[Bootstrap] Application startup failed', error);
  process.exitCode = 1;
});

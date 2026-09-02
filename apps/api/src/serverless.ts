import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger, ValidationPipe } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import serverlessHttp from 'serverless-http';
import type { RequestHandler } from 'express';
import { createCorsOptions } from './config/cors-policy.js';

let handler: ReturnType<typeof serverlessHttp> | undefined;
const logger = new Logger('ServerlessBootstrap');

async function bootstrap(): Promise<ReturnType<typeof serverlessHttp>> {
  if (handler) return handler;

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

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

  app.useLogger(app.get(PinoLogger));

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

  await app.init();

  handler = serverlessHttp(
    app.getHttpAdapter().getInstance() as RequestHandler,
  );
  return handler;
}

export default async function (req: unknown, res: any): Promise<void> {
  try {
    const h = await bootstrap();
    await h(req as Parameters<typeof h>[0], res as Parameters<typeof h>[1]);
  } catch (error) {
    logger.error(
      'Fatal bootstrap error',
      error instanceof Error ? error.stack : String(error),
    );
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        message: 'Internal server error',
      }),
    );
  }
}

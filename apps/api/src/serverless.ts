import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import serverlessHttp from 'serverless-http';
import type { RequestHandler } from 'express';

let handler: ReturnType<typeof serverlessHttp> | undefined;

async function bootstrap(): Promise<ReturnType<typeof serverlessHttp>> {
  if (handler) return handler;

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

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

  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') ?? [
    'http://localhost:5173',
  ];
  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

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
    console.error('Fatal bootstrap error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'Bootstrap failed',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }),
    );
  }
}

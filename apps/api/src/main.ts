import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpAdapterHost } from '@nestjs/core';

async function bootstrap() {
  const start = Date.now();
  console.log(`[Bootstrap] Starting application...`);

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  console.log(`[Bootstrap] NestFactory.create completed in ${Date.now() - start}ms`);

  app.useLogger(app.get(Logger));

  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  // Habilitamos CORS restrictivo (VULN-06 Fix)
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') ?? [
    'http://localhost:5173',
  ];
  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Habilitamos validación DTO global y rechazamos campos no permitidos.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();

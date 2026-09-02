import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';

const developmentOrigins = [
  'http://localhost:5173',
  'http://localhost:4321',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4321',
];

export function createCorsOptions(
  environment: NodeJS.ProcessEnv = process.env,
): CorsOptions {
  const configuredOrigins = (environment.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isProduction = environment.NODE_ENV === 'production';
  const allowedOrigins =
    configuredOrigins.length > 0
      ? configuredOrigins
      : isProduction
        ? []
        : developmentOrigins;

  return {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  };
}

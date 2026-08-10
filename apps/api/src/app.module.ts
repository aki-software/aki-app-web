import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module.js';
import { SessionsModule } from './sessions/sessions.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { AuthModule } from './auth/auth.module.js';
import { typeOrmConfig } from './config/typeorm.config.js';
import { LoggerModule } from 'nestjs-pino';
import { InstitutionsModule } from './institutions/institutions.module.js';
import { VouchersModule } from './vouchers/vouchers.module.js';
import { StatsModule } from './stats/stats.module.js';
import { CommonModule } from './common/common.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { HealthController } from './health.controller.js';
import { ReportsModule } from './reports/reports.module.js';
import { BullModule } from '@nestjs/bullmq';
import { RequestLoggerMiddleware } from './common/middlewares/request-logger.middleware.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { resolvePaymentConfiguration } from './payments/config/payment-configuration.js';

const { migrations: _migrations, ...applicationTypeOrmConfig } = typeOrmConfig;
void _migrations;

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (environment) => {
        resolvePaymentConfiguration(environment);
        return environment;
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const tlsEnabled = configService.get('REDIS_TLS') === 'true';
        return {
          connection: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
            username: configService.get('REDIS_USERNAME') || undefined,
            password: configService.get('REDIS_PASSWORD') || undefined,
            db: Number(configService.get('REDIS_DB', 0)),
            ...(tlsEnabled ? { tls: {} } : {}),
            connectTimeout: 10_000,
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        if (databaseUrl) {
          return {
            ...applicationTypeOrmConfig,
            url: databaseUrl,
          };
        }
        return {
          ...applicationTypeOrmConfig,
          host:
            configService.get<string>('DATABASE_HOST') || typeOrmConfig.host,
          port:
            configService.get<number>('DATABASE_PORT') || typeOrmConfig.port,
          username:
            configService.get<string>('DATABASE_USER') ||
            typeOrmConfig.username,
          password:
            configService.get<string>('DATABASE_PASSWORD') ||
            typeOrmConfig.password,
          database:
            configService.get<string>('DATABASE_NAME') ||
            typeOrmConfig.database,
        };
      },
    }),
    CommonModule,
    UsersModule,
    SessionsModule,
    CategoriesModule,
    AuthModule,
    InstitutionsModule,
    VouchersModule,
    StatsModule,
    PaymentsModule,
    ReportsModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module.js';
import { SessionsModule } from './sessions/sessions.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { AuthModule } from './auth/auth.module.js';
import { typeOrmConfig } from './config/typeorm.config.js';
import { MailModule } from './mail/mail.module.js';
import { LoggerModule } from 'nestjs-pino';
import { InstitutionsModule } from './institutions/institutions.module.js';
import { VouchersModule } from './vouchers/vouchers.module.js';
import { StatsModule } from './stats/stats.module.js';
import { CommonModule } from './common/common.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { HealthController } from './health.controller.js';

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
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...typeOrmConfig,
        host: configService.get<string>('DATABASE_HOST') || typeOrmConfig.host,
        port: configService.get<number>('DATABASE_PORT') || typeOrmConfig.port,
        username:
          configService.get<string>('DATABASE_USER') || typeOrmConfig.username,
        password:
          configService.get<string>('DATABASE_PASSWORD') ||
          typeOrmConfig.password,
        database:
          configService.get<string>('DATABASE_NAME') || typeOrmConfig.database,
      }),
    }),
    CommonModule,
    UsersModule,
    SessionsModule,
    CategoriesModule,
    MailModule,
    AuthModule,
    InstitutionsModule,
    VouchersModule,
    StatsModule,
    PaymentsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}

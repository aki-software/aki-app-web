import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { SessionsModule } from './sessions/sessions.module';
import { CategoriesModule } from './categories/categories.module';
import { AuthModule } from './auth/auth.module';
import { typeOrmConfig } from './config/typeorm.config';
import { MailModule } from './mail/mail.module';
import { LoggerModule } from 'nestjs-pino';
import { InstitutionsModule } from './institutions/institutions.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { StatsModule } from './stats/stats.module';

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
    UsersModule,
    SessionsModule,
    CategoriesModule,
    MailModule,
    AuthModule,
    InstitutionsModule,
    VouchersModule,
    StatsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

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

@Module({
  imports: [
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

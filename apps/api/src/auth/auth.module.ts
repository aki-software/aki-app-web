import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { PasswordResetNotifierService } from '../common/notifications/password-reset-notifier.service';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthUserFactory } from './factories/auth-user.factory';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtTokenDecoderService } from './services/jwt-token-decoder.service';
import { FirebaseCertService } from './services/firebase-cert.service';
import { FirebaseClaimsValidatorService } from './services/firebase-claims-validator.service';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    UsersModule,
    MailModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRATION') ||
            '12h') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RolesGuard,
    RateLimitGuard,
    PasswordResetNotifierService,
    FirebaseCertService,
    JwtTokenDecoderService,
    FirebaseClaimsValidatorService,
    AuthUserFactory,
  ],
  exports: [AuthService],
})
export class AuthModule {}

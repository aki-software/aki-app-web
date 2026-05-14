import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { NotificationsModule } from '../common/notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthJwtModule } from './config/auth-jwt.module';
import { AuthResponseFactory } from './factories/auth-response.factory';
import { AuthUserFactory } from './factories/auth-user.factory';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthLoginService } from './services/auth-login.service';
import { AuthPasswordFlowService } from './services/auth-password-flow.service';
import { AuthTokenService } from './services/auth-token.service';
import { JwtTokenDecoderService } from './services/jwt-token-decoder.service';
import { FirebaseCertService } from './services/firebase-cert.service';
import { FirebaseClaimsValidatorService } from './services/firebase-claims-validator.service';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [UsersModule, NotificationsModule, PassportModule, AuthJwtModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RolesGuard,
    RateLimitGuard,
    FirebaseCertService,
    JwtTokenDecoderService,
    FirebaseClaimsValidatorService,
    AuthTokenService,
    AuthLoginService,
    AuthPasswordFlowService,
    AuthResponseFactory,
    AuthUserFactory,
  ],
  exports: [AuthService],
})
export class AuthModule {}

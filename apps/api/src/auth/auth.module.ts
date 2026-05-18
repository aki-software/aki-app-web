import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';
import { NotificationsModule } from '../common/notifications/notifications.module.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthJwtModule } from './config/auth-jwt.module.js';
import { AuthResponseFactory } from './factories/auth-response.factory.js';
import { AuthUserFactory } from './factories/auth-user.factory.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { AuthLoginService } from './services/auth-login.service.js';
import { AuthPasswordFlowService } from './services/auth-password-flow.service.js';
import { AuthTokenService } from './services/auth-token.service.js';
import { JwtTokenDecoderService } from './services/jwt-token-decoder.service.js';
import { FirebaseCertService } from './services/firebase-cert.service.js';
import { FirebaseClaimsValidatorService } from './services/firebase-claims-validator.service.js';
import { RolesGuard } from './guards/roles.guard.js';

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

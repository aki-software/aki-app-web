import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthJwtModule } from './config/auth-jwt.module.js';
import { AuthResponseFactory } from './factories/auth-response.factory.js';
import { AuthUserFactory } from './factories/auth-user.factory.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { AuthLoginService } from './services/auth-login.service.js';
import { AuthPasswordFlowService } from './services/auth-password-flow.service.js';
import { AuthTokenService } from './services/auth-token.service.js';
import { FirebaseTokenService } from './services/firebase-token.service.js';
import { RolesGuard } from './guards/roles.guard.js';

@Module({
  imports: [UsersModule, PassportModule, AuthJwtModule],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    RolesGuard,
    RateLimitGuard,
    FirebaseTokenService,
    AuthTokenService,
    AuthLoginService,
    AuthPasswordFlowService,
    AuthResponseFactory,
    AuthUserFactory,
  ],
  exports: [],
})
export class AuthModule {}

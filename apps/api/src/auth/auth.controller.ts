import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { RateLimit } from '../common/decorators/rate-limit.decorator.js';
import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';
import { AUTH_RATE_LIMITS } from './auth.constants.js';
import { AuthService } from './auth.service.js';
import type { AuthenticatedRequest } from './auth.types.js';
import { LoginDto } from './dto/auth-login.dto.js';
import {
  ChangePasswordDto,
  RequestPasswordResetDto,
  TokenPasswordDto,
} from './dto/auth-password.dto.js';
import { TokenDto } from './dto/auth-token.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(RateLimitGuard)
  @RateLimit(AUTH_RATE_LIMITS.login.limit, AUTH_RATE_LIMITS.login.windowMs)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('resolve-setup-token')
  async resolveSetupToken(@Body() body: TokenDto) {
    return this.authService.resolveSetupToken(body.token);
  }

  @Post('setup-password')
  async setupPassword(@Body() body: TokenPasswordDto) {
    return this.authService.setupPassword(body.token, body.password);
  }

  @Post('request-password-reset')
  @UseGuards(RateLimitGuard)
  @RateLimit(
    AUTH_RATE_LIMITS.requestPasswordReset.limit,
    AUTH_RATE_LIMITS.requestPasswordReset.windowMs,
  )
  async requestPasswordReset(@Body() body: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('resolve-reset-token')
  @UseGuards(RateLimitGuard)
  @RateLimit(
    AUTH_RATE_LIMITS.resolveResetToken.limit,
    AUTH_RATE_LIMITS.resolveResetToken.windowMs,
  )
  async resolveResetToken(@Body() body: TokenDto) {
    return this.authService.resolveResetToken(body.token);
  }

  @Post('reset-password')
  @UseGuards(RateLimitGuard)
  @RateLimit(
    AUTH_RATE_LIMITS.resetPassword.limit,
    AUTH_RATE_LIMITS.resetPassword.windowMs,
  )
  async resetPassword(@Body() body: TokenPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Body() body: ChangePasswordDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.authService.changePassword(
      req.user.userId,
      body.currentPassword,
      body.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout() {
    return { ok: true };
  }
}

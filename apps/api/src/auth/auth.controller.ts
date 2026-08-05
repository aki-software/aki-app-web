import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { RateLimit } from '../common/decorators/rate-limit.decorator.js';
import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';
import { AUTH_RATE_LIMITS } from './auth.constants.js';
import type { AuthenticatedRequest } from './auth.types.js';
import { AuthLoginService } from './services/auth-login.service.js';
import { AuthPasswordFlowService } from './services/auth-password-flow.service.js';
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
  constructor(
    private readonly authLoginService: AuthLoginService,
    private readonly authPasswordFlowService: AuthPasswordFlowService,
  ) {}

  @Post('login')
  @UseGuards(RateLimitGuard)
  @RateLimit(AUTH_RATE_LIMITS.login.limit, AUTH_RATE_LIMITS.login.windowMs)
  async login(@Body() loginDto: LoginDto) {
    return this.authLoginService.login(loginDto);
  }

  @Post('resolve-setup-token')
  async resolveSetupToken(@Body() body: TokenDto) {
    return this.authPasswordFlowService.resolveSetupToken(body.token);
  }

  @Post('setup-password')
  async setupPassword(@Body() body: TokenPasswordDto) {
    return this.authPasswordFlowService.setupPassword(body.token, body.password);
  }

  @Post('request-password-reset')
  @UseGuards(RateLimitGuard)
  @RateLimit(
    AUTH_RATE_LIMITS.requestPasswordReset.limit,
    AUTH_RATE_LIMITS.requestPasswordReset.windowMs,
  )
  async requestPasswordReset(@Body() body: RequestPasswordResetDto) {
    return this.authPasswordFlowService.requestPasswordReset(body.email);
  }

  @Post('resolve-reset-token')
  @UseGuards(RateLimitGuard)
  @RateLimit(
    AUTH_RATE_LIMITS.resolveResetToken.limit,
    AUTH_RATE_LIMITS.resolveResetToken.windowMs,
  )
  async resolveResetToken(@Body() body: TokenDto) {
    return this.authPasswordFlowService.resolveResetToken(body.token);
  }

  @Post('reset-password')
  @UseGuards(RateLimitGuard)
  @RateLimit(
    AUTH_RATE_LIMITS.resetPassword.limit,
    AUTH_RATE_LIMITS.resetPassword.windowMs,
  )
  async resetPassword(@Body() body: TokenPasswordDto) {
    return this.authPasswordFlowService.resetPassword(body.token, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Body() body: ChangePasswordDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req?.user?.userId;
    const token = req.headers.authorization?.replace('Bearer ', '');
    return await this.authPasswordFlowService.changePassword(
      userId,
      body.currentPassword,
      body.newPassword,
      token,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout() {
    return { ok: true };
  }
}

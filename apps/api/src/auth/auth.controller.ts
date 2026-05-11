import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResolveSetupTokenDto } from './dto/resolve-setup-token.dto';
import { SetupPasswordDto } from './dto/setup-password.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResolveResetTokenDto } from './dto/resolve-reset-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(RateLimitGuard)
  @RateLimit(10, 60_000)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('resolve-setup-token')
  async resolveSetupToken(@Body() body: ResolveSetupTokenDto) {
    return this.authService.resolveSetupToken(body.token);
  }

  @Post('setup-password')
  async setupPassword(@Body() body: SetupPasswordDto) {
    return this.authService.setupPassword(body.token, body.password);
  }

  @Post('request-password-reset')
  @UseGuards(RateLimitGuard)
  @RateLimit(5, 60_000)
  async requestPasswordReset(@Body() body: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('resolve-reset-token')
  @UseGuards(RateLimitGuard)
  @RateLimit(20, 60_000)
  async resolveResetToken(@Body() body: ResolveResetTokenDto) {
    return this.authService.resolveResetToken(body.token);
  }

  @Post('reset-password')
  @UseGuards(RateLimitGuard)
  @RateLimit(5, 60_000)
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Body() body: ChangePasswordDto,
    @Req() req?: Request & { user?: { userId?: string } },
  ) {
    const userId = req?.user?.userId;
    return await this.authService.changePassword(
      userId,
      body.currentPassword,
      body.newPassword,
    );
  }
}

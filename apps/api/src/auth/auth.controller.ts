import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResolveSetupTokenDto } from './dto/resolve-setup-token.dto';
import { SetupPasswordDto } from './dto/setup-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
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

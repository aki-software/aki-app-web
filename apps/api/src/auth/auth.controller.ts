import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ResolveSetupTokenDto } from './dto/resolve-setup-token.dto';
import { SetupPasswordDto } from './dto/setup-password.dto';

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
}

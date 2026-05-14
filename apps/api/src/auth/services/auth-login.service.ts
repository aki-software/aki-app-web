import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { AUTH_ERROR_MESSAGES } from '../auth.constants';
import { LoginDto } from '../dto/auth-login.dto';
import type { AuthLoginResponse } from '../auth.types';
import { AuthResponseFactory } from '../factories/auth-response.factory';

@Injectable()
export class AuthLoginService {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly authResponseFactory: AuthResponseFactory,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthLoginResponse> {
    const adminEmail = this.configService.get<string>('ADMIN_USER');
    const adminPass = this.configService.get<string>('ADMIN_PASS');

    if (
      adminEmail &&
      adminPass &&
      loginDto.email === adminEmail &&
      loginDto.password === adminPass
    ) {
      return this.authResponseFactory.buildAdminLoginResponse(adminEmail);
    }

    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidCredentials);
    }

    if (!this.usersService.hasPasswordConfigured(user)) {
      throw new UnauthorizedException(
        AUTH_ERROR_MESSAGES.passwordNotConfigured,
      );
    }

    const validPassword = this.usersService.verifyPassword(
      loginDto.password,
      user.passwordHash,
    );
    if (!validPassword) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidCredentials);
    }

    return this.authResponseFactory.buildUserLoginResponse(user);
  }
}

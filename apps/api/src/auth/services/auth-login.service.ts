import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service.js';
import { CryptoService } from '../../common/services/crypto.service.js';
import { AUTH_ERROR_MESSAGES } from '../auth.constants.js';
import { LoginDto } from '../dto/auth-login.dto.js';
import type { AuthLoginResponse } from '@akit/contracts';
import { AuthResponseFactory } from '../factories/auth-response.factory.js';

@Injectable()
export class AuthLoginService {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly cryptoService: CryptoService,
    private readonly authResponseFactory: AuthResponseFactory,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthLoginResponse> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidCredentials);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.accountLocked);
    }

    if (!this.usersService.hasPasswordConfigured(user)) {
      throw new UnauthorizedException(
        AUTH_ERROR_MESSAGES.passwordNotConfigured,
      );
    }

    const validPassword = await this.cryptoService.verify(
      loginDto.password,
      user.passwordHash,
    );

    if (!validPassword) {
      user.failedLoginAttempts += 1;
      const isNowLocked = user.failedLoginAttempts >= 5;
      if (isNowLocked) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      }
      await this.usersService.save(user);

      if (isNowLocked) {
        throw new UnauthorizedException(AUTH_ERROR_MESSAGES.accountLocked);
      }
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidCredentials);
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      await this.usersService.save(user);
    }

    return this.authResponseFactory.buildUserLoginResponse(user);
  }
}

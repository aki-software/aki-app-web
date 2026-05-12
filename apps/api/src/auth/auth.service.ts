import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/auth-login.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { PasswordResetNotifierService } from '../common/notifications/password-reset-notifier.service';
import {
  AUTH_ADMIN,
  AUTH_ERROR_MESSAGES,
  AUTH_INFO_MESSAGES,
} from './auth.constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly passwordResetNotifier: PasswordResetNotifierService,
  ) {}

  async login(loginDto: LoginDto) {
    const adminEmail = this.configService.get<string>('ADMIN_USER');
    const adminPass = this.configService.get<string>('ADMIN_PASS');

    if (
      adminEmail &&
      adminPass &&
      loginDto.email === adminEmail &&
      loginDto.password === adminPass
    ) {
      return this.buildAdminLoginResponse(adminEmail);
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

    return this.buildUserLoginResponse(user);
  }

  async resolveSetupToken(token: string) {
    const user = await this.resolveUserByToken(
      token,
      (value) => this.usersService.findByPasswordSetupToken(value),
      'passwordSetupExpiresAt',
    );

    return {
      user: this.buildUserSummary(user),
      expiresAt: user.passwordSetupExpiresAt!,
    };
  }

  async setupPassword(token: string, password: string) {
    const user = await this.usersService.setupPassword(token, password);
    return this.buildUserLoginResponse(user);
  }

  async requestPasswordReset(email: string) {
    const user = await this.usersService.requestPasswordReset(email);
    if (user?.passwordResetToken) {
      const resetLink = this.usersService.buildPasswordResetLink(
        user.passwordResetToken,
      );
      await this.passwordResetNotifier.notifyPasswordReset(
        user.email,
        user.name,
        resetLink,
      );
    }

    return {
      ok: true,
      message: AUTH_INFO_MESSAGES.passwordReset,
    };
  }

  async resolveResetToken(token: string) {
    const user = await this.resolveUserByToken(
      token,
      (value) => this.usersService.findByPasswordResetToken(value),
      'passwordResetExpiresAt',
    );

    return {
      user: this.buildUserSummary(user),
      expiresAt: user.passwordResetExpiresAt!,
    };
  }

  async resetPassword(token: string, password: string) {
    const user = await this.usersService.resetPassword(token, password);
    return this.buildUserLoginResponse(user);
  }

  async changePassword(
    userId: string | null | undefined,
    currentPassword: string,
    newPassword: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidSession);
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException(AUTH_ERROR_MESSAGES.samePassword);
    }

    try {
      await this.usersService.changePassword(
        userId,
        currentPassword,
        newPassword,
      );
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : AUTH_ERROR_MESSAGES.unauthorized;
      if (
        message === AUTH_ERROR_MESSAGES.passwordNotConfigured ||
        message === AUTH_ERROR_MESSAGES.incorrectCurrentPassword
      ) {
        throw new UnauthorizedException(message);
      }

      if (message === AUTH_ERROR_MESSAGES.userNotFound) {
        throw new BadRequestException(message);
      }

      throw new BadRequestException(message);
    }
  }

  private buildAdminLoginResponse(adminEmail: string) {
    return this.buildLoginResponse(
      {
        id: AUTH_ADMIN.id,
        email: adminEmail,
        name: AUTH_ADMIN.name,
        role: UserRole.ADMIN,
        institutionId: AUTH_ADMIN.institutionId,
      },
      {
        email: adminEmail,
        sub: AUTH_ADMIN.id,
        role: UserRole.ADMIN,
        institutionId: AUTH_ADMIN.institutionId,
      },
    );
  }

  private buildUserLoginResponse(user: User) {
    return this.buildLoginResponse(this.buildUserSummary(user), {
      email: user.email,
      sub: user.id,
      role: user.role,
      institutionId: user.institutionId ?? null,
    });
  }

  private async resolveUserByToken(
    token: string,
    finder: (value: string) => Promise<User | null>,
    expiresAtField: 'passwordSetupExpiresAt' | 'passwordResetExpiresAt',
  ): Promise<User> {
    const user = await finder(token);
    const expiresAt = user?.[expiresAtField];
    if (!user || !expiresAt) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidToken);
    }

    if (expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.expiredToken);
    }

    return user;
  }

  private buildUserSummary(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      institutionId: user.institutionId ?? null,
      institutionName: user.institution?.name ?? null,
    };
  }

  private buildLoginResponse(
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      institutionId: string | null;
    },
    payload: {
      email: string;
      sub: string;
      role: UserRole;
      institutionId: string | null;
    },
  ) {
    return {
      user,
      tokens: {
        accessToken: this.jwtService.sign(payload),
      },
    };
  }
}

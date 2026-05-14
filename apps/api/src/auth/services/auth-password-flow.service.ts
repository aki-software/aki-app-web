import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PasswordResetNotifierService } from '../../common/notifications/password-reset-notifier.service.js';
import { User } from '../../users/entities/user.entity.js';
import { UsersService } from '../../users/users.service.js';
import { CryptoService } from '../../common/services/crypto.service.js';
import { AUTH_ERROR_MESSAGES, AUTH_INFO_MESSAGES } from '../auth.constants.js';
import type {
  AuthInfoResponse,
  AuthLoginResponse,
  AuthOkResponse,
  AuthTokenResolutionResponse,
} from '../auth.types.js';
import { AuthResponseFactory } from '../factories/auth-response.factory.js';

@Injectable()
export class AuthPasswordFlowService {
  constructor(
    private readonly usersService: UsersService,
    private readonly cryptoService: CryptoService,
    private readonly passwordResetNotifier: PasswordResetNotifierService,
    private readonly authResponseFactory: AuthResponseFactory,
  ) {}

  async resolveSetupToken(token: string): Promise<AuthTokenResolutionResponse> {
    const user = await this.resolveUserByToken(
      token,
      (value) => this.usersService.findByPasswordSetupToken(value),
      'passwordSetupExpiresAt',
    );

    return {
      user: this.authResponseFactory.buildUserSummary(user),
      expiresAt: user.passwordSetupExpiresAt!,
    };
  }

  async setupPassword(
    token: string,
    password: string,
  ): Promise<AuthLoginResponse> {
    const user = await this.usersService.findByPasswordSetupToken(token);
    if (!user) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidToken);
    }

    if (
      !user.passwordSetupExpiresAt ||
      user.passwordSetupExpiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.expiredToken);
    }

    const updatedUser = await this.usersService.register({
      ...user,
      passwordHash: this.cryptoService.hash(password),
      passwordSetAt: new Date(),
      passwordSetupToken: null,
      passwordSetupExpiresAt: null,
    });

    return this.authResponseFactory.buildUserLoginResponse(updatedUser);
  }

  async requestPasswordReset(email: string): Promise<AuthInfoResponse> {
    const user = await this.usersService.findByEmail(email.trim());
    if (!user || !this.usersService.hasPasswordConfigured(user)) {
      return { ok: true, message: AUTH_INFO_MESSAGES.passwordReset };
    }

    const resetToken = this.cryptoService.generateToken(24);
    const resetExpiresAt = new Date();
    resetExpiresAt.setHours(resetExpiresAt.getHours() + 2); // 2h reset TTL

    const updatedUser = await this.usersService.register({
      ...user,
      passwordResetToken: resetToken,
      passwordResetExpiresAt: resetExpiresAt,
    });

    const resetLink = this.usersService.buildPasswordResetLink(resetToken);
    await this.passwordResetNotifier.notifyPasswordReset(
      updatedUser.email,
      updatedUser.name,
      resetLink,
    );

    return {
      ok: true,
      message: AUTH_INFO_MESSAGES.passwordReset,
    };
  }

  async resolveResetToken(token: string): Promise<AuthTokenResolutionResponse> {
    const user = await this.resolveUserByToken(
      token,
      (value) => this.usersService.findByPasswordResetToken(value),
      'passwordResetExpiresAt',
    );

    return {
      user: this.authResponseFactory.buildUserSummary(user),
      expiresAt: user.passwordResetExpiresAt!,
    };
  }

  async resetPassword(
    token: string,
    password: string,
  ): Promise<AuthLoginResponse> {
    const user = await this.usersService.findByPasswordResetToken(token);
    if (!user) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidToken);
    }

    if (
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.expiredToken);
    }

    const updatedUser = await this.usersService.register({
      ...user,
      passwordHash: this.cryptoService.hash(password),
      passwordSetAt: new Date(),
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    });

    return this.authResponseFactory.buildUserLoginResponse(updatedUser);
  }

  async changePassword(
    userId: string | null | undefined,
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthOkResponse> {
    if (!userId) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidSession);
    }

    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new BadRequestException(AUTH_ERROR_MESSAGES.userNotFound);
    }

    if (!this.usersService.hasPasswordConfigured(user)) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.passwordNotConfigured);
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException(AUTH_ERROR_MESSAGES.samePassword);
    }

    const valid = this.cryptoService.verify(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.incorrectCurrentPassword);
    }

    await this.usersService.register({
      ...user,
      passwordHash: this.cryptoService.hash(newPassword),
      passwordSetAt: new Date(),
    });

    return { ok: true };
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
}

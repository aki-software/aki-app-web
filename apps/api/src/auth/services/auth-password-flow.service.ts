import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PasswordResetNotifierService } from '../../common/notifications/password-reset-notifier.service';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { AUTH_ERROR_MESSAGES, AUTH_INFO_MESSAGES } from '../auth.constants';
import type {
  AuthInfoResponse,
  AuthLoginResponse,
  AuthOkResponse,
  AuthTokenResolutionResponse,
} from '../auth.types';
import { AuthResponseFactory } from '../factories/auth-response.factory';

@Injectable()
export class AuthPasswordFlowService {
  constructor(
    private readonly usersService: UsersService,
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
    const user = await this.usersService.setupPassword(token, password);
    return this.authResponseFactory.buildUserLoginResponse(user);
  }

  async requestPasswordReset(email: string): Promise<AuthInfoResponse> {
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
    const user = await this.usersService.resetPassword(token, password);
    return this.authResponseFactory.buildUserLoginResponse(user);
  }

  async changePassword(
    userId: string | null | undefined,
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthOkResponse> {
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
      this.rethrowChangePasswordError(error);
    }
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

  private rethrowChangePasswordError(error: unknown): never {
    const message =
      error instanceof Error ? error.message : AUTH_ERROR_MESSAGES.unauthorized;

    switch (message) {
      case AUTH_ERROR_MESSAGES.passwordNotConfigured:
      case AUTH_ERROR_MESSAGES.incorrectCurrentPassword:
        throw new UnauthorizedException(message);
      case AUTH_ERROR_MESSAGES.userNotFound:
        throw new BadRequestException(message);
      default:
        throw new BadRequestException(message);
    }
  }
}

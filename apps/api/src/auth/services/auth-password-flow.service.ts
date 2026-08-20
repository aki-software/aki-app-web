import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AccountActivationRequestedEvent,
  PasswordResetRequestedEvent,
} from '../../events/domain-events.js';
import { User } from '../../users/entities/user.entity.js';
import { UsersService } from '../../users/users.service.js';
import { CryptoService } from '../../common/services/crypto.service.js';
import { AUTH_ERROR_MESSAGES, AUTH_INFO_MESSAGES } from '../auth.constants.js';
import type {
  AuthInfoResponse,
  AuthLoginResponse,
  AuthOkResponse,
  AuthTokenResolutionResponse,
} from '@akit/contracts';
import { AuthResponseFactory } from '../factories/auth-response.factory.js';
import { AuthTokenService } from './auth-token.service.js';

@Injectable()
export class AuthPasswordFlowService {
  constructor(
    private readonly usersService: UsersService,
    private readonly cryptoService: CryptoService,
    private readonly eventEmitter: EventEmitter2,
    private readonly authResponseFactory: AuthResponseFactory,
    private readonly authTokenService: AuthTokenService,
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
      passwordHash: await this.cryptoService.hash(password),
      passwordSetAt: new Date(),
      passwordSetupToken: null,
      passwordSetupExpiresAt: null,
    });

    // Invalidate any existing tokens for this user
    await this.authTokenService.invalidateToken(token);

    return this.authResponseFactory.buildUserLoginResponse(updatedUser);
  }

  async requestPasswordReset(email: string): Promise<AuthInfoResponse> {
    const user = await this.usersService.findByEmail(email.trim());
    if (!user) {
      return { ok: true, message: AUTH_INFO_MESSAGES.passwordReset };
    }

    if (!this.usersService.hasPasswordConfigured(user)) {
      if (user.email && !user.email.endsWith('@akit.local')) {
        const passwordSetupToken = this.cryptoService.generateToken(24);
        const passwordSetupExpiresAt = new Date();
        passwordSetupExpiresAt.setDate(passwordSetupExpiresAt.getDate() + 1);

        const updatedUser = await this.usersService.register({
          ...user,
          passwordSetupToken,
          passwordSetupExpiresAt,
        });

        const activationLink =
          this.usersService.buildPasswordSetupLink(passwordSetupToken);
        await this.eventEmitter.emitAsync(
          'account.activation.requested',
          new AccountActivationRequestedEvent(
            updatedUser.email,
            updatedUser.name,
            activationLink,
            updatedUser.institution?.name ?? null,
          ),
        );
      }
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
    await this.eventEmitter.emitAsync(
      'password.reset.requested',
      new PasswordResetRequestedEvent(
        updatedUser.email,
        updatedUser.name,
        resetLink,
      ),
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
      passwordHash: await this.cryptoService.hash(password),
      passwordSetAt: new Date(),
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    });

    // Invalidate any existing tokens for this user
    await this.authTokenService.invalidateToken(token);

    return this.authResponseFactory.buildUserLoginResponse(updatedUser);
  }

  async changePassword(
    userId: string | null | undefined,
    currentPassword: string,
    newPassword: string,
    token?: string,
  ): Promise<AuthOkResponse> {
    if (!userId) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidSession);
    }

    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new BadRequestException(AUTH_ERROR_MESSAGES.userNotFound);
    }

    if (!this.usersService.hasPasswordConfigured(user)) {
      throw new UnauthorizedException(
        AUTH_ERROR_MESSAGES.passwordNotConfigured,
      );
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException(AUTH_ERROR_MESSAGES.samePassword);
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    const valid = await this.cryptoService.verify(
      currentPassword,
      user.passwordHash,
    );
    if (!valid) {
      throw new UnauthorizedException(
        AUTH_ERROR_MESSAGES.incorrectCurrentPassword,
      );
    }

    await this.usersService.register({
      ...user,
      passwordHash: await this.cryptoService.hash(newPassword),
      passwordSetAt: new Date(),
    });

    // Invalidate any existing tokens for this user.
    // Prefer the real JWT when the controller passed it through; fall back to
    // userId for backward compatibility (legacy callers / tests).
    await this.authTokenService.invalidateToken(token ?? userId ?? '');

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

import { Injectable } from '@nestjs/common';
import { LoginDto } from './dto/auth-login.dto.js';
import type {
  AuthInfoResponse,
  AuthLoginResponse,
  AuthOkResponse,
  AuthTokenResolutionResponse,
} from '@akit/contracts';
import { AuthLoginService } from './services/auth-login.service.js';
import { AuthPasswordFlowService } from './services/auth-password-flow.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly authLoginService: AuthLoginService,
    private readonly authPasswordFlowService: AuthPasswordFlowService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthLoginResponse> {
    return this.authLoginService.login(loginDto);
  }

  async resolveSetupToken(token: string): Promise<AuthTokenResolutionResponse> {
    return this.authPasswordFlowService.resolveSetupToken(token);
  }

  async setupPassword(
    token: string,
    password: string,
  ): Promise<AuthLoginResponse> {
    return this.authPasswordFlowService.setupPassword(token, password);
  }

  async requestPasswordReset(email: string): Promise<AuthInfoResponse> {
    return this.authPasswordFlowService.requestPasswordReset(email);
  }

  async resolveResetToken(token: string): Promise<AuthTokenResolutionResponse> {
    return this.authPasswordFlowService.resolveResetToken(token);
  }

  async resetPassword(
    token: string,
    password: string,
  ): Promise<AuthLoginResponse> {
    return this.authPasswordFlowService.resetPassword(token, password);
  }

  async changePassword(
    userId: string | null | undefined,
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthOkResponse> {
    return this.authPasswordFlowService.changePassword(
      userId,
      currentPassword,
      newPassword,
    );
  }
}

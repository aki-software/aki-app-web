import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import type { QueueAdapter } from '../common/adapters/queue.adapter';
import { QUEUE_ADAPTER } from '../common/constants/adapters.constants';
import { JobNames, SendEmailJobPayload } from '../common/jobs';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    @Inject(QUEUE_ADAPTER)
    private readonly queueAdapter: QueueAdapter,
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
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!this.usersService.hasPasswordConfigured(user)) {
      throw new UnauthorizedException(
        'La cuenta todavía no activó su contraseña',
      );
    }

    const validPassword = this.usersService.verifyPassword(
      loginDto.password,
      user.passwordHash,
    );
    if (!validPassword) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.buildUserLoginResponse(user);
  }

  async resolveSetupToken(token: string) {
    const user = await this.usersService.findByPasswordSetupToken(token);
    if (!user || !user.passwordSetupExpiresAt) {
      throw new UnauthorizedException('Token inválido');
    }

    if (user.passwordSetupExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Token expirado');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        institutionId: user.institutionId,
        institutionName: user.institution?.name ?? null,
      },
      expiresAt: user.passwordSetupExpiresAt,
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
      if (this.queueAdapter.isConfigured()) {
        await this.enqueuePasswordResetEmail(user.email, user.name, resetLink);
      } else {
        await this.mailService.sendPasswordReset(user.email, user.name, resetLink);
      }
    }

    return {
      ok: true,
      message:
        'Si el email existe en la plataforma, vas a recibir instrucciones para restablecer tu contraseña.',
    };
  }

  private async enqueuePasswordResetEmail(
    email: string,
    name: string,
    resetLink: string,
  ): Promise<boolean> {
    const payload: SendEmailJobPayload = {
      jobId: `password-reset-email-${email}-${Date.now()}`,
      attempts: 3,
      backoffMs: 60_000,
      backoffType: 'exponential',
      timeoutMs: 20_000,
      concurrencyKey: 'email',
      concurrencyLimit: 10,
      template: 'password-reset',
      payload: {
        name,
        resetLink,
      },
      meta: {
        to: email,
        subject: 'Restablecé tu contraseña de A.kit',
      },
    };

    await this.queueAdapter.enqueue(JobNames.SendEmail, payload, {
      attempts: payload.attempts,
      backoffMs: payload.backoffMs,
      backoffType: payload.backoffType,
      timeoutMs: payload.timeoutMs,
      concurrencyKey: payload.concurrencyKey,
      concurrencyLimit: payload.concurrencyLimit,
    });
    return true;
  }

  async resolveResetToken(token: string) {
    const user = await this.usersService.findByPasswordResetToken(token);
    if (!user || !user.passwordResetExpiresAt) {
      throw new UnauthorizedException('Token inválido');
    }

    if (user.passwordResetExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Token expirado');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        institutionId: user.institutionId,
        institutionName: user.institution?.name ?? null,
      },
      expiresAt: user.passwordResetExpiresAt,
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
      throw new UnauthorizedException('Sesión inválida');
    }

    if (currentPassword === newPassword) {
      throw new UnauthorizedException(
        'La nueva contraseña debe ser distinta a la actual',
      );
    }

    try {
      await this.usersService.changePassword(
        userId,
        currentPassword,
        newPassword,
      );
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No autorizado';
      throw new UnauthorizedException(message);
    }
  }

  private buildAdminLoginResponse(adminEmail: string) {
    const payload = {
      email: adminEmail,
      sub: '1',
      role: UserRole.ADMIN,
      institutionId: null,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      user: {
        id: '1',
        email: adminEmail,
        name: 'Administrador',
        role: UserRole.ADMIN,
        institutionId: null,
      },
      tokens: {
        accessToken,
      },
    };
  }

  private buildUserLoginResponse(user: User) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      institutionId: user.institutionId ?? null,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        institutionId: user.institutionId ?? null,
      },
      tokens: {
        accessToken,
      },
    };
  }
}

import { Injectable } from '@nestjs/common';
import { AUTH_ADMIN } from '../auth.constants';
import type { AuthLoginResponse, AuthUserSummary } from '../auth.types';
import { User, UserRole } from '../../users/entities/user.entity';
import { AuthTokenService } from '../services/auth-token.service';

@Injectable()
export class AuthResponseFactory {
  constructor(private readonly authTokenService: AuthTokenService) {}

  buildAdminLoginResponse(adminEmail: string): AuthLoginResponse {
    return this.buildLoginResponse(
      {
        id: AUTH_ADMIN.id,
        email: adminEmail,
        name: AUTH_ADMIN.name,
        role: UserRole.ADMIN,
        institutionId: AUTH_ADMIN.institutionId,
        institutionName: null,
      },
      {
        email: adminEmail,
        sub: AUTH_ADMIN.id,
        role: UserRole.ADMIN,
        institutionId: AUTH_ADMIN.institutionId,
      },
    );
  }

  buildUserLoginResponse(user: User): AuthLoginResponse {
    return this.buildLoginResponse(this.buildUserSummary(user), {
      email: user.email,
      sub: user.id,
      role: user.role,
      institutionId: user.institutionId ?? null,
    });
  }

  buildUserSummary(user: User): AuthUserSummary {
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
    user: AuthUserSummary,
    payload: {
      email: string;
      sub: string;
      role: UserRole;
      institutionId: string | null;
    },
  ): AuthLoginResponse {
    return {
      user,
      tokens: {
        accessToken: this.authTokenService.signAccessToken(payload),
      },
    };
  }
}

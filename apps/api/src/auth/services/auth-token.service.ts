import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../../users/entities/user.entity.js';

type AuthAccessTokenPayload = {
  email: string;
  sub: string;
  role: UserRole;
  institutionId: string | null;
};

@Injectable()
export class AuthTokenService {
  private readonly invalidatedTokens = new Map<string, number>();
  private readonly TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(payload: AuthAccessTokenPayload): string {
    return this.jwtService.sign(payload);
  }

  invalidateToken(token: string): void {
    this.invalidatedTokens.set(token, Date.now() + this.TOKEN_TTL_MS);
    this.cleanupExpiredTokens();
  }

  isTokenInvalidated(token: string): boolean {
    const expiry = this.invalidatedTokens.get(token);
    if (!expiry) return false;
    if (Date.now() > expiry) {
      this.invalidatedTokens.delete(token);
      return false;
    }
    return true;
  }

  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, expiry] of this.invalidatedTokens) {
      if (now > expiry) {
        this.invalidatedTokens.delete(token);
      }
    }
  }
}

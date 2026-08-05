import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../../users/entities/user.entity.js';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

type AuthAccessTokenPayload = {
  email: string;
  sub: string;
  role: UserRole;
  institutionId: string | null;
};

@Injectable()
export class AuthTokenService {
  private readonly redis: Redis;
  private readonly TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
  }

  signAccessToken(payload: AuthAccessTokenPayload): string {
    return this.jwtService.sign(payload);
  }

  async invalidateToken(token: string): Promise<void> {
    await this.redis.set(`blacklist:${token}`, '1', 'PX', this.TOKEN_TTL_MS);
  }

  async isTokenInvalidated(token: string): Promise<boolean> {
    const result = await this.redis.get(`blacklist:${token}`);
    return result !== null;
  }
}

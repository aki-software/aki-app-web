import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../../users/entities/user.entity';

type AuthAccessTokenPayload = {
  email: string;
  sub: string;
  role: UserRole;
  institutionId: string | null;
};

@Injectable()
export class AuthTokenService {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(payload: AuthAccessTokenPayload): string {
    return this.jwtService.sign(payload);
  }
}

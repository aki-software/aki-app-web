import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AUTH_JWT_MESSAGES } from '../auth.constants.js';
import type { FirebaseJwtPayload } from '@akit/contracts';

@Injectable()
export class FirebaseClaimsValidatorService {
  private readonly firebaseProjectId?: string;

  constructor(private readonly configService: ConfigService) {
    this.firebaseProjectId =
      configService.get<string>('FIREBASE_PROJECT_ID')?.trim() || undefined;
  }

  assertFirebaseClaims(payload: FirebaseJwtPayload) {
    const expectedProjectId =
      this.firebaseProjectId || this.extractProjectIdFromIss(payload.iss);
    if (!expectedProjectId) {
      throw new UnauthorizedException(
        AUTH_JWT_MESSAGES.firebaseProjectIdMissing,
      );
    }

    const expectedIssuer = `https://securetoken.google.com/${expectedProjectId}`;
    if (payload.iss !== expectedIssuer) {
      throw new UnauthorizedException(AUTH_JWT_MESSAGES.firebaseIssuerInvalid);
    }

    if (payload.aud !== expectedProjectId) {
      throw new UnauthorizedException(
        AUTH_JWT_MESSAGES.firebaseAudienceInvalid,
      );
    }
  }

  private extractProjectIdFromIss(iss?: string): string | undefined {
    if (!iss) return undefined;
    const parts = iss.split('/');
    return parts[parts.length - 1] || undefined;
  }
}

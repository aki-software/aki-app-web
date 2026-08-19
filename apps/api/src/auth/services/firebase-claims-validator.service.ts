import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AUTH_JWT_MESSAGES } from '../auth.constants.js';
import type { FirebaseJwtPayload } from '@akit/contracts';

@Injectable()
export class FirebaseClaimsValidatorService {
  private readonly firebaseProjectId: string;

  constructor(private readonly configService: ConfigService) {
    const firebaseProjectId = configService
      .get<string>('FIREBASE_PROJECT_ID')
      ?.trim();
    if (!firebaseProjectId) {
      throw new Error(AUTH_JWT_MESSAGES.firebaseProjectIdMissing);
    }
    this.firebaseProjectId = firebaseProjectId;
  }

  assertFirebaseClaims(payload: FirebaseJwtPayload) {
    const expectedIssuer = `https://securetoken.google.com/${this.firebaseProjectId}`;
    if (payload.iss !== expectedIssuer) {
      throw new UnauthorizedException(AUTH_JWT_MESSAGES.firebaseIssuerInvalid);
    }

    if (payload.aud !== this.firebaseProjectId) {
      throw new UnauthorizedException(
        AUTH_JWT_MESSAGES.firebaseAudienceInvalid,
      );
    }
  }
}

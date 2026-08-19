import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AUTH_JWT_MESSAGES, FIREBASE_CERTS_URL } from '../auth.constants.js';
import type { FirebaseJwtPayload } from '@akit/contracts';
import { requireFirebaseProjectId } from '../config/firebase-project-id.js';

@Injectable()
export class FirebaseTokenService {
  private readonly logger = new Logger(FirebaseTokenService.name);
  private firebaseCertCache: {
    expiresAt: number;
    certsByKid: Record<string, string>;
  } | null = null;
  private readonly firebaseProjectId: string;

  constructor(private readonly configService: ConfigService) {
    this.firebaseProjectId = requireFirebaseProjectId({
      FIREBASE_PROJECT_ID: configService.get<string>('FIREBASE_PROJECT_ID'),
    });
  }

  async getCertByKid(kid: string): Promise<string> {
    const now = Date.now();
    if (this.firebaseCertCache && this.firebaseCertCache.expiresAt > now) {
      const cachedCert = this.firebaseCertCache.certsByKid[kid];
      if (cachedCert) return cachedCert;
    }

    const response = await fetch(FIREBASE_CERTS_URL);
    if (!response.ok) {
      throw new UnauthorizedException(
        `${AUTH_JWT_MESSAGES.firebaseCertFetchFailed} (${response.status})`,
      );
    }

    const certsByKid = (await response.json()) as Record<string, string>;
    const cacheControl = response.headers.get('cache-control') || '';
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
    const maxAgeSeconds = maxAgeMatch
      ? Number.parseInt(maxAgeMatch[1], 10)
      : 300;

    this.firebaseCertCache = {
      certsByKid,
      expiresAt: now + maxAgeSeconds * 1000,
    };

    const cert = certsByKid[kid];
    if (!cert) {
      this.logger.warn(`Firebase cert kid no encontrado: ${kid}`);
      throw new UnauthorizedException(AUTH_JWT_MESSAGES.firebaseKidNotFound);
    }

    return cert;
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

  decodeHeader(rawJwtToken: string): Record<string, unknown> {
    const [headerSegment] = rawJwtToken.split('.');
    if (!headerSegment) {
      throw new UnauthorizedException(AUTH_JWT_MESSAGES.jwtHeaderMissing);
    }
    return this.decodeBase64UrlJson(headerSegment);
  }

  decodePayload(rawJwtToken: string): Record<string, unknown> {
    const [, payloadSegment] = rawJwtToken.split('.');
    if (!payloadSegment) {
      throw new UnauthorizedException(AUTH_JWT_MESSAGES.jwtPayloadMissing);
    }
    return this.decodeBase64UrlJson(payloadSegment);
  }

  private decodeBase64UrlJson(segment: string): Record<string, unknown> {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(decoded) as Record<string, unknown>;
  }
}

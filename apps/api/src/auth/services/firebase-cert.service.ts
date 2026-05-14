import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AUTH_JWT_MESSAGES, FIREBASE_CERTS_URL } from '../auth.constants.js';

@Injectable()
export class FirebaseCertService {
  private readonly logger = new Logger(FirebaseCertService.name);
  private firebaseCertCache: {
    expiresAt: number;
    certsByKid: Record<string, string>;
  } | null = null;

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
}

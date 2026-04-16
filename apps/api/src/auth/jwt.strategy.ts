import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  private readonly firebaseProjectId?: string;

  private firebaseCertCache: {
    expiresAt: number;
    certsByKid: Record<string, string>;
  } | null = null;

  constructor(private readonly configService: ConfigService) {
    const firebaseProjectId =
      configService.get<string>('FIREBASE_PROJECT_ID')?.trim() || undefined;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['HS256', 'RS256'],
      secretOrKeyProvider: async (_request, rawJwtToken, done) => {
        try {
          const payload = this.decodeJwtPayload(rawJwtToken);

          if (this.isFirebasePayload(payload)) {
            const header = this.decodeJwtHeader(rawJwtToken);
            const keyId = header.kid;
            if (!keyId) {
              throw new UnauthorizedException('Firebase token sin key id (kid)');
            }

            const cert = await this.getFirebasePublicCertByKid(keyId);
            return done(null, cert);
          }

          const localJwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
          return done(null, localJwtSecret);
        } catch (error) {
          return done(error as Error);
        }
      },
    });

    this.firebaseProjectId = firebaseProjectId;
  }

  async validate(payload: any) {
    if (this.isFirebasePayload(payload)) {
      this.assertFirebaseClaims(payload);

      return {
        userId: payload.user_id ?? payload.sub,
        email: payload.email,
        role: payload.role ?? 'PATIENT',
        institutionId: payload.institutionId ?? null,
      };
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      institutionId: payload.institutionId ?? null,
    };
  }

  private isFirebasePayload(payload: any): boolean {
    return (
      typeof payload?.iss === 'string' &&
      payload.iss.startsWith('https://securetoken.google.com/')
    );
  }

  private assertFirebaseClaims(payload: any) {
    const expectedProjectId = this.firebaseProjectId || this.extractProjectIdFromIss(payload.iss);
    if (!expectedProjectId) {
      throw new UnauthorizedException('No se pudo resolver FIREBASE_PROJECT_ID para validar token');
    }

    const expectedIssuer = `https://securetoken.google.com/${expectedProjectId}`;
    if (payload.iss !== expectedIssuer) {
      throw new UnauthorizedException('Issuer de Firebase inválido');
    }

    if (payload.aud !== expectedProjectId) {
      throw new UnauthorizedException('Audience de Firebase inválido');
    }
  }

  private extractProjectIdFromIss(iss?: string): string | undefined {
    if (!iss) return undefined;
    const parts = iss.split('/');
    return parts[parts.length - 1] || undefined;
  }

  private decodeJwtHeader(rawJwtToken: string): Record<string, any> {
    const [headerSegment] = rawJwtToken.split('.');
    if (!headerSegment) throw new UnauthorizedException('JWT inválido: header ausente');
    return this.decodeBase64UrlJson(headerSegment);
  }

  private decodeJwtPayload(rawJwtToken: string): Record<string, any> {
    const [, payloadSegment] = rawJwtToken.split('.');
    if (!payloadSegment) throw new UnauthorizedException('JWT inválido: payload ausente');
    return this.decodeBase64UrlJson(payloadSegment);
  }

  private decodeBase64UrlJson(segment: string): Record<string, any> {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(decoded);
  }

  private async getFirebasePublicCertByKid(kid: string): Promise<string> {
    const now = Date.now();
    if (this.firebaseCertCache && this.firebaseCertCache.expiresAt > now) {
      const cachedCert = this.firebaseCertCache.certsByKid[kid];
      if (cachedCert) return cachedCert;
    }

    const response = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
    );
    if (!response.ok) {
      throw new UnauthorizedException(
        `No se pudieron obtener certificados Firebase (${response.status})`,
      );
    }

    const certsByKid = (await response.json()) as Record<string, string>;
    const cacheControl = response.headers.get('cache-control') || '';
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
    const maxAgeSeconds = maxAgeMatch ? Number.parseInt(maxAgeMatch[1], 10) : 300;

    this.firebaseCertCache = {
      certsByKid,
      expiresAt: now + maxAgeSeconds * 1000,
    };

    const cert = certsByKid[kid];
    if (!cert) {
      this.logger.warn(`Firebase cert kid no encontrado: ${kid}`);
      throw new UnauthorizedException('kid de Firebase no reconocido');
    }
    return cert;
  }
}

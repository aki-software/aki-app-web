import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AUTH_JWT_MESSAGES } from '../auth.constants.js';
import type { FirebaseJwtPayload, JwtPayload } from '@akit/contracts';
import { AuthUserFactory } from '../factories/auth-user.factory.js';
import { FirebaseClaimsValidatorService } from '../services/firebase-claims-validator.service.js';
import { FirebaseCertService } from '../services/firebase-cert.service.js';
import { JwtTokenDecoderService } from '../services/jwt-token-decoder.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly firebaseCertService: FirebaseCertService,
    private readonly jwtTokenDecoder: JwtTokenDecoderService,
    private readonly firebaseClaimsValidator: FirebaseClaimsValidatorService,
    private readonly authUserFactory: AuthUserFactory,
  ) {
    const secretOrKeyProvider = (
      request: unknown,
      rawJwtToken: string,
      done: (err: Error | null, key?: string) => void,
    ) => this.resolveSigningKey(request, rawJwtToken, done);

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['HS256', 'RS256'],
      secretOrKeyProvider,
    });
  }

  validate(payload: JwtPayload) {
    if (this.isFirebasePayload(payload)) {
      this.firebaseClaimsValidator.assertFirebaseClaims(payload);
      return this.authUserFactory.buildUserFromPayload(payload, true);
    }

    return this.authUserFactory.buildUserFromPayload(payload, false);
  }

  private isFirebasePayload(
    payload: JwtPayload,
  ): payload is FirebaseJwtPayload {
    return (
      typeof payload?.iss === 'string' &&
      payload.iss.startsWith('https://securetoken.google.com/')
    );
  }

  private getFirebasePublicCertByKid(kid: string): Promise<string> {
    return this.firebaseCertService.getCertByKid(kid);
  }

  private resolveSigningKey(
    _request: unknown,
    rawJwtToken: string,
    done: (err: Error | null, key?: string) => void,
  ) {
    try {
      const payload = this.jwtTokenDecoder.decodePayload(
        rawJwtToken,
      ) as unknown as JwtPayload;

      if (!this.isFirebasePayload(payload)) {
        const localJwtSecret =
          this.configService.getOrThrow<string>('JWT_SECRET');
        done(null, localJwtSecret);
        return;
      }

      const header = this.jwtTokenDecoder.decodeHeader(rawJwtToken);
      const keyId = typeof header.kid === 'string' ? header.kid : undefined;
      if (!keyId) {
        throw new UnauthorizedException(AUTH_JWT_MESSAGES.firebaseMissingKid);
      }

      this.getFirebasePublicCertByKid(keyId)
        .then((cert) => done(null, cert))
        .catch((error) => done(error as Error));
    } catch (error) {
      done(error as Error);
    }
  }
}

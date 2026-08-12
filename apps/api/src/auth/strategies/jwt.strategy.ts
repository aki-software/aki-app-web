import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AUTH_JWT_MESSAGES } from '../auth.constants.js';
import type { FirebaseJwtPayload, JwtPayload } from '@akit/contracts';
import { AuthUserFactory } from '../factories/auth-user.factory.js';
import { FirebaseTokenService } from '../services/firebase-token.service.js';
import { UsersService } from '../../users/users.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly firebaseTokenService: FirebaseTokenService,
    private readonly authUserFactory: AuthUserFactory,
    private readonly usersService: UsersService,
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

  async validate(payload: JwtPayload) {
    if (this.isFirebasePayload(payload)) {
      this.firebaseTokenService.assertFirebaseClaims(payload);
      if (payload.email_verified !== true) {
        throw new UnauthorizedException('Firebase email must be verified.');
      }
      const authUser = this.authUserFactory.buildUserFromPayload(payload, true);

      if (!authUser.email) {
        throw new UnauthorizedException('Firebase user is not registered.');
      }
      const internalUser = await this.usersService.findByEmail(authUser.email);
      if (!internalUser) {
        throw new UnauthorizedException('Firebase user is not registered.');
      }
      authUser.userId = internalUser.id;
      authUser.role = internalUser.role;
      authUser.institutionId = internalUser.institutionId;

      return authUser;
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
    return this.firebaseTokenService.getCertByKid(kid);
  }

  private resolveSigningKey(
    _request: unknown,
    rawJwtToken: string,
    done: (err: Error | null, key?: string) => void,
  ) {
    try {
      const payload = this.firebaseTokenService.decodePayload(
        rawJwtToken,
      ) as unknown as JwtPayload;

      if (!this.isFirebasePayload(payload)) {
        const localJwtSecret =
          this.configService.getOrThrow<string>('JWT_SECRET');
        done(null, localJwtSecret);
        return;
      }

      const header = this.firebaseTokenService.decodeHeader(rawJwtToken);
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

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AUTH_JWT_MESSAGES } from '../auth.constants.js';

@Injectable()
export class JwtTokenDecoderService {
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

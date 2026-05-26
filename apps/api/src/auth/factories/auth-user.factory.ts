import { Injectable } from '@nestjs/common';
import type { AuthUserPayload, JwtPayload } from '@akit/contracts';

interface LocalFirebaseJwtPayload {
  role?: string;
  user_id?: string;
}

@Injectable()
export class AuthUserFactory {
  buildUserFromPayload(
    payload: JwtPayload,
    isFirebase: boolean,
  ): AuthUserPayload {
    const firebasePayload = payload as unknown as LocalFirebaseJwtPayload;
    const role = this.normalizeRole(
      isFirebase ? (firebasePayload.role ?? 'PATIENT') : payload.role,
    );

    return {
      userId: isFirebase
        ? (firebasePayload.user_id ?? payload.sub)
        : payload.sub,
      email: payload.email,
      role,
      institutionId: payload.institutionId ?? null,
    };
  }

  private normalizeRole(role?: string): string {
    if (!role) return 'PATIENT';
    return role.toUpperCase();
  }
}

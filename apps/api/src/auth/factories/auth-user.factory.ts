import { Injectable } from '@nestjs/common';
import type {
  AuthUserPayload,
  FirebaseJwtPayload,
  JwtPayload,
} from '@akit/contracts';

@Injectable()
export class AuthUserFactory {
  buildUserFromPayload(
    payload: JwtPayload,
    isFirebase: boolean,
  ): AuthUserPayload {
    const role = this.normalizeRole(
      isFirebase
        ? ((payload as FirebaseJwtPayload).role ?? 'PATIENT')
        : payload.role,
    );

    return {
      userId: isFirebase
        ? ((payload as FirebaseJwtPayload).user_id ?? payload.sub)
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

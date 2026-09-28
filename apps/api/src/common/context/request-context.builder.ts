import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/auth.types.js';
import {
  InstitutionContext,
  PersonalContext,
  RequestContext,
  SYSTEM_CONTEXT,
} from './request-context.js';

const INSTITUTION_ROLES = new Set(['INSTITUTION_ADMIN', 'THERAPIST']);

/**
 * Builds a `RequestContext` from the authenticated user attached to the
 * Express request by `JwtAuthGuard`.
 *
 * Role → Context mapping:
 *   ADMIN              → SystemContext  (unrestricted)
 *   INSTITUTION_ADMIN  → InstitutionContext (scoped to their clinic)
 *   THERAPIST          → InstitutionContext (scoped to their clinic)
 *   PATIENT (Firebase) → PersonalContext or InstitutionContext depending on
 *                        whether they belong to a clinic
 */
@Injectable()
export class RequestContextBuilder {
  private readonly logger = new Logger(RequestContextBuilder.name);

  fromRequest(req: AuthenticatedRequest): RequestContext {
    const user = req.user;

    if (!user?.userId && !user?.id) {
      throw new ForbiddenException('Unauthenticated request');
    }

    const userId = (user.userId ?? user.id)!;
    const role = user.role?.toUpperCase() ?? 'PATIENT';

    // Admins get unrestricted access to all data.
    if (role === 'ADMIN') {
      this.logger.debug(`context=system userId=${userId}`);
      return SYSTEM_CONTEXT;
    }

    const email = user.email ?? null;

    // Institution staff — must have an institutionId in their JWT.
    if (INSTITUTION_ROLES.has(role)) {
      if (!user.institutionId) {
        throw new ForbiddenException(
          `${role} must be assigned to an institution`,
        );
      }
      const ctx: InstitutionContext = {
        kind: 'institution',
        institutionId: user.institutionId,
        userId,
        email,
        rawRole: role,
      };
      this.logger.debug(
        `context=institution userId=${userId} institutionId=${user.institutionId}`,
      );
      return ctx;
    }

    // Patients: if they belong to a clinic use institution scope,
    // otherwise fall back to personal scope (B2C / legacy).
    if (user.institutionId) {
      const ctx: InstitutionContext = {
        kind: 'institution',
        institutionId: user.institutionId,
        userId,
        email,
        rawRole: role,
      };
      this.logger.debug(
        `context=institution(patient) userId=${userId} institutionId=${user.institutionId}`,
      );
      return ctx;
    }

    const ctx: PersonalContext = { kind: 'personal', userId, email, rawRole: role };
    this.logger.debug(`context=personal userId=${userId}`);
    return ctx;
  }
}

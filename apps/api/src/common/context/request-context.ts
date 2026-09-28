/**
 * RequestContext — Discriminated union that encodes the data-access level
 * for every operation in the system.
 *
 * Design decision:
 *   We use an explicit context object instead of reading from AsyncLocalStorage
 *   so that TypeScript enforces the context is passed at every call site.
 *   Background jobs and admin operations use `SystemContext` to opt out of
 *   tenant filtering at the type level, making the intent obvious.
 *
 * Usage in services:
 *   - `isSystemContext(ctx)` → no tenant filter (ADMIN, CronJobs)
 *   - `isInstitutionContext(ctx)` → filter by institutionId
 *   - `isPersonalContext(ctx)` → filter by userId (B2C patients)
 */

/** Used by: ADMIN users, background CronJobs (e.g. ReportReconcilerService). */
export type SystemContext = {
  readonly kind: 'system';
};

/** Used by: INSTITUTION_ADMIN and THERAPIST users scoped to a clinic. */
export type InstitutionContext = {
  readonly kind: 'institution';
  readonly institutionId: string;
  readonly userId: string;
};

/** Used by: PATIENT users who have no institution (B2C or legacy). */
export type PersonalContext = {
  readonly kind: 'personal';
  readonly userId: string;
};

export type RequestContext =
  | SystemContext
  | InstitutionContext
  | PersonalContext;

// ─── Type guards ────────────────────────────────────────────────────────────

export function isSystemContext(ctx: RequestContext): ctx is SystemContext {
  return ctx.kind === 'system';
}

export function isInstitutionContext(
  ctx: RequestContext,
): ctx is InstitutionContext {
  return ctx.kind === 'institution';
}

export function isPersonalContext(ctx: RequestContext): ctx is PersonalContext {
  return ctx.kind === 'personal';
}

// ─── Well-known singletons ───────────────────────────────────────────────────

/** Singleton for use in CronJobs, migrations, and admin scripts. */
export const SYSTEM_CONTEXT: SystemContext = Object.freeze({ kind: 'system' });

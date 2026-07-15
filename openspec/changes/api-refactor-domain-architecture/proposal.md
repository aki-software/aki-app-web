# Proposal: api/refactor/domain-architecture

## Problem Statement

The API has several architecture issues that create duplication, inconsistency, and maintenance burden:

1. **UserRole enum duplication** — Defined in both `@akit/contracts` and `user.entity.ts`. 26/27 files import from the entity file, making the contracts definition dead code.

2. **VoucherScope triple definition** — Three separate definitions with different shapes (`email` field present in contracts but absent in local). Different services import from different sources.

3. **PaymentLockService in-memory** — Uses a `Set<string>` with no TTL, no distribution, no timeout. Only works for single-instance deployments.

4. **Cross-domain entity mutation** — `VoucherRedemptionService` directly manipulates Session entity fields (payment status, institution, therapist).

5. **Auth logic in controllers** — `VouchersController.findOne()` and `UsersController.findAll()` contain authorization/business routing logic.

6. **Infrastructure in domain service** — Google Play API credential parsing and client construction embedded in `PaymentsService`.

## Proposed Solution

### Phase 1: Contracts SSOT (Quick Win)
- Remove `UserRole` from `user.entity.ts`, re-export from `@akit/contracts`
- Consolidate `VoucherScope` to single definition in `@akit/contracts`
- Update all imports to use contracts as source of truth

### Phase 2: Domain Boundaries (Medium)
- Extract `applyVoucherToSession()` from `VoucherRedemptionService` into `SessionsService`
- Move authorization check from `VouchersController.findOne()` to a guard or service
- Extract Google Play API client construction into `GooglePlayAdapter`

### Phase 3: PaymentLock Upgrade (Low Priority)
- Add TTL to in-memory lock (5 minutes)
- Document Redis upgrade path for horizontal scaling

## Scope

**In Scope:**
- `packages/contracts/src/auth.ts` — UserRole SSOT
- `packages/contracts/src/vouchers.ts` — VoucherScope consolidation
- `apps/api/src/users/entities/user.entity.ts` — Remove UserRole, re-export
- `apps/api/src/vouchers/` — Fix imports, extract authorization
- `apps/api/src/sessions/` — Extract cross-domain mutation
- `apps/api/src/payments/` — Extract Google Play adapter

**Out of Scope:**
- Redis-based distributed lock (requires infrastructure changes)
- Full repository pattern refactor (too large, defer to P3)
- Frontend contract updates

## Risk Assessment

- **Import changes**: High confidence, low risk. TypeScript compiler catches broken imports.
- **Authorization refactor**: Medium risk. Must preserve existing behavior exactly.
- **Google Play adapter**: Low risk. Pure extraction, no logic changes.

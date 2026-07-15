# Proposal: Backend Security Critical Fixes

## Intent

Fix 5 critical security vulnerabilities discovered during deep code analysis of the NestJS backend. These issues expose the platform to authentication bypass, unauthorized data access, race conditions, and mass assignment attacks.

## Scope

### In Scope
- Remove hardcoded admin credential bypass in `auth-login.service.ts` (timing attack + bypass)
- Add scope check to `getSessionMetrics()` endpoint (IDOR vulnerability)
- Fix rate limit key generation to use authenticated user ID when available
- Add DTOs with class-validator to `users.controller.ts` (mass assignment)
- Add token invalidation on password change (JWT revocation)

### Out of Scope
- Full JWT refresh token implementation (deferred to `backend-domain-architecture`)
- CSRF protection (deferred)
- Full rate limiting overhaul with Redis distributed lock (deferred to `backend-domain-architecture`)

## Capabilities

### New Capabilities
- `auth-security`: Core authentication security including admin bypass removal, timing-safe comparisons, and JWT revocation

### Modified Capabilities
- `api-rate-limiting`: Rate limit key generation MUST prefer authenticated user ID over IP
- `api-user-management`: User creation and registration MUST use validated DTOs with class-validator

## Approach

1. Replace admin bypass with database-backed superadmin role and constant-time comparison
2. Add `extractScope()` to `getSessionMetrics()` endpoint
3. Modify `RateLimitGuard.generateKey()` to use `user.id` when authenticated
4. Create `CreateUserDto` and `RegisterUserDto` with class-validator decorators
5. Add `authTokenService.invalidateToken()` method and call it on password change

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/auth/services/auth-login.service.ts` | Modified | Remove admin bypass, use constant-time comparison |
| `apps/api/src/auth/services/auth-token.service.ts` | Modified | Add token invalidation method |
| `apps/api/src/auth/services/auth-password-flow.service.ts` | Modified | Call invalidateToken on password change |
| `apps/api/src/sessions/sessions.controller.ts` | Modified | Add scope check to getSessionMetrics |
| `apps/api/src/common/guards/rate-limit.guard.ts` | Modified | Use user.id for authenticated requests |
| `apps/api/src/users/users.controller.ts` | Modified | Use DTOs instead of inline types |
| `apps/api/src/users/dto/create-user.dto.ts` | Created | DTO with class-validator for user creation |
| `apps/api/src/users/dto/register-user.dto.ts` | Created | DTO with class-validator for registration |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Admin bypass removal breaks existing admin login | Medium | Use constant-time comparison for password check, fallback to env vars for superadmin only |
| Rate limit key change affects authenticated vs anonymous | Low | Use user.id for authenticated, IP for anonymous |
| DTO changes break existing API consumers | Low | Use whitelist: true in ValidationPipe (already configured) |

## Rollback Plan

1. Revert all changes to affected files
2. Admin bypass can be restored by reverting `auth-login.service.ts`
3. Rate limit key can be reverted to IP-based
4. DTOs can be removed and inline types restored

## Dependencies

- None (standalone security fixes)

## Success Criteria

- [ ] Admin bypass removed: admin login goes through database, not env vars
- [ ] `getSessionMetrics()` returns 403 for unauthorized scope
- [ ] Rate limit uses user.id when authenticated
- [ ] User creation validates all fields with class-validator
- [ ] Password change invalidates existing JWT tokens

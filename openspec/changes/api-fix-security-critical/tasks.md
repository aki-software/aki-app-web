# Tasks: Backend Security Critical Fixes

## Phase 1: Admin Bypass Removal

- [ ] 1.1 Read `auth-login.service.ts` and remove admin bypass block (lines 20-30)
- [ ] 1.2 Verify `cryptoService.verify()` uses constant-time comparison
- [ ] 1.3 Test: Admin login fails without database entry

## Phase 2: JWT Revocation

- [ ] 2.1 Add `private invalidatedTokens = new Set<string>()` to `auth-token.service.ts`
- [ ] 2.2 Add `invalidateToken(token: string)` method with TTL cleanup
- [ ] 2.3 Add `isTokenInvalidated(token: string)` method
- [ ] 2.4 Call `invalidateToken()` in `auth-password-flow.service.ts` on password change
- [ ] 2.5 Call `invalidateToken()` in `auth-password-flow.service.ts` on password reset
- [ ] 2.6 Test: Password change invalidates old JWT

## Phase 3: Session Metrics Scope Check

- [ ] 3.1 Add scope parameter to `getSessionMetrics()` in `sessions.controller.ts`
- [ ] 3.2 Pass `this.extractScope(req)` to service method
- [ ] 3.3 Add ownership check in `session-metrics.service.ts`
- [ ] 3.4 Test: Therapist cannot access other therapist's metrics
- [ ] 3.5 Test: Admin can access any metrics

## Phase 4: Rate Limit Key Fix

- [ ] 4.1 Modify `generateKey()` in `rate-limit.guard.ts` to use `user.id` when available
- [ ] 4.2 Ensure anonymous requests still use IP
- [ ] 4.3 Test: Authenticated user uses user.id as key
- [ ] 4.4 Test: Anonymous user uses IP as key

## Phase 5: User Creation DTOs

- [ ] 5.1 Create `dto/create-user.dto.ts` with class-validator decorators
- [ ] 5.2 Create `dto/register-user.dto.ts` with class-validator decorators
- [ ] 5.3 Update `users.controller.ts` to use DTOs
- [ ] 5.4 Test: Valid data passes validation
- [ ] 5.5 Test: Invalid data returns 400 with validation errors
- [ ] 5.6 Test: Unknown properties are stripped

## Phase 6: Cleanup

- [ ] 6.1 Remove any console.log statements from modified files
- [ ] 6.2 Verify all changes follow existing code patterns
- [ ] 6.3 Run `pnpm run lint` to check for issues

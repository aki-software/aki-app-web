# Design: Backend Security Critical Fixes

## Technical Approach

Fix 5 critical security vulnerabilities through targeted file modifications. Each fix is isolated to minimize blast radius. No database schema changes required.

## Architecture Decisions

### Decision: Admin Bypass Strategy

**Choice**: Remove bypass entirely, enforce database-only authentication
**Alternatives considered**: 
- Keep bypass but add constant-time comparison (still bypasses DB)
- Add superadmin role to database (requires migration)
**Rationale**: Simplest fix with highest security gain. If admin doesn't exist in DB, login fails. The env vars become a migration helper, not a runtime path.

### Decision: JWT Revocation Strategy

**Choice**: In-memory blacklist using Set<string> with TTL
**Alternatives considered**:
- Redis blacklist (requires infrastructure change)
- Token versioning (requires DB schema change)
- Short-lived tokens only (doesn't solve password change scenario)
**Rationale**: Minimal implementation for immediate security need. In-memory is acceptable for single-instance deployment. Will be upgraded to Redis in `backend-domain-architecture` change.

### Decision: Rate Limit Key Strategy

**Choice**: Use user.id when authenticated, IP for anonymous
**Alternatives considered**:
- Always use IP (allows authenticated users to bypass limits)
- Always use user.id (anonymous users can't be limited)
**Rationale**: Follows security best practice: authenticated users are identified by their unique ID, anonymous users by their IP. This prevents authenticated users from circumventing limits by rotating IPs.

## Data Flow

### Admin Login (Before)

```
Client → auth-login.service → env vars check → bypass DB → return token
```

### Admin Login (After)

```
Client → auth-login.service → database lookup → constant-time verify → return token
```

### Rate Limit Key (Before)

```
Request → rate-limit.guard → generateKey(req.ip + route) → check limit
```

### Rate Limit Key (After)

```
Request → rate-limit.guard → generateKey(user.id || req.ip + route) → check limit
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/auth/services/auth-login.service.ts` | Modify | Remove admin bypass, always go through database |
| `apps/api/src/auth/services/auth-token.service.ts` | Modify | Add `invalidateToken()` method with in-memory blacklist |
| `apps/api/src/auth/services/auth-password-flow.service.ts` | Modify | Call `invalidateToken()` on password change/reset |
| `apps/api/src/sessions/sessions.controller.ts` | Modify | Add scope check to `getSessionMetrics()` endpoint |
| `apps/api/src/common/guards/rate-limit.guard.ts` | Modify | Use `user.id` for authenticated requests |
| `apps/api/src/users/users.controller.ts` | Modify | Replace inline types with DTOs |
| `apps/api/src/users/dto/create-user.dto.ts` | Create | DTO with class-validator for admin user creation |
| `apps/api/src/users/dto/register-user.dto.ts` | Create | DTO with class-validator for public registration |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Admin login goes through DB | Mock UsersService, verify findByEmail called |
| Unit | Rate limit uses user.id | Mock request with user.id, verify key format |
| Unit | Token invalidation works | Call invalidateToken, verify token rejected |
| Unit | DTO validation | Test each field validation rule |
| Integration | Session metrics scope check | Test with different user roles |

## Migration / Rollout

No database migration required. All changes are code-level.

## Open Questions

- Should admin bypass be completely removed, or should there be a fallback mechanism?
- Should token blacklist be persisted to database for multi-instance support?

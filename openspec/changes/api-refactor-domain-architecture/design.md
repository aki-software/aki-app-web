# Design: api/refactor/domain-architecture

## Architecture Decision: Contracts as Single Source of Truth

### Problem
Two parallel type systems exist:
- `@akit/contracts` — Zod schemas + inferred types
- `apps/api/src/` — TypeScript enums + manual types

26/27 files import from the wrong source (entity file).

### Solution
1. **Re-export pattern**: Entity files re-export from contracts
2. **Import updates**: Gradual migration of imports to contracts
3. **Local types**: Keep local types only where contracts don't define them

### Implementation

```typescript
// user.entity.ts — BEFORE
export enum UserRole { ADMIN, THERAPIST, INSTITUTION_ADMIN, PATIENT }

// user.entity.ts — AFTER
export { UserRole } from '@akit/contracts';
```

```typescript
// voucher-query.types.ts — BEFORE
export interface VoucherScope { role?, ownerUserId?, ownerInstitutionId? }

// voucher-query.types.ts — AFTER
export { VoucherScope } from '@akit/contracts';
```

---

## Implementation Details

### 1. UserRole Consolidation

| File | Change |
|------|--------|
| `packages/contracts/src/auth.ts` | Keep as-is (canonical) |
| `apps/api/src/users/entities/user.entity.ts` | Remove enum, re-export from contracts |
| `apps/api/src/vouchers/vouchers.controller.ts` | Update import |
| `apps/api/src/sessions/sessions.service.ts` | Update import |
| `apps/api/src/auth/guards/roles.guard.ts` | Update import |

### 2. VoucherScope Consolidation

| File | Change |
|------|--------|
| `packages/contracts/src/vouchers.ts` | Keep as-is (canonical) |
| `apps/api/src/vouchers/types/voucher-query.types.ts` | Remove local definition, re-export |
| `apps/api/src/sessions/types/session-scope.type.ts` | Already re-exports, verify |

### 3. PaymentLockService TTL

```typescript
// payment-lock.service.ts
private readonly lockedTokens = new Map<string, number>();
private readonly LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes

acquireLock(token: string): void {
  const existing = this.lockedTokens.get(token);
  if (existing && Date.now() < existing) {
    throw new ConflictException('Este pago ya está siendo procesado.');
  }
  this.lockedTokens.set(token, Date.now() + this.LOCK_TTL_MS);
}

releaseLock(token: string): void {
  this.lockedTokens.delete(token);
}
```

### 4. VoucherRedemptionService — Extract Session Mutation

```typescript
// Move to SessionsService
async applyVoucherToSession(sessionId: string, voucher: Voucher): Promise<Session> {
  const session = await this.findOne(sessionId);
  session.voucherId = voucher.id;
  session.paymentStatus = SessionPaymentStatus.VOUCHER_REDEEMED;
  session.reportUnlockedAt = session.reportUnlockedAt ?? voucher.redeemedAt ?? new Date();
  if (!session.institutionId && voucher.ownerInstitutionId) {
    session.institutionId = voucher.ownerInstitutionId;
  }
  if (!session.therapistUserId && voucher.ownerUserId) {
    session.therapistUserId = voucher.ownerUserId;
  }
  return this.sessionRepository.save(session);
}
```

### 5. GooglePlayAdapter

```typescript
// google-play.adapter.ts
@Injectable()
export class GooglePlayAdapter {
  constructor(private readonly configService: ConfigService) {}

  getAndroidPublisher(): androidpublisher_v3.Androidpublisher {
    const serviceAccountBase64 = this.configService.get<string>('GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64');
    const credentials = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf8'));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
    return google.androidpublisher({ version: 'v3', auth });
  }
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/api/src/users/entities/user.entity.ts` | Re-export UserRole from contracts |
| `apps/api/src/vouchers/types/voucher-query.types.ts` | Re-export VoucherScope from contracts |
| `apps/api/src/payments/payment-lock.service.ts` | Add TTL to lock |
| `apps/api/src/payments/google-play.adapter.ts` | New file — extract Google Play API |
| `apps/api/src/payments/payments.service.ts` | Inject GooglePlayAdapter |
| `apps/api/src/vouchers/services/voucher-redemption.service.ts` | Delegate session mutation to SessionsService |
| `apps/api/src/sessions/sessions.service.ts` | Add applyVoucherToSession() method |

---

## Testing Strategy

1. **Import verification**: TypeScript compiler catches broken imports
2. **Existing tests**: Run `pnpm run test --filter api` to verify no regressions
3. **Payment lock TTL**: Unit test with mocked timers
4. **Google Play adapter**: Unit test with mocked credentials

# Tasks: api/refactor/domain-architecture

## Phase 1: Contracts SSOT (Quick Win)

- [ ] 1.1 Update `user.entity.ts` to re-export UserRole from contracts
- [ ] 1.2 Update `voucher-query.types.ts` to re-export VoucherScope from contracts
- [ ] 1.3 Update all 26 files importing UserRole from entity to use contracts
- [ ] 1.4 Verify TypeScript compiles without errors

## Phase 2: PaymentLockService TTL (Medium)

- [ ] 2.1 Change `lockedTokens` from `Set<string>` to `Map<string, number>`
- [ ] 2.2 Add TTL constant (5 minutes)
- [ ] 2.3 Update `acquireLock()` to store expiry time
- [ ] 2.4 Update `releaseLock()` to delete from map
- [ ] 2.5 Add unit test for TTL expiration

## Phase 3: Domain Boundaries (Medium)

- [ ] 3.1 Extract `applyVoucherToSession()` from VoucherRedemptionService to SessionsService
- [ ] 3.2 Update VoucherRedemptionService to call SessionsService
- [ ] 3.3 Extract Google Play API client to GooglePlayAdapter
- [ ] 3.4 Update PaymentsService to inject GooglePlayAdapter

## Verification

- [ ] V.1 Run `pnpm run test --filter api` — all tests pass
- [ ] V.2 Run `pnpm run lint --filter api` — no new errors
- [ ] V.3 Verify all UserRole imports resolved

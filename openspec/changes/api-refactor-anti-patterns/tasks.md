# Tasks: api/refactor/anti-patterns

## Phase 1: Voucher authorization guard

- [x] 1.1 Create `apps/api/src/vouchers/guards/voucher-access.guard.ts` with the `VoucherAccessGuard` class
- [x] 1.2 Update `VouchersService.findByCode()` to accept an optional `VoucherScope` and apply it via `VoucherAccessService`
- [x] 1.3 Register `VoucherAccessGuard` in `VouchersModule.providers`
- [x] 1.4 Replace inline auth in `VouchersController.findOne()` with `@UseGuards(JwtAuthGuard, VoucherAccessGuard)` and return the voucher attached by the guard
- [x] 1.5 Add a unit test for `VoucherAccessGuard` covering admin, owner, and non-owner cases

## Phase 2: Sessions controller cleanup

- [x] 2.1 Remove `try/catch` wrappers from `SessionsController.findOne()` and `findResult()`
- [x] 2.2 Add a private `parseIntOrDefault` helper and use it in `getAdminOverview` and `getAdminActivity`
- [ ] 2.3 Verify `pnpm test --filter api` still passes

## Verification

- [ ] V.1 Run `pnpm test --filter api` — all tests pass
- [ ] V.2 Run `pnpm lint --filter api` — no new errors
- [ ] V.3 Confirm no controller still contains inline admin/owner authorization logic for voucher access

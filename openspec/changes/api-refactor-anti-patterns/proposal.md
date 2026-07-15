# Proposal: api/refactor/anti-patterns

## Problem Statement

The API controllers still embed business rules that belong in services/guards, making them harder to test, share, and reason about.

1. **Auth logic in `VouchersController.findOne()`** — admin/owner check is hard-coded in the handler (lines 147-165) and the result is not scoped before fetching, so the same pattern has to be repeated for any new "voucher detail" endpoint.

2. **`VouchersService.findByCode()` ignores `VoucherScope`** — it loads the voucher by code with no access control, forcing every caller (controllers, redemption service) to redo the authorization check in their own way.

3. **`SessionsController.findOne()` / `findResult()` wrap exceptions** — they rethrow `NotFoundException` from the service, adding noise without changing behavior, and the controller ends up importing the same error messages.

## Proposed Solution

### Phase 1: Voucher authorization guard (High impact)
- Add `VoucherAccessGuard` that loads the voucher by `:code` and verifies the caller's scope (admin or owner institution) before the handler runs.
- Wire the guard into `VouchersController.findOne()` and remove the inline admin/owner check.
- Make `VouchersService.findByCode()` scope-aware by reusing `VoucherAccessService.buildScopedWhere()` so the service, not the controller, is the enforcement point.

### Phase 2: Clean up `SessionsController` (Low risk)
- Drop the `try/catch` wrappers around `sessionsService.findOne()` because the service already throws `NotFoundException` with the right message.
- Add a single helper for the admin overview/activity limit parsing so the controller stops calling `parseInt` on raw query strings.

## Scope

**In Scope:**
- `apps/api/src/vouchers/vouchers.controller.ts` — drop inline auth, apply guard.
- `apps/api/src/vouchers/vouchers.service.ts` — make `findByCode` scope-aware.
- `apps/api/src/vouchers/guards/voucher-access.guard.ts` — new guard.
- `apps/api/src/vouchers/vouchers.module.ts` — register the new guard.
- `apps/api/src/sessions/sessions.controller.ts` — remove `try/catch` wrappers, centralize limit parsing.

**Out of Scope:**
- Refactor of other controllers' inline business rules (defer to follow-up changes).
- Repository pattern / DTO changes (covered by other pending changes).
- Frontend updates.

## Risk Assessment

- **Guard migration**: Medium risk. Must preserve the same behavior for admin and owner-institution calls. The current check is mirrored exactly inside the new guard.
- **`findByCode` scope**: Medium risk. The function is used by the redemption path too; switching to scope-aware must keep the existing public routes (admin/owner) returning the same data.
- **Controller cleanup**: Low risk. Pure removal of redundant code; behavior is already covered by the service layer.

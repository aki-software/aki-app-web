# Spec: domain-architecture

## Context
- **Module**: API (NestJS)
- **Stack**: TypeScript, TypeORM, NestJS
- **Test Strategy**: Existing unit tests + manual verification

---

## Scenario: UserRole imported from contracts everywhere

**GIVEN** the `UserRole` enum is defined in `@akit/contracts`
**WHEN** any API file needs to reference `UserRole`
**THEN** it imports from `@akit/contracts` or from `user.entity.ts` which re-exports from contracts
**AND** there is only one canonical definition

---

## Scenario: VoucherScope has single definition

**GIVEN** `VoucherScope` is defined in `@akit/contracts`
**WHEN** any API file needs to reference `VoucherScope`
**THEN** it imports from `@akit/contracts`
**AND** the local `voucher-query.types.ts` re-exports from contracts instead of defining its own version

---

## Scenario: PaymentLockService has TTL

**GIVEN** a payment lock is acquired
**WHEN** 5 minutes pass without release
**THEN** the lock expires automatically
**AND** a new request can acquire the same lock

---

## Scenario: VoucherRedemptionService doesn't mutate Session directly

**GIVEN** a voucher is being applied to a session
**WHEN** `applyVoucherToSession()` is called
**THEN** the method delegates to `SessionsService.applyVoucher()` instead of directly mutating entity fields

---

## Scenario: Authorization logic extracted from controllers

**GIVEN** a request to `VouchersController.findOne()`
**WHEN** the user doesn't have access
**THEN** the authorization check happens in a guard or service, not inline in the controller

---

## Scenario: Google Play API extracted to adapter

**GIVEN** `PaymentsService` needs to verify a purchase
**WHEN** it calls the Google Play API
**THEN** the request goes through a `GooglePlayAdapter` that handles credential parsing and client construction

# Spec: api/refactor/anti-patterns

## Auth: Reusable voucher authorization

### Requirement: Voucher access guard
The system MUST provide a `VoucherAccessGuard` that, when applied to a handler, loads the voucher identified by the `:code` path parameter and allows the request only when the caller is either an admin or the owner institution of the voucher.

#### Scenario: Admin caller
- Given an authenticated user with `role = ADMIN`
- And a voucher whose `code` matches the path parameter
- When the guarded endpoint is invoked
- Then the request is allowed and the handler receives the loaded voucher via the request object.

#### Scenario: Owner-institution caller
- Given an authenticated user whose `institutionId` matches `voucher.ownerInstitutionId`
- When the guarded endpoint is invoked
- Then the request is allowed.

#### Scenario: Non-owner caller
- Given an authenticated user whose `institutionId` does NOT match `voucher.ownerInstitutionId`
- And the user is not an admin
- When the guarded endpoint is invoked
- Then the request is rejected with `ForbiddenException` and the message `No tienes permisos para acceder a este voucher`.

### Requirement: Service-level scope enforcement
`VouchersService.findByCode(code, scope?)` MUST apply the supplied `VoucherScope` to the database query using `VoucherAccessService.buildScopedWhere()`. When the scope excludes the voucher, the service MUST throw `NotFoundException` (preserving prior behavior).

## Vouchers: Controller cleanup

### Requirement: Thin controller
`VouchersController.findOne()` MUST NOT contain inline authorization logic. The handler MUST only return the voucher that `VoucherAccessGuard` attached to the request.

## Sessions: Controller cleanup

### Requirement: Remove redundant try/catch
`SessionsController.findOne()` and `SessionsController.findResult()` MUST NOT wrap `sessionsService.findOne()` in `try/catch` blocks. The service already throws `NotFoundException` with the right message; controllers must let it bubble.

### Requirement: Centralized integer parsing
`SessionsController` MUST expose a private `parseIntOrDefault` helper used by `getAdminOverview` and `getAdminActivity` instead of repeating the inline `parseInt(...) ? ... : CONSTANT` ternary.

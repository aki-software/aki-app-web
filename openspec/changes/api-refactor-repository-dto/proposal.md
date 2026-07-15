# Proposal: api/refactor/repository-dto

## Problem Statement

The users module still hand-rolls inline body types instead of using the project's DTO + `ValidationPipe` discipline, leading to three concrete issues:

1. **Unvalidated payloads** — `UsersController.create()` and `UsersController.register()` accept `payload: { name; role?; email?; institutionId? }` directly, bypassing `class-validator` and the global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`.
2. **Duplicated body shape** — the same inline type is repeated in two endpoints and in the private `performRegistration` helper.
3. **Stringly-typed query** — `findAll(@Query('role') role?: string)` only checks the value with `role?.toUpperCase()`; nothing rejects unknown roles up front.

The repository/DTO gap is intentional: this change keeps the existing `TypeORM @InjectRepository` wiring (a full repository interface layer is too large for one change) and focuses only on the controller-facing DTO hygiene for `UsersController`.

## Proposed Solution

### Phase 1: Users DTOs (Quick win)
- Add `CreateUserDto` and `RegisterUserDto` in `apps/api/src/users/dto/` with `class-validator` decorators.
- Add `ListUsersQueryDto` to validate the `role` query parameter against `UserRole` enum.
- Update `UsersController` to use the new DTOs and remove the inline type definitions.
- Remove the redundant `try/catch` in `resendActivation` (the service already throws a domain error that the global filter translates).

## Scope

**In Scope:**
- `apps/api/src/users/dto/create-user.dto.ts` — new.
- `apps/api/src/users/dto/register-user.dto.ts` — new.
- `apps/api/src/users/dto/list-users-query.dto.ts` — new.
- `apps/api/src/users/users.controller.ts` — switch to DTOs.

**Out of Scope:**
- Full repository interface refactor (defer; `TypeORM` direct usage is consistent across the codebase).
- Other controllers' inline payloads (covered by future changes).

## Risk Assessment

- **DTO swap**: Low risk. The shapes match the existing inline types one-for-one.
- **`listUsersQueryDto`**: Low risk. We only accept what we already accept (`THERAPIST` role); other values still return `{ data: [] }`.
- **Removed `try/catch`**: Low risk. The global `AllExceptionsFilter` translates the domain error; behavior is preserved.

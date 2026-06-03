# Tasks: api/refactor/repository-dto

## Phase 1: Users DTOs

- [x] 1.1 Create `apps/api/src/users/dto/create-user.dto.ts` with `CreateUserDto`
- [x] 1.2 Create `apps/api/src/users/dto/register-user.dto.ts` with `RegisterUserDto` (extends `CreateUserDto`)
- [x] 1.3 Create `apps/api/src/users/dto/list-users-query.dto.ts` with `ListUsersQueryDto`
- [x] 1.4 Update `UsersController` to import the DTOs and remove inline `payload` types
- [x] 1.5 Drop the private `performRegistration` helper in `UsersController` and call `userRegistrationService.register(dto)` directly
- [x] 1.6 Remove the `try/catch` from `resendActivation`
- [ ] 1.7 Run `pnpm test --filter api`

## Verification

- [ ] V.1 `pnpm test --filter api` passes
- [ ] V.2 `pnpm lint --filter api` no new errors
- [ ] V.3 No inline `@Body() payload: { ... }` remains in the API

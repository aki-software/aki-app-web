# Design: api/refactor/repository-dto

## Architecture Decision: DTOs + ValidationPipe everywhere

### Problem
A subset of controllers still type `@Body()` arguments as inline objects, which means:
- `class-validator` is never run for those endpoints.
- The shape lives in the controller, not next to the other DTOs.
- The DTO file naming convention (`xxx.dto.ts`) is broken for those endpoints.

### Solution
Replace every inline body type with a dedicated class in `apps/api/src/users/dto/` following the convention already used by `sessions/`, `vouchers/`, `institutions/`, `auth/`, `payments/`, and `categories/`. The global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` in `main.ts` will start validating the new DTOs without further wiring.

## Implementation Details

### 1. `CreateUserDto` / `RegisterUserDto`

Both share the same shape; they exist as separate classes so each controller signature remains explicit and future evolution is cheap.

```typescript
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUUID()
  institutionId?: string | null;
}
```

`RegisterUserDto` extends the same shape so the public registration endpoint keeps its dedicated type.

### 2. `ListUsersQueryDto`

```typescript
export class ListUsersQueryDto {
  @IsOptional()
  @IsEnum(UserRole, { message: 'Rol inválido' })
  role?: UserRole;
}
```

The handler continues to map `THERAPIST` to `findTherapists()`; any other role returns `{ data: [] }`.

### 3. Controller refactor

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Get()
async findAll(@Query() query: ListUsersQueryDto) {
  if (query.role?.toUpperCase() === UserRole.THERAPIST) { ... }
  return { data: [] };
}
```

The inline `payload` type and the `performRegistration` helper are deleted; the controllers call the registration service directly with the DTO.

## Files to Modify

| File | Change |
|------|--------|
| `apps/api/src/users/dto/create-user.dto.ts` | New. |
| `apps/api/src/users/dto/register-user.dto.ts` | New. |
| `apps/api/src/users/dto/list-users-query.dto.ts` | New. |
| `apps/api/src/users/users.controller.ts` | Switch to DTOs, drop helper. |

## Testing Strategy

- `pnpm test --filter api` — existing tests should still pass (DTO field names match the inline types).
- Add at least one controller test that hits `POST /users` with an extra field and confirms `forbidNonWhitelisted` rejects it.

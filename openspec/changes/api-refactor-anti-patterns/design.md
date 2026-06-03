# Design: api/refactor/anti-patterns

## Architecture Decision: Guards as the only authorization surface

### Problem
Authorization decisions are currently spread between controllers (manual `if (admin) ... else if (owner) ...`) and services (`VoucherAccessService.buildScopedWhere`). The mix makes it impossible to know whether a new endpoint is "secure by default" without reading every handler.

### Solution
1. **Guard-first**: every endpoint that returns or mutates a single voucher by `code` goes through `VoucherAccessGuard`, which loads the entity, applies the scope, and either allows the request or throws `ForbiddenException`.
2. **Service-aware scope**: `VouchersService.findByCode()` accepts an optional `VoucherScope` and reuses `VoucherAccessService` so the same data the guard sees is also the data the service returns.
3. **Thin controllers**: controllers stop wrapping exceptions and parsing query integers; they delegate both to services or DTOs.

## Implementation Details

### 1. `VoucherAccessGuard`

```typescript
@Injectable()
export class VoucherAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly vouchersService: VouchersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const code = request.params.code;
    const scope = this.buildScopeFromRequest(request);

    const voucher = await this.vouchersService.findByCode(code, scope);
    request.voucher = voucher;
    return true;
  }
}
```

- The guard resolves the voucher once and attaches it to the request, so the controller no longer needs to call `findByCode`.
- The scope comes from the same fields already used by `CurrentVoucherScope`, so admin/owner semantics stay identical.

### 2. `VouchersService.findByCode(code, scope?)`

```typescript
async findByCode(code: string, scope?: VoucherScope): Promise<Voucher> {
  const normalized = this.codeGenerator.normalize(code);
  const scopedWhere = this.queryService.buildScopedWhere(scope) ?? {};
  const voucher = await this.voucherRepository.findOne({
    where: { ...scopedWhere, code: normalized },
    relations: ['ownerUser', 'ownerInstitution'],
  });
  if (!voucher) throw new NotFoundException('Voucher no encontrado');
  return voucher;
}
```

- The non-scoped call site (redemption) still works because the public redemption routes are not admin-gated and the `scope` argument defaults to `undefined`.
- If a caller passes a scope that excludes the voucher, `buildScopedWhere` will return `null`/empty and the lookup will miss, which already matches the previous "not found" behavior.

### 3. `VouchersController.findOne()` (after)

```typescript
@UseGuards(JwtAuthGuard, VoucherAccessGuard)
@Get(':code')
async findOne(@Param('code') code: string, @Req() req: AuthenticatedRequest) {
  return req.voucher;
}
```

### 4. `SessionsController` cleanup

- Remove the `try/catch` around `sessionsService.findOne()` in `findOne()` and `findResult()`; the service already throws `NotFoundException`.
- Add a `parseIntOrDefault(value, fallback)` helper (private method) to avoid repeating the `parseInt` pattern in the admin endpoints.

## Files to Modify

| File | Change |
|------|--------|
| `apps/api/src/vouchers/guards/voucher-access.guard.ts` | New file — guard that loads + scopes voucher. |
| `apps/api/src/vouchers/vouchers.controller.ts` | Replace inline auth with `VoucherAccessGuard`. |
| `apps/api/src/vouchers/vouchers.service.ts` | Make `findByCode()` scope-aware. |
| `apps/api/src/vouchers/vouchers.module.ts` | Register the new guard. |
| `apps/api/src/sessions/sessions.controller.ts` | Drop `try/catch` wrappers, add `parseIntOrDefault` helper. |

## Testing Strategy

- `pnpm test --filter api` — all existing unit tests must still pass.
- Add at least one new test for `VoucherAccessGuard` covering: admin allowed, owner-institution allowed, non-owner denied.
- Existing service tests for `findByCode` should still pass without changes; if any fail, fix the test rather than the contract.

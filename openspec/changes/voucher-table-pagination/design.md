# Design: Voucher Table Pagination

## Technical Approach

Two independent pagination tracks sharing the enhanced Pagination molecule:

1. **Batch Detail (server-side)**: Add optional `page`/`limit` to `GET batches/:batchId`. Service runs count + aggregate + paginated query; returns unified `{ data, count, page, limit }` wrapper (following `voucherBatchListResponseSchema` pattern). Page state lives in parent `DashboardVouchers` — triggers refetch via existing `useEffect`.

2. **Voucher Sessions (client-side)**: Pure frontend — slice the already-loaded `sessions` array. No API changes. Filters operate on the full list, pagination applied after.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| New `voucherBatchDetailPaginatedResponseSchema` vs mutate existing | New keeps backward compat but adds dead code; mutate breaks 1 consumer (DashboardVouchers) | **Replace schema** — single consumer, explicit migration point |
| Page state in Drawer vs parent | Drawer-self-contained breaks prop-driven pattern; parent-ownership keeps existing `useEffect` refetch loop | **Parent-ownership** — add `batchDetailPage` state in DashboardVouchers, include in `useEffect` deps |
| Sessions: filter then paginate vs paginate then filter | Filter-then-paginate is standard UX; spec says "operate on displayed page" | **Follow spec** — filter applied to current page only |
| Separate pagination DTO vs bare `@Query()` params | DTO adds ceremony for 2 optional fields; bare params keep controller lean | **Bare `@Query('page')` / `@Query('limit')`** — defaults in service |
| Three queries (metadata + count + data) vs two | Three is precise (metadata survives empty pages); two can't | **Two queries** — metadata query (LIMIT 1 with joins) + `getManyAndCount()` paginated |

## Data Flow

```
Batch Detail Pagination (server-side):

DashboardVouchers               API                         DB
     │                           │                           │
     │── GET /batches/:id?page=N →│                           │
     │                           │── COUNT + status GROUP BY →│
     │                           │── SELECT LIMIT/OFFSET ────→│
     │                           │←── {data, count, page, ───│
     │←── { batchId, totals,     │    limit, batchMeta }     │
     │     data, count, page }   │                           │
     │                           │                           │
     │── onPageChange(2) ───────→│ (re-triggers useEffect)   │
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/contracts/src/vouchers.ts` | Modify | Replace `voucherBatchDetailResponseSchema` — `vouchers`→`data`, add `count`/`page`/`limit`. Update type aliases |
| `packages/contracts/src/export-json-schemas.ts` | Modify | Update schema reference |
| `apps/api/src/vouchers/types/voucher-query.types.ts` | Modify | Update `VoucherBatchDetail` type — `vouchers`→`data`, add `count`/`page`/`limit` |
| `apps/api/src/vouchers/services/voucher-batch-query.service.ts` | Modify | `findBatchDetail()` accepts `page`/`limit`, runs paginated query + aggregate count, returns new response shape |
| `apps/api/src/vouchers/vouchers.controller.ts` | Modify | Add `@Query('page')` and `@Query('limit')` optional params to `findBatchDetail()` |
| `apps/api/src/vouchers/vouchers.constants.ts` | Modify | Add `BATCH_DETAIL_DEFAULT_LIMIT: 20` to `VOUCHER_CONFIG.PAGINATION` |
| `apps/web/src/components/molecules/Pagination.tsx` | Modify | Add page number buttons between prev/next, highlight active page, disable prev/next at boundaries |
| `apps/web/src/features/dashboard/api/vouchers.api.ts` | Modify | `fetchVoucherBatchDetail()` accepts `page`/`limit` params, returns new paginated type |
| `apps/web/src/features/dashboard/hooks/useVoucherList.ts` | Modify | Export reusable pagination page calculation helpers |
| `apps/web/src/features/dashboard/views/DashboardVouchers.tsx` | Modify | Add `batchDetailPage` state, pass to fetch + drawer props |
| `apps/web/src/features/dashboard/components/vouchers/BatchDetailDrawer.tsx` | Modify | Replace `onPageChange` local state with props, compute `totalPages` from server `count`/`limit` |
| `apps/web/src/features/dashboard/components/vouchers/VoucherSessionsTable.tsx` | Modify | Add client-side pagination state, slice sessions array, render `<Pagination>` below table |

## Interfaces / Contracts

```typescript
// packages/contracts/src/vouchers.ts — new paginated schema
export const voucherBatchDetailResponseSchema = z.object({
  batchId: z.string().uuid(),
  ownerInstitutionName: z.string(),
  ownerUserName: z.string(),
  createdAt: z.union([z.string(), z.instanceof(Date)]),
  expiresAt: z.union([z.string(), z.instanceof(Date)]).nullable(),
  total: z.number().int(),
  available: z.number().int(),
  used: z.number().int(),
  pending: z.number().int(),
  data: z.array(voucherBatchDetailItemSchema),
  count: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});
```

Pagination component API (enhanced):

```typescript
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  // No new props — existing interface stays compatible
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (API) | `findBatchDetail()` with pagination params returns expected slice + count | Mock repository, assert `take`/`skip` called, verify response shape has `data`/`count` |
| Unit (API) | Default params when none provided | Assert `page=1, limit=20` default applied |
| Unit (API) | Limit clamped to 100 | Assert `limit=100` when input > 100 |
| Unit (API) | Empty page returns `data: []` with correct `count` | Mock 0 items for skip beyond total |
| Unit (Web) | Pagination component renders page buttons | Render with `totalPages=5`, assert 5 number buttons + active state |
| Unit (Web) | `VoucherSessionsTable` client pagination | Render with 25 sessions, assert only 10 visible, navigate to page 2 |
| Integration | Batch detail endpoint with `?page=2&limit=10` | Use SQLite test DB, seed 50 vouchers, assert response |

## Migration / Rollout

No data migration required. Backward-compatible: the controller accepts optional `page`/`limit`; omitting them defaults to `page=1, limit=20`. The response shape change (`vouchers`→`data`) is a breaking contract change — update the single consumer `fetchVoucherBatchDetail()` and `VoucherBatchDetailResponse` type atomically within the same PR.

## Open Questions

- [ ] Should sessions client-side filters apply before or after pagination? Spec says "current page" — confirmed, implement as spec'd.
- [ ] Does `export-json-schemas.ts` need to update the schema key name? Yes — update alongside the Zod schema rename to keep JSON schemas in sync.

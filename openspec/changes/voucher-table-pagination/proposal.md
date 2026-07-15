# Proposal: Voucher Table Pagination

## Intent

Batch detail drawers load ALL vouchers at once — degrading UX and API performance. Add server-side pagination to batch detail and client-side pagination to voucher sessions table.

## Scope

### In Scope
- Server-side pagination for `findBatchDetail()` with `page`/`limit` query params
- Unify response format to `{ data, count, page, limit }` wrapper
- Pagination component: add page numbers
- `BatchDetailDrawer`: server refetch on page change
- `VoucherSessionsTable`: client-side pagination
- Contracts package: update response schemas and DTOs

### Out of Scope
- Page size selector (fixed at 20 for batch detail, 10 for sessions)
- Sorting or filtering beyond existing
- Batch-level pagination (only voucher-level)

## Capabilities

### New Capabilities
- `voucher-batch-detail-pagination`: Server-side paginated fetching of voucher batch detail with `page`/`limit` params and unified response wrapper
- `voucher-sessions-pagination`: Client-side paginated display of voucher sessions table with page navigation

### Modified Capabilities
None

## Approach

1. **Contracts**: Add `page`/`limit` to `voucherBatchDetailResponseSchema`, rename `vouchers` → `data`, add `count` field
2. **API**: Add `page`/`limit` query params to `GET batches/:id/detail`, modify `findBatchDetail()` to use `skip`/`take` and return `{ data, count, page, limit }`
3. **Web — Pagination component**: Add page number buttons between prev/next
4. **Web — BatchDetailDrawer**: Replace client-side slicing with server-side `page` param, refetch on page change
5. **Web — VoucherSessionsTable**: Add client-side pagination with the enhanced component

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/contracts/src/vouchers.ts` | Modified | Add `page`/`limit` to response, rename `vouchers` → `data` |
| `apps/api/src/vouchers/services/voucher-batch-query.service.ts` | Modified | Server pagination in `findBatchDetail()` |
| `apps/api/src/vouchers/vouchers.controller.ts` | Modified | Add `page`/`limit` query params |
| `apps/api/src/vouchers/dto/voucher.dto.ts` | Modified | Pagination DTO for batch detail |
| `apps/web/src/components/molecules/Pagination.tsx` | Modified | Add page numbers |
| `apps/web/src/features/dashboard/components/vouchers/BatchDetailDrawer.tsx` | Modified | Server pagination with refetch |
| `apps/web/src/features/dashboard/components/vouchers/VoucherSessionsTable.tsx` | Modified | Client-side pagination |
| `apps/web/src/features/dashboard/api/vouchers.api.ts` | Modified | Paginated fetch for batch detail |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Response format change breaks existing consumers | Medium | Check all consumers of `voucherBatchDetailResponseSchema` before rename |
| Page numbers UX feels unnatural without size selector | Low | Fixed size at 20 rows keeps interaction simple |

## Rollback Plan

Revert each affected file to previous state. The contract rename `vouchers` → `data` is the riskiest — rollback by restoring the previous schema name and response format.

## Dependencies

- None

## Success Criteria

- [ ] `findBatchDetail()` accepts `page`/`limit` and returns paginated data
- [ ] Response format is `{ data, count, page, limit }` for batch detail
- [ ] Pagination component shows page numbers
- [ ] `BatchDetailDrawer` refetches from server on page change
- [ ] `VoucherSessionsTable` paginates client-side
- [ ] All existing tests pass

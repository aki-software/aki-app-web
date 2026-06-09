# Tasks: Voucher Table Pagination

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 370–420 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Contracts + API (~200) → PR 2: Web (~200) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Contracts + API pagination | PR 1 | Schema, types, service, controller, API tests |
| 2 | Web pagination + consumers | PR 2 | Pagination component, drawer, sessions, web tests |

## Phase 1: Contracts

- [ ] 1.1 RED: Write contract test asserting `data`/`count`/`page`/`limit` in response
- [ ] 1.2 GREEN: Replace `voucherBatchDetailResponseSchema` — rename `vouchers`→`data`, add `count`/`page`/`limit`
- [ ] 1.3 GREEN: Update `VoucherBatchDetail` type and `export-json-schemas.ts` reference

## Phase 2: API Pagination

- [ ] 2.1 RED: Write unit test for `findBatchDetail()` — default params, slice, limit clamp, empty page
- [ ] 2.2 GREEN: Add `BATCH_DETAIL_DEFAULT_LIMIT: 20` to `vouchers.constants.ts`
- [ ] 2.3 GREEN: Paginate `findBatchDetail()` — accept `page`/`limit`, run `getManyAndCount()`
- [ ] 2.4 GREEN: Add `@Query('page')`/`@Query('limit')` to controller `findBatchDetail()`

## Phase 3: Pagination Component

- [ ] 3.1 RED: Write test — page number buttons, active highlight, prev/next disabled at bounds
- [ ] 3.2 GREEN: Add page number buttons between prev/next in `Pagination.tsx`

## Phase 4: Batch Detail (Server Consumer)

- [ ] 4.1 RED: Write test for `fetchVoucherBatchDetail()` with `page`/`limit` params
- [ ] 4.2 GREEN: Update `vouchers.api.ts` — accept `page`/`limit`, return paginated type
- [ ] 4.3 GREEN: Export pagination helpers from `useVoucherList.ts`
- [ ] 4.4 GREEN: Add `batchDetailPage` state to `DashboardVouchers.tsx`, wire into fetch deps
- [ ] 4.5 GREEN: Replace local slicing with server refetch in `BatchDetailDrawer.tsx`

## Phase 5: Voucher Sessions (Client Pagination)

- [ ] 5.1 RED: Write test — 25 sessions, only 10 visible, navigate to page 2, fewer-than-page-size
- [ ] 5.2 GREEN: Add client pagination state, slice sessions, render `<Pagination>` below table

## Phase 6: Integration

- [ ] 6.1: Write integration test — batch detail `?page=2&limit=10` with SQLite seed

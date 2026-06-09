# Tasks: Style Web — Token consumption, color cleanup & accessibility

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~450 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (atoms+tokens) → PR 2 (feature colors) → PR 3 (a11y) |
| Delivery strategy | ask-on-risk (resolved: auto-chain) |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Status tokens + 4 atom components | PR 1 | Base = feature/style-web; ~100 lines |
| 2 | StatCard consolidation + ~25 feature files | PR 2 | Base = PR 1 branch; ~250 lines |
| 3 | a11y: aria-hidden + reduced-motion | PR 3 | Base = PR 2 branch; ~100 lines |

## Phase 1: PR 1 — Token Infrastructure & Atoms

- [x] 1.1 RED: Write test asserting `--color-status-*` tokens defined in `@theme` (index.css)
- [x] 1.2 GREEN: Add `--color-status-*` and `--color-warning-*` tokens to `@theme` in `index.css`
- [ ] 1.3 RED: Write test for Spinner using `border-t-app-primary` + reduced-motion support
- [x] 1.4 GREEN: Spinner `border-t-blue-600` → `border-t-app-primary`; add `prefers-reduced-motion`
- [ ] 1.5 RED: Write test for Alert status tokens per type + `role="alert"`
- [x] 1.6 GREEN: Alert hardcoded colors → status tokens; add `role="alert"`; add `aria-hidden` to icons
- [ ] 1.7 RED: Write test for StatusBadge using status tokens per state (active/pending/expired)
- [x] 1.8 GREEN: StatusBadge emerald/amber/rose → status tokens
- [ ] 1.9 RED: Write test for EventIcon using status tokens + `aria-hidden`
- [x] 1.10 GREEN: EventIcon emerald/amber → status tokens; add `aria-hidden`
- [x] 1.11 VERIFY: Run test suite — all atoms tests pass with new tokens

## Phase 2: PR 2 — Feature Colors & StatCard

- [x] 2.1 RED: Write test for atoms/StatCard accepting status token class name (already existed — test at `atoms/__tests__/StatCard.test.tsx` covers `valueColor="text-status-error"`)
- [x] 2.2 GREEN: Refactor atoms/StatCard to accept token-based color class (already supported `colorClass`/`valueColor` props; made `icon` optional to fix pre-existing TS build breakage)
- [x] 2.3 DELETE: `molecules/StatCard.tsx`; update VoucherStatsCards to import from atoms (molecules/StatCard.tsx never existed; VoucherStatsCards already imports from atoms)
- [x] 2.4 GREEN: Replace hardcoded colors → tokens in VoucherTableRow, VoucherEmitForm, VoucherBatchRow, VoucherSessionsTable, BatchDetailDrawer
- [x] 2.5 GREEN: LowStockAlert amber palette → `--color-warning-*` tokens
- [x] 2.6 GREEN: Replace hardcoded colors → tokens in SessionClinicalInsights, SessionReportButton, BehavioralMethodologyPanel
- [x] 2.7 GREEN: Replace hardcoded colors → tokens in AdminAlerts, ActivityFeed, QuickActions, Sidebar
- [x] 2.8 GREEN: Replace hardcoded colors → tokens in InstitutionCard, UserSessionGroup, DashboardResults, NotFoundFeature, DashboardSettings, InstitutionDashboardOverview, DashboardOverview, InstitutionDetailOverview
- [x] 2.9 VERIFY: Zero matches for `(text|bg|border)-(emerald|amber|rose|red)-` in `apps/web/src/` — confirmed via grep

## Phase 3: PR 3 — Accessibility

- [ ] 3.1 RED: Write test asserting `aria-hidden="true"` on all decorative Lucide icons
- [ ] 3.2 GREEN: Add `aria-hidden="true"` to decorative icons in Alert, EventIcon, StatCard, Sidebar
- [ ] 3.3 RED: Write test asserting `prefers-reduced-motion` disables animations
- [ ] 3.4 GREEN: Add `prefers-reduced-motion` to Spinner + animate-in/entrance components
- [ ] 3.5 GREEN: Ensure close button icon has `aria-hidden` + `aria-label` on close button
- [ ] 3.6 VERIFY: Full `rg` scan — zero hardcoded color classes in `apps/web/src/`
- [ ] 3.7 VERIFY: Run full test suite — all unit + integration tests pass

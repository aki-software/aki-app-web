# Design: Style Web — Token consumption, color cleanup & accessibility

## Technical Approach

Replace ~90 hardcoded Tailwind color instances with `--color-status-*` / `--color-app-*` tokens, add status tokens to `@theme`, merge duplicate StatCards, add `aria-hidden`/`role="alert"`/`prefers-reduced-motion`, and unify Select styles. Execution follows proposal Phase 2-4 scope.

## Architecture Decisions

### Decision: Status token mapping convention

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `--color-success` / `--color-error` / `--color-warning` | Shorter but ambiguous (CSS-native vs app-level) | ❌ |
| `--color-status-success` / `--color-status-error` / `--color-status-warning` | Consistent with spec convention, Tailwind v4 opacity modifiers work (`bg-status-success/10`) | ✅ |

Add to `@theme` in `index.css`, mapped from `@akit/design-tokens` values: `var(--color-status-success)` etc.

### Decision: StatCard consolidation

| File | Action | Rationale |
|------|--------|-----------|
| `atoms/StatCard.tsx` | Keep & refactor | Has decorative icon + gradient bg — richer API |
| `molecules/StatCard.tsx` | Delete | Only used by VoucherStatsCards; adapt consumers to atoms version |

Keep `atoms/StatCard` as the canonical card. Update `VoucherStatsCards` import and interface.

### Decision: Replacement strategy — batch by file cluster

Not all replacements are equal. Split into 3 task groups:

1. **Component library** (atoms/ — ~15 replacements): Spinner, Alert, StatusBadge, EventIcon. Few files, well-scoped, easy to verify.
2. **StatCard consolidation + feature file colors** (~60 replacements): VoucherStatsCards, VoucherTableRow, InstitutionCard, etc. Larger files, higher risk of visual regression.
3. **Accessibility** (~10 files): `aria-hidden` on Lucide icons, `role="alert"` on Alert, `prefers-reduced-motion` in Spinner/animate-in.

### Decision: LowStockAlert amber palette — custom token

LowStockAlert uses `amber-900/700/300/200/950` — a full custom palette, not just status-warning. Create `--color-warning-soft` / `--color-warning-strong` in `@theme` rather than ad-hoc dark/light overrides.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/index.css` | Modify | Add `--color-status-*`, `--color-warning-*` tokens to `@theme` |
| `apps/web/src/components/atoms/Spinner.tsx` | Modify | `border-t-blue-600` → `border-t-app-primary`; add reduced-motion |
| `apps/web/src/components/atoms/Alert.tsx` | Modify | Hardcoded colors → status tokens; add `role="alert"`; add `aria-hidden` to icons |
| `apps/web/src/components/atoms/StatusBadge.tsx` | Modify | All status colors → `--color-status-*` tokens |
| `apps/web/src/components/atoms/EventIcon.tsx` | Modify | `text-emerald-500`/`text-amber-500` → status tokens; add `aria-hidden` |
| `apps/web/src/components/atoms/StatCard.tsx` | Modify | Add `aria-hidden` to decorative icon; accept `colorClass` as status tokens |
| `apps/web/src/components/atoms/Input.tsx` | Modify | `text-red-500` → `text-status-error` |
| `apps/web/src/components/molecules/StatCard.tsx` | Delete | Merged into atoms/StatCard |
| `apps/web/src/components/errors/AppErrorBoundary.tsx` | Modify | `text-red-600` → `text-status-error` |
| `apps/web/src/features/dashboard/components/vouchers/VoucherStatsCards.tsx` | Modify | Hardcoded emerald/amber/rose → status tokens; use atoms/StatCard |
| `apps/web/src/features/dashboard/components/vouchers/VoucherTableRow.tsx` | Modify | ~8 hardcoded color instances → tokens |
| `apps/web/src/features/dashboard/components/vouchers/VoucherEmitForm.tsx` | Modify | emerald/rose → status tokens |
| `apps/web/src/features/dashboard/components/vouchers/VoucherBatchRow.tsx` | Modify | emerald/rose → status tokens |
| `apps/web/src/features/dashboard/components/vouchers/VoucherSessionsTable.tsx` | Modify | emerald/amber/rose → status tokens |
| `apps/web/src/features/dashboard/components/vouchers/BatchDetailDrawer.tsx` | Modify | rose → status tokens |
| `apps/web/src/features/dashboard/components/institucion/LowStockAlert.tsx` | Modify | Amber palette → `--color-warning-*` tokens |
| `apps/web/src/features/dashboard/components/session-detail/SessionClinicalInsights.tsx` | Modify | emerald/rose → status tokens |
| `apps/web/src/features/dashboard/components/session-detail/SessionReportButton.tsx` | Modify | emerald/rose → status tokens |
| `apps/web/src/features/dashboard/components/session-detail/BehavioralMethodologyPanel.tsx` | Modify | emerald/rose → status tokens |
| `apps/web/src/features/dashboard/components/overview/AdminAlerts.tsx` | Modify | emerald/amber/red → status tokens |
| `apps/web/src/features/dashboard/components/overview/ActivityFeed.tsx` | Modify | emerald/amber → status tokens |
| `apps/web/src/features/dashboard/components/overview/QuickActions.tsx` | Modify | amber → status tokens |
| `apps/web/src/features/dashboard/components/Sidebar.tsx` | Modify | rose → `--color-status-error` |
| `apps/web/src/features/dashboard/components/users/InstitutionCard.tsx` | Modify | emerald/amber/rose → status tokens |
| `apps/web/src/features/dashboard/components/results/UserSessionGroup.tsx` | Modify | emerald → status tokens |
| `apps/web/src/features/dashboard/views/DashboardResults.tsx` | Modify | emerald → status tokens |
| `apps/web/src/features/dashboard/views/NotFoundFeature.tsx` | Modify | rose → status-error tokens |
| `apps/web/src/features/dashboard/views/DashboardSettings.tsx` | Modify | emerald → status tokens |
| `apps/web/src/features/dashboard/views/InstitutionDashboardOverview.tsx` | Modify | emerald/rose → status tokens |
| `apps/web/src/features/dashboard/views/DashboardOverview.tsx` | Modify | emerald → status tokens |
| `apps/web/src/features/dashboard/views/InstitutionDetailOverview.tsx` | Modify | emerald → status tokens |

## Token Mapping

```ts
// @theme additions in index.css
--color-status-success: var(--color-status-success);  // #43A047
--color-status-error: var(--color-status-error);      // #E53935
--color-status-warning: var(--color-status-warning);  // #F59E0B

// LowStockAlert custom palette
--color-warning-bg: var(--color-warning-soft);
--color-warning-border: var(--color-warning-medium);
--color-warning-text: var(--color-warning-strong);

// Replacement rule:
// text-emerald-500       → text-status-success
// bg-emerald-500/10      → bg-status-success/10
// border-emerald-500/30  → border-status-success/30
// text-rose-500          → text-status-error
// text-red-500           → text-status-error
// text-amber-500         → text-status-warning
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Atom components after token swap | Visual snapshot of rendered classes (Vitest) |
| Integration | Feature pages with status colors | Component mount check — no hardcoded classes remain |
| E2E | N/A | No structural change; visual only |

Verify with `rg -c "text-(emerald\|amber\|rose\|red\|blue)-" apps/web/src/` — target zero matches post-apply.

## Risk Analysis

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| ~90 replacements across 30 files | High | Split into 3 task groups; each group is a chained PR slice |
| Visual regression on dashboard cards | Medium | Manual visual inspection of VoucherStatsCards after StatCard refactor |
| Opacity handling breaks | Low | Tailwind v4 handles `bg-status-success/10` natively if defined in `@theme` |

## Migration / Rollout

No data migration. Per-group PRs: (1) atoms + index.css, (2) feature colors, (3) accessibility. Each independently mergeable and reverible.

## Open Questions

- [ ] LowStockAlert amber palette — should it use a dedicated `--color-warning-*` set or absorb into `--color-status-warning` variants?
- [ ] StatCard atoms vs molecules — the atoms version has decorative icon/gradient/border props; is this the canonical card for all dashboard usage?

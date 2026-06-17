# Tasks: Admin Panel Redesign — Centro de Mando

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~550-650 (moves count as +del/-del) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Delivery strategy (assumed) | ask-on-risk |
| Chain strategy suggestion | stacked-to-main |

```
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High
```

### Suggested Work Units

| Unit | Goal | Likely PR | Base |
|------|------|-----------|------|
| 1 | Foundation — new components (Breadcrumbs, HealthBar, BehavioralTrendsSection) + move trend charts | PR 1 | main |
| 2 | Nav refactor — NavItem `roles[]`, Sidebar filter, useDashboardTitle | PR 2 | main (independent of PR 1) |
| 3 | Feature integration — Centro de Mando, DashboardResults trends, DashboardUsers tabs, InstitutionDetail cleanup | PR 3 | main (after PR 1) |

---

## Phase 1: Foundation — New Components & File Moves

*Non-breaking. Can be reviewed and merged independently.*

### T-1.1 Create Breadcrumbs component

**Description**: Create `components/Breadcrumbs.tsx` — reusable component that reads current route path segments and resolves display labels from a route map.

**Acceptance Criteria**:
- Renders path segments as clickable links, last segment as plain text
- Handles root `/dashboard` and all sub-routes
- Accepts optional `routeMap` prop to override display labels
- Returns null when not inside a router context (no crash)

**Dependencies**: None
**Estimated Effort**: Small (1-2h)
**Status**: Complete

### T-1.2 Create HealthBar component

**Description**: Create `components/admin/HealthBar.tsx` with traffic-light indicators for alerts count, completion rate, and triage count. Each indicator links to a relevant section.

**Acceptance Criteria**:
- Render 3 indicators with color mapping: green (≥80%), yellow (50-79%), red (<50%)
- Links navigate correctly: completion → `/dashboard/results`, alerts → `/dashboard/users`, triage → `/dashboard`
- Undefined/missing props default to zero with green status
- Triage count > 999 shows formatted value (e.g., "1.2k")

**Dependencies**: None
**Estimated Effort**: Medium (2-4h)
**Status**: Complete

### T-1.3 Create BehavioralTrendsSection wrapper

**Description**: Create `components/results/BehavioralTrendsSection.tsx` that renders SelectivityDonut, FatigueGauge, and RushGauge side by side.

**Acceptance Criteria**:
- Accepts `trends: BehavioralTrends` prop
- Renders all three gauges in a responsive grid
- Shows subtle empty state when trends data is null

**Dependencies**: None (uses types only)
**Estimated Effort**: Small (1-2h)
**Status**: Complete

### T-1.4 Move trend charts to `results/`

**Description**: Move `SelectivityDonut.tsx`, `FatigueGauge.tsx`, `RushGauge.tsx` from `components/admin/` to `components/results/`. Update all import paths.

**Acceptance Criteria**:
- Files moved to `components/results/` with no content changes
- All imports updated across the project (no broken references)
- Old files in `components/admin/` removed

**Dependencies**: None
**Estimated Effort**: Small (1-2h)
**Status**: Complete

### T-1.5 (Discovery) Investigate backend endpoint for Professionals list

**Description**: Check if backend can list users by `THERAPIST` role. If not, create minimal endpoint. The DashboardUsers "Profesionales" tab needs a list of therapist users.

**Acceptance Criteria**:
- Existing API reviewed — if available, document approach; if unavailable, create `GET /users?role=THERAPIST`
- Returns user id, name, email, institutionId, status
- No regression on existing institution endpoints

**Dependencies**: None
**Estimated Effort**: Medium (2-4h) if endpoint needed; Small (1h) if discovery only
**Status**: Optional — skip if existing data is sufficient

---

## Phase 2: Nav/Constants Refactor

*Independent of Phase 1. Changes are contained to navigation infrastructure.*

### T-2.1 Update NavItem interface and DASHBOARD_NAV_ITEMS

**Description**: In `constants/navigation.ts`, change `NavItem.adminOnly: boolean` to `NavItem.roles: ('ADMIN' | 'THERAPIST')[]`. Update `DASHBOARD_NAV_ITEMS` to assign roles per item. Admin items get `roles: ['ADMIN']`, shared items get `roles: ['ADMIN', 'THERAPIST']`. Therapist-only items get `roles: ['THERAPIST']`.

**Acceptance Criteria**:
- Interface change compiles without errors
- Every nav item has explicit `roles` array
- No leftover `adminOnly` references

**Dependencies**: None
**Estimated Effort**: Small (~1h)
**Status**: Complete

### T-2.2 Refactor Sidebar for role-based filtering

**Description**: In `Sidebar.tsx`, replace `adminOnly` filtering with `item.roles.includes(user.role)`. Remove `isAdmin` prop if present. Ensure mobile toggle still works.

**Acceptance Criteria**:
- Admin sees: Panel General, Instituciones, Profesionales, Vouchers, Configuración
- Therapist sees: Resultados, Mi Panel (or "Cambio de contraseña" for settings)
- Unrecognized roles fall back to minimum nav (no crash)
- Mobile `onCloseMobile` continues to work

**Dependencies**: T-2.1
**Estimated Effort**: Small (1-2h)
**Status**: Complete

### T-2.3 Update useDashboardTitle for new nav structure

**Description**: In `hooks/useDashboardTitle.ts`, ensure title resolution works with the new `roles[]` nav items. Map route paths to display titles.

**Acceptance Criteria**:
- Dashboard page titles resolve correctly for both roles
- No duplicate or missing title keys

**Dependencies**: T-2.1
**Estimated Effort**: Small (~1h)
**Status**: Complete

---

## Phase 3: Feature Integration

*Depends on Phase 1 (needs HealthBar, BehavioralTrendsSection, moved charts).*

### T-3.1 Refactor DashboardOverview to Centro de Mando

**Description**: In `views/DashboardOverview.tsx`, replace generic stats with Centro de Mando layout: HealthBar (top) + SessionsChart + QuickActions + ActivityFeed (side-by-side). Remove ResultsDistributionChart. Keep loading state with spinner ("Sincronizando panel operativo").

**Acceptance Criteria**:
- Admin path renders: HealthBar, SessionsChart, QuickActions, ActivityFeed
- No ResultsDistributionChart in admin layout
- Period selector updates HealthBar + SessionsChart data
- Loading state shows spinner with correct text
- Therapist view (`InstitutionDashboardOverview`) unchanged

**Dependencies**: T-1.2, T-2.2
**Estimated Effort**: Medium (3-4h)
**Status**: Complete

### T-3.2 Add behavioral trends to DashboardResults

**Description**: In `views/DashboardResults.tsx`, call `fetchBehavioralTrends({ scope: "global" })` and conditionally render `BehavioralTrendsSection` for THERAPIST/PSYCHOLOGIST roles. Add `trends` state and loading indicator.

**Acceptance Criteria**:
- Therapist sees SelectivityDonut, FatigueGauge, RushGauge below header
- Admin does NOT see trends on DashboardResults
- Loading state while trends fetch
- Empty state when trends return null

**Dependencies**: T-1.3, T-1.4
**Estimated Effort**: Medium (2-4h)
**Status**: Complete

### T-3.3 Remove behavioral trends from InstitutionDetailOverview

**Description**: In `views/InstitutionDetailOverview.tsx`, remove `fetchBehavioralTrends` call, `SelectivityDonut`, `FatigueGauge`, `RushGauge` imports and their render blocks. Keep only stat cards.

**Acceptance Criteria**:
- Institution detail shows only stat cards (vouchers, tests)
- No behavioral trend imports in file
- Build passes with no dangling imports

**Dependencies**: T-1.4
**Estimated Effort**: Small (~1h)
**Status**: Complete

### T-3.4 Add tabs to DashboardUsers

**Description**: In `views/DashboardUsers.tsx`, add `activeTab` state (`'institutions' | 'professionals'`). Render two tabs: "Instituciones" and "Profesionales". Default to "Instituciones". Wrap existing institution content under first tab; show therapist list under second. Preserve all existing CRUD on institutions tab.

**Acceptance Criteria**:
- Default tab is "Instituciones" with full CRUD intact
- "Profesionales" tab shows therapist list (name, email, institution, status)
- Tab state resets on navigation away/back
- No therapists found → empty state, not error
- URL params preserved when switching tabs

**Dependencies**: T-1.5 (optional — if backend endpoint needed)
**Estimated Effort**: Medium (3-4h)
**Status**: Complete

---

## Phase 4: Verification & Cleanup

### T-4.1 Remove dead code and unused imports

**Description**: Remove `AdminAlerts.tsx` and `ResultsDistributionChart.tsx` imports from DashboardOverview if no longer used. Run linter and type checker.

**Acceptance Criteria**:
- [x] `pnpm --filter web run lint` passes
- [x] `tsc --noEmit` passes with no errors
- [x] No dead imports remaining

**Dependencies**: T-3.1, T-3.2, T-3.3
**Estimated Effort**: Small (~1h)
**Status**: Complete — lint fixed (hooks rule in Breadcrumbs, unused className in test mocks, any types in tooltip components), build passes clean

### T-4.2 Write unit tests

**Description**: Write Vitest + Testing Library tests for: Sidebar role-based filtering (ADMIN vs THERAPIST), HealthBar indicator color mapping, DashboardUsers tab toggle.

**Acceptance Criteria**:
- [x] Sidebar test: ADMIN sees 5 items, THERAPIST sees 3, unrecognized falls back to therapist
- [x] HealthBar test: completionRate thresholds, alertsCount thresholds, triageCount thresholds, default props → correct color class per indicator
- [x] DashboardUsers test: URL params read/default/preserve, tab switching
- [x] All tests pass with `pnpm --filter web run test`

**Dependencies**: T-1.2, T-2.2, T-3.4
**Estimated Effort**: Medium (2-4h)
**Status**: Complete — 23 new tests added (7 Sidebar, 16 HealthBar) + 4 URL param tests for DashboardUsers, all 128 tests pass

### T-4.3 Verify all routes and role-based navigation

**Description**: Manual verification — navigate every dashboard route as ADMIN and as THERAPIST. Confirm sidebar shows correct items, routes render correct views, breadcrumbs present.

**Acceptance Criteria**:
- Every sidebar link renders correct outlet content
- URL access by unauthorized role redirects (existing guards)
- Breadcrumbs present on all dashboard pages
- No console errors or 404s in route transitions

**Dependencies**: All previous tasks
**Estimated Effort**: Small (1-2h)

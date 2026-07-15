# Apply Progress — Phase 3: Feature Integration

## TDD Cycle Evidence

| Task | RED (test written) | GREEN (passes) | REFACTOR |
|------|-------------------|----------------|----------|
| T-3.1 DashboardOverview Centro de Mando | DashboardOverview.test.tsx — 6 tests | ✅ All 6 pass | ✅ Unused TrendingUp import removed |
| T-3.2 DashboardResults behavioral trends | DashboardResults.test.tsx — 2 tests | ✅ All 2 pass | ✅ No refactor needed |
| T-3.3 InstitutionDetailOverview cleanup | InstitutionDetailOverview.test.tsx — 3 tests | ✅ All 3 pass | ✅ No refactor needed |
| T-3.4 DashboardUsers tabs | DashboardUsers.test.tsx — 5 tests | ✅ All 5 pass | ✅ Async assertions added (waitFor) |

## Completed Tasks

- [x] T-3.1 Refactor DashboardOverview to Centro de Mando
- [x] T-3.2 Add behavioral trends to DashboardResults
- [x] T-3.3 Remove behavioral trends from InstitutionDetailOverview
- [x] T-3.4 Add tabs to DashboardUsers

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `apps/web/src/features/dashboard/views/DashboardOverview.tsx` | Modified | Added HealthBar, removed ResultsDistributionChart, removed unused imports |
| `apps/web/src/features/dashboard/views/DashboardResults.tsx` | Modified | Added fetchBehavioralTrends, BehavioralTrendsSection for therapists |
| `apps/web/src/features/dashboard/views/InstitutionDetailOverview.tsx` | Modified | Removed behavioral trends (imports, state, effect, render), kept stat cards |
| `apps/web/src/features/dashboard/views/DashboardUsers.tsx` | Modified | Added tabs (Instituciones/Profesionales) with useSearchParams sync |
| `apps/web/src/features/dashboard/views/__tests__/DashboardOverview.test.tsx` | Created | 6 tests: HealthBar, SessionsChart, QuickActions, no ResultsDistributionChart, no AdminAlerts, loading state |
| `apps/web/src/features/dashboard/views/__tests__/DashboardResults.test.tsx` | Created | 2 tests: therapist sees trends, admin does NOT |
| `apps/web/src/features/dashboard/views/__tests__/InstitutionDetailOverview.test.tsx` | Created | 3 tests: stat cards, no trends section, no fetchBehavioralTrends call |
| `apps/web/src/features/dashboard/views/__tests__/DashboardUsers.test.tsx` | Created | 5 tests: tabs render, default institutions, switch to profesionales, empty state, CRUD preserved |

## Deviations from Design

None — implementation matches design.

## Issues Found

- `DashboardUsers.test.tsx` needed `waitFor` wrappers for async tab-switching assertions (fetchTherapists is async)
- `DashboardOverview.tsx` had unused `TrendingUp` import — removed during refactor
- `lucide-react` global mock with Proxy did NOT work with Vitest hoisting — used `importOriginal` pattern for all view tests
- React Router v7 uses a different API than v6 — `MemoryRouter` still works but `useSearchParams` behavior required extra `waitFor` handling

## Test Results

- **Phase 3 tests**: 16/16 passed
- **Full safety net**: 101/101 passed (up from 85 baseline)
- **Build**: `pnpm --filter web run build` passes successfully

## Workload / PR Boundary

- **Mode**: single PR slice (Unit 3 of stacked-to-main chain)
- **Current work unit**: Phase 3 Feature Integration (T-3.1 through T-3.4)
- **Boundary**: Depends on Phase 1 (HealthBar, BehavioralTrendsSection, moved charts) and Phase 2 (nav/constants refactor)
- **Baseline**: PR 1 and PR 2 already merged

## Status

4/4 tasks complete. Ready for verify.

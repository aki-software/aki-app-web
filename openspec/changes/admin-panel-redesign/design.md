# Design: Admin Panel Redesign — Centro de Mando

## Technical Approach

Refactor the dashboard as a role-aware "Command Center" using existing data sources, no new endpoints. Strategy: (1) change `NavItem.adminOnly` → `roles[]` for flexible filtering, (2) compose HealthBar from `adminStats.alerts` + triage count, (3) relocate behavioral trend components from `admin/` to `results/` and call `fetchBehavioralTrends({ scope: "global" })` from DashboardResults, (4) add tabs to DashboardUsers without splitting the route.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `roles: ('ADMIN'\|'THERAPIST')[]` vs role-based map | Per-item array is simpler to read, map is more DRY for large sets | Array — only 5 items, explicit > magic |
| Separate `DashboardUsersInstitutions` + `DashboardUsersProfessionals` routes vs tabs in one view | Routes add router churn, tabs keep URL state and avoid lazy-loading split | Tabs — one route, one view, one fetch |
| Global behavioral trends vs therapist-scoped | Backend only supports `scope: "global"\|"institution"` — no therapist scope yet | Call with `scope: "global"` now, add `"therapist"` scope when backend supports it |
| HealthBar as separate query vs derived from existing adminStats | Re-fetching adds latency; adminStats already has `alerts` | Derive alerts + completionRate from `adminStats`, add triage count from existing `fetchTriageSessions` |

## Data Flow

```
DashboardOverview (admin)
  ├── useAdminDashboardStats() ──→ fetchDashboardStats(days)
  │     └── adminStats.alerts ──→ HealthBar alertsCount
  │     └── adminStats.completionRate ──→ HealthBar completion indicator
  └── fetchTriageSessions({ limit: 1 }) ──→ triage count ──→ HealthBar triage indicator

DashboardResults (therapist)
  ├── fetchSessionsList() ──→ sessions (existing)
  ├── fetchBehavioralTrends({ scope: "global", period: 30 }) ──→ trends
  │     └── trends.selectivityDistribution ──→ SelectivityDonut
  │     └── trends.fatigueRate ──→ FatigueGauge
  │     └── trends.rushRate ──→ RushGauge
  └── TriageList (existing, unchanged)

Sidebar
  └── DASHBOARD_NAV_ITEMS.filter(item => item.roles.includes(user.role))
```

## Component Tree

```
DashboardLayout
├── Sidebar (items filtered by user.role)
├── Breadcrumbs (reusable, reads current route)
└── <Outlet>
    ├── DashboardOverview (admin)
    │   ├── HealthBar (alerts + completion + triage indicators)
    │   ├── SessionsChart
    │   ├── QuickActions
    │   └── ActivityFeed
    ├── DashboardResults (therapist & admin)
    │   ├── TriageList (therapist only)
    │   ├── BehavioralTrendsSection (therapist only)
    │   │   ├── SelectivityDonut
    │   │   ├── FatigueGauge
    │   │   └── RushGauge
    │   └── SessionGroupList
    ├── DashboardUsers (admin only)
    │   ├── Tabs (Instituciones | Profesionales)
    │   └── InstitutionTable / ProfessionalTable
    └── InstitutionDetailOverview (admin, no behavioral trends)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `components/Breadcrumbs.tsx` | Create | Reusable breadcrumb from path segments + route map |
| `components/admin/HealthBar.tsx` | Create | Traffic-light indicators: alerts, completion rate, triage count |
| `components/results/BehavioralTrendsSection.tsx` | Create | Wrapper component for the 3 trend charts |
| `constants/navigation.ts` | Modify | `adminOnly: boolean` → `roles: ('ADMIN'\|'THERAPIST')[]` |
| `components/Sidebar.tsx` | Modify | Use `item.roles.includes(user.role)` filter; remove `isAdmin` logic |
| `views/DashboardOverview.tsx` | Modify | Admin path renders Centro de Mando (HealthBar + SessionsChart + QuickActions + ActivityFeed); keep `InstitutionDashboardOverview` for non-admin |
| `views/DashboardResults.tsx` | Modify | Add `fetchBehavioralTrends` + conditional `BehavioralTrendsSection` for therapist |
| `views/DashboardUsers.tsx` | Modify | Add `activeTab` state, split institution list vs professional list |
| `views/InstitutionDetailOverview.tsx` | Modify | Remove `fetchBehavioralTrends`, `SelectivityDonut`, `FatigueGauge`, `RushGauge` imports |
| `components/admin/SelectivityDonut.tsx` | Move | `admin/` → `results/` |
| `components/admin/FatigueGauge.tsx` | Move | `admin/` → `results/` |
| `components/admin/RushGauge.tsx` | Move | `admin/` → `results/` |
| `hooks/useDashboardTitle.ts` | Modify | Ensure title resolution works with new nav structure |
| `components/overview/AdminAlerts.tsx` | Unchanged | Replaced by HealthBar but kept as fallback; remove if unused after QA |
| `components/overview/ResultsDistributionChart.tsx` | Unchanged | Remove from DashboardOverview if not used in Centro de Mando |

## Interfaces / Contracts

### NavItem (refactored)

```typescript
export interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  roles: Array<'ADMIN' | 'THERAPIST'>;
}
```

### HealthBar Props

```typescript
interface HealthBarProps {
  alertsCount: number;
  criticalAlertsCount: number;
  completionRate: number;
  triageCount: number;
  periodLabel: string;
}
```

### BehavioralTrendsSection Props

```typescript
interface BehavioralTrendsSectionProps {
  trends: BehavioralTrends;
}
```

## State Changes

| Component | New State | Type |
|-----------|-----------|------|
| DashboardOverview | `triageCount` (derived from fetch) | `number` |
| DashboardResults | `trends` | `BehavioralTrends \| null` |
| DashboardResults | `trendsLoading` | `boolean` |
| DashboardUsers | `activeTab` | `'institutions' \| 'professionals'` |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Sidebar filtering by role | Render with mock user ADMIN → see nav items; THERAPIST → restricted set |
| Unit | HealthBar indicators | Pass known counts, assert color/class mapping |
| Unit | DashboardUsers tab toggle | Click tab, assert visible content changes |
| Integration | DashboardResults + trends | Mock `fetchBehavioralTrends`, assert donut + gauges render |
| Integration | Navigation flow | Router integration: click sidebar item → verify outlet content |
| E2E | Out of scope | No E2E infra available |

## Migration / Rollout

**Phase 1** (non-breaking): Create Breadcrumbs + HealthBar + BehavioralTrendsSection components. Move trend charts to `results/`. Update imports. No behavioral changes.

**Phase 2** (refactor): Change `NavItem.adminOnly` → `roles[]`. Update Sidebar, useDashboardTitle. All existing routes continue to work.

**Phase 3** (feature): Add HealthBar to DashboardOverview, trends to DashboardResults, tabs to DashboardUsers. Remove trends from InstitutionDetailOverview.

**Rollback**: Revert files in reverse phase order. Phase 1 components can stay; unused imports cause no harm.

## Open Questions

- [ ] Therapist scope: does backend need a `scope: "therapist"` in `fetchBehavioralTrends`? Currently uses "global" — acceptable for MVP but therapist-specific data would be more relevant
- [ ] The professionals list in DashboardUsers: does it require a new API call or can we derive from existing `institutions` data (via `responsibleTherapist`)? Needs backend scope: list users by role

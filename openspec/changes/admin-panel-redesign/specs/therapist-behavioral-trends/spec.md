# Spec: therapist-behavioral-trends

## Purpose

Move behavioral trends (SelectivityDonut, FatigueGauge, RushGauge) from `InstitutionDetailOverview` (admin-only) to `DashboardResults` (therapist view). Therapists see their own aggregated behavioral data. Admins lose trends on institution detail pages.

## Requirements

### REQ-1: Trends visible in DashboardResults for therapists

`DashboardResults` MUST render SelectivityDonut, FatigueGauge, and RushGauge when the authenticated user is a therapist or psychologist.

#### Scenario: Therapist sees behavioral trends

**Given** the authenticated user has role `THERAPIST` or `PSYCHOLOGIST`  
**When** navigating to `/dashboard/results`  
**Then** the view MUST show SelectivityDonut, FatigueGauge, and RushGauge below the header  
**And** the trends MUST use the therapist's own aggregated data via `fetchBehavioralTrends`

#### Scenario: Admin does NOT see trends in results

**Given** the authenticated user has role `ADMIN`  
**When** navigating to `/dashboard/results`  
**Then** behavioral trends MUST NOT render

### REQ-2: Trends removed from InstitutionDetailOverview

`InstitutionDetailOverview` MUST NOT render behavioral trends. The component keeps only stat cards.

#### Scenario: Institution detail shows only stats

**Given** an admin navigates to `/dashboard/institutions/:id`  
**When** the detail view renders  
**Then** it MUST show only the stat cards (vouchers, tests)  
**And** MUST NOT import or render SelectivityDonut, FatigueGauge, RushGauge

### REQ-3: Trends data per therapist

`fetchBehavioralTrends` MUST be called with scope or parameter identifying the authenticated therapist.

#### Scenario: Trends fetch for therapist

**Given** a therapist views DashboardResults  
**When** the component mounts  
**Then** `fetchBehavioralTrends` MUST be called with `{ scope: "therapist", id: user.id }` or equivalent  
**And** the result MUST render in the three trend components

## Edge Cases

- Trends API returns null — trend section renders empty with a subtle empty state
- Therapist has no session data — all trends show zero/neutral values, not broken
- Admin on institution detail — no trends section at all, only stat cards remain

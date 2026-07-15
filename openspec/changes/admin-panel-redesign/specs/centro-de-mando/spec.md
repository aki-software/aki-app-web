# Spec: centro-de-mando

## Purpose

Refactor `DashboardOverview` (admin view) into a command center called "Centro de Mando". Replace generic stat sections with HealthBar + SessionsChart + QuickActions + ActivityFeed. Remove ResultsDistributionChart from primary layout.

## Requirements

### REQ-1: Centro de Mando layout

Admin `DashboardOverview` MUST render: HealthBar (top), SessionsChart + summary, QuickActions + ActivityFeed (side-by-side).

#### Scenario: Admin sees command center

**Given** the authenticated user has role `ADMIN`  
**When** navigating to `/dashboard`  
**Then** the view MUST show HealthBar, SessionsChart, QuickActions, and ActivityFeed  
**And** MUST NOT show ResultsDistributionChart

#### Scenario: Period selector still works

**Given** an admin is on Centro de Mando  
**When** changing the period selector  
**Then** SessionsChart and HealthBar data MUST update accordingly

### REQ-2: ResultsDistributionChart removed

`ResultsDistributionChart` MUST be removed from the main admin dashboard layout.

#### Scenario: Therapist view unchanged

**Given** the authenticated user is a therapist  
**When** navigating to `/dashboard`  
**Then** the existing `InstitutionDashboardOverview` MUST render unchanged

### REQ-3: Loading state preserved

DashboardOverview MUST show a loading spinner while `useAdminDashboardStats` is fetching.

#### Scenario: Loading state

**Given** `adminStats` is loading  
**When** DashboardOverview renders  
**Then** it MUST display `Spinner` with "Sincronizando panel operativo"

## Edge Cases

- Stats return null/undefined — HealthBar defaults to zeros, SessionsChart shows empty state
- No sessions activity — SessionsChart renders an empty state message instead of broken chart

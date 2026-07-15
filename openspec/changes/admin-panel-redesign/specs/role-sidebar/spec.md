# Spec: role-sidebar

## Purpose

Replace the `adminOnly` boolean filter on sidebar nav items with a role-based system. Each nav item declares an `roles` array. The sidebar renders items matching the authenticated user's role.

## Requirements

### REQ-1: Role-based nav item model

`NavItem.roles` MUST replace `NavItem.adminOnly`. Each item specifies allowed roles as `("ADMIN" | "THERAPIST" | "PSYCHOLOGIST")[]`.

#### Scenario: Admin sees full nav

**Given** the authenticated user has role `ADMIN`  
**When** the sidebar renders  
**Then** it MUST show: Panel General, Instituciones, Profesionales, Vouchers, Configuración

#### Scenario: Therapist sees limited nav

**Given** the authenticated user has role `THERAPIST` or `PSYCHOLOGIST`  
**When** the sidebar renders  
**Then** it MUST show only: Resultados, Mi Panel  
**And** institution/admin-only items MUST be hidden

### REQ-2: No route protection regressions

Routing MUST NOT rely solely on sidebar visibility — existing route guards per page remain in place.

#### Scenario: URL access blocked for unauthorized role

**Given** a therapist navigates directly to `/dashboard/users`  
**When** the route renders  
**Then** the existing admin-only guard MUST redirect to `/dashboard`

### REQ-3: Sidebar labels contextual by role

Item labels MAY adapt based on role context (e.g., "Configuración" vs "Cambio de contraseña" for non-admin).

#### Scenario: Settings label differs by role

**Given** the authenticated user is a therapist  
**When** the sidebar renders "Configuración"  
**Then** the label MUST display "Cambio de contraseña"

## Edge Cases

- Unrecognized or future roles render the minimum viable nav (Resultados only) — MUST NOT throw
- Sidebar mobile toggle (`onCloseMobile`) MUST continue to work unchanged

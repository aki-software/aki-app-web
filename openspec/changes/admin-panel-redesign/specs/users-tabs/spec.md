# Spec: users-tabs

## Purpose

Split `DashboardUsers` into two visual sections via tabs: "Instituciones" (real institutions + particulares) and "Profesionales" (internal therapists). Maintain a single page — no route split. Keep existing CRUD intact.

## Requirements

### REQ-1: Tabbed view

`DashboardUsers` MUST render two tabs: "Instituciones" and "Profesionales" at the top. Only one tab's content is visible at a time.

#### Scenario: Admin switches between tabs

**Given** an admin is on `/dashboard/users`  
**When** clicking the "Profesionales" tab  
**Then** the view MUST show the therapists list  
**And** the institution CRUD form and list MUST be hidden

#### Scenario: Default tab is "Instituciones"

**Given** an admin navigates to `/dashboard/users`  
**When** the page loads  
**Then** the "Instituciones" tab MUST be active by default  
**And** institution list MUST be visible

### REQ-2: Professionistas tab shows internal therapists

The "Profesionales" tab MUST display therapists whose `institutionId` is set (internal therapists), grouped or listed.

#### Scenario: Professionales list renders

**Given** the admin is on the "Profesionales" tab  
**When** the data loads  
**Then** it MUST show a list of therapist users (not institutions)  
**And** each entry MUST display name, email, associated institution, and status

### REQ-3: Existing institution CRUD preserved

The "Instituciones" tab MUST retain all current functionality: create form, filter, pagination, edit modal, toggle status, delete, resend activation, create operational account, navigate to overview.

#### Scenario: Institution creation works

**Given** the admin is on "Instituciones" tab  
**When** filling and submitting the create form  
**Then** the institution MUST be created  
**And** the list MUST refresh

## Edge Cases

- No therapists exist — "Profesionales" tab shows an empty state, not an error
- Tab state resets on navigation away and back — default tab is "Instituciones"
- Existing URL query params or filters are preserved when switching tabs

# Spec: health-bar

## Purpose

Independent component showing traffic-light alert indicators (completion rate, institutions with alerts, triage count). Each indicator includes a color code and a direct link to the relevant detail page.

## Requirements

### REQ-1: Traffic-light indicators

The HealthBar MUST display each alert category with a color-coded badge: green (healthy), yellow (warning), red (critical).

#### Scenario: All indicators healthy

**Given** completion rate >= 80%, zero institutions with alerts, zero triage items  
**When** the HealthBar renders  
**Then** all indicators MUST show green status

#### Scenario: Critical completion rate

**Given** completion rate < 50%  
**When** the HealthBar renders  
**Then** the completion rate indicator MUST show red status  
**And** MUST link to `/dashboard/results`

### REQ-2: Direct links from indicators

Each indicator MUST be a clickable link navigating to the relevant section.

#### Scenario: Institutions alert navigates

**Given** at least one institution has alerts  
**When** the user clicks the "Instituciones con alertas" indicator  
**Then** the system MUST navigate to `/dashboard/users`

#### Scenario: Triage count link

**Given** triageCount > 0  
**When** the user clicks the triage indicator  
**Then** the system MUST navigate to `/dashboard` (scrolling to alert section)

### REQ-3: Props-driven with defaults

HealthBar MUST accept `alerts`, `triageCount`, and `completionRate` as props. Missing or `undefined` values MUST default to zero and show green status.

#### Scenario: Undefined props

**Given** HealthBar receives no props  
**When** it renders  
**Then** all indicators MUST show zero and green status  
**And** MUST NOT throw or crash

## Edge Cases

- Triage count > 999 displays formatted value (e.g., "1.2k")
- All zeros with no links — indicators render as plain text, not links

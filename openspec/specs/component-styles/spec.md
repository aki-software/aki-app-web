# Component Styles Specification

## Purpose

Define the semantic token consumption contract — which CSS custom property tokens each UI component MUST use, replacing hardcoded Tailwind color classes with `--color-*`, `--space-*`, `--radius-*`, and `--shadow-*` tokens.

## Requirements

### Requirement: Token-Driven Colors

All components MUST use `--color-*` / `--space-*` / `--radius-*` / `--shadow-*` tokens instead of hardcoded Tailwind utility color classes.
(Previously: Components used hardcoded Tailwind color utilities)

#### Scenario: No hardcoded color classes
- GIVEN any component in `apps/web/src/components/` and `apps/web/src/features/`
- WHEN scanning for Tailwind color utilities (`text-{color}-*`, `bg-{color}-*`, `border-{color}-*`)
- THEN no hardcoded color shade SHALL be present for emerald, amber, rose, or red
- AND all color references MUST use semantic `--color-*` tokens

### Requirement: Semantic Status Tokens

Status-affording components MUST use `--color-status-success`, `--color-status-error`, and `--color-status-warning` for semantic representation.

#### Scenario: Alert error state
- GIVEN Alert with `type="error"`
- WHEN it renders
- THEN its border, background, and text MUST derive from `--color-status-error`

#### Scenario: Alert success state
- GIVEN Alert with `type="success"`
- WHEN it renders
- THEN its colors MUST derive from `--color-status-success`

#### Scenario: Alert warning state
- GIVEN Alert with `type="warning"`
- WHEN it renders
- THEN its colors MUST derive from `--color-status-warning`

### Requirement: Spinner Uses App Primary

The Spinner component MUST use `--color-app-primary` for its animated accent.

#### Scenario: Spinner accent color
- GIVEN Spinner renders
- WHEN inspecting the animated border style
- THEN it MUST use `var(--color-app-primary)` or a class referencing it
- AND it MUST NOT use `border-t-blue-600` or any hardcoded color

### Requirement: StatusBadge Uses Tokens

StatusBadge MUST use `--color-status-*` tokens instead of hardcoded emerald/amber/rose colors.
(Previously: StatusBadge used emerald/amber/rose colors based on status)

#### Scenario: Active institution
- GIVEN StatusBadge with `isActive={true}`
- WHEN it renders
- THEN its colors MUST derive from `--color-status-success`

#### Scenario: Pending institution
- GIVEN StatusBadge with `isActive={false}`
- WHEN it renders
- THEN its colors MUST derive from `--color-status-warning`

#### Scenario: Expired voucher
- GIVEN voucher StatusBadge with status `EXPIRED`
- WHEN it renders
- THEN its colors MUST derive from `--color-status-error`

### Requirement: EventIcon Uses Tokens

EventIcon MUST use `--color-status-*` tokens instead of `text-emerald-500` and `text-amber-500`.
(Previously: EventIcon used hardcoded emerald and amber colors)

#### Scenario: Session completed
- GIVEN EventIcon with `type="SESSION_COMPLETED"`
- WHEN it renders
- THEN its color MUST reference `--color-status-success`

#### Scenario: Session started
- GIVEN EventIcon with `type="SESSION_STARTED"`
- WHEN it renders
- THEN its color MUST reference `--color-status-warning`

### Requirement: Button Uses App Tokens

Button SHOULD use `--color-app-*` tokens for variant styling.

#### Scenario: Primary button variant
- GIVEN a primary Button renders
- WHEN inspecting its background and border
- THEN it SHOULD use classes referencing `--color-app-primary` tokens

### Requirement: Token Naming Convention

All token references MUST follow `--color-status-*` for semantic states and `--color-app-*` for application chrome.

#### Scenario: Convention compliance
- GIVEN any component token reference
- WHEN reviewing the token name
- THEN it MUST match `--color-status-*` for status or `--color-app-*` for app chrome
- AND it MUST NOT introduce ad-hoc naming like `--color-warning-indicator`

### Requirement: StatCard Consolidation

The system MUST use a single canonical `StatCard` from `atoms/` and MUST NOT use duplicate implementations like `molecules/StatCard`.

#### Scenario: VoucherStatsCards uses canonical StatCard
- GIVEN VoucherStatsCards is rendered
- WHEN inspecting its children
- THEN it MUST use `atoms/StatCard`
- AND `atoms/StatCard` MUST accept `--color-status-*` tokens for its `colorClass` or `valueColor` props

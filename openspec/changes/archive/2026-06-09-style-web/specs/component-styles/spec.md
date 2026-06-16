# Delta for component-styles

## MODIFIED Requirements

### Requirement: Token-Driven Colors

All components MUST use `--color-*` / `--space-*` / `--radius-*` / `--shadow-*` tokens instead of hardcoded Tailwind utility color classes.
(Previously: Components used hardcoded Tailwind color utilities)

#### Scenario: No hardcoded color classes
- GIVEN any component in `apps/web/src/components/` and `apps/web/src/features/`
- WHEN scanning for Tailwind color utilities (`text-{color}-*`, `bg-{color}-*`, `border-{color}-*`)
- THEN no hardcoded color shade SHALL be present for emerald, amber, rose, or red
- AND all color references MUST use semantic `--color-*` tokens

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

## ADDED Requirements

### Requirement: StatCard Consolidation

The system MUST use a single canonical `StatCard` from `atoms/` and MUST NOT use duplicate implementations like `molecules/StatCard`.

#### Scenario: VoucherStatsCards uses canonical StatCard
- GIVEN VoucherStatsCards is rendered
- WHEN inspecting its children
- THEN it MUST use `atoms/StatCard`
- AND `atoms/StatCard` MUST accept `--color-status-*` tokens for its `colorClass` or `valueColor` props

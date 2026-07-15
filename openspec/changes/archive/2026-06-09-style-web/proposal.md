# Proposal: Style Web

## Intent

Replace hardcoded Tailwind utility colors (e.g., emerald, amber, rose) with semantic design tokens (`--color-status-*`, `--color-warning-*`) across the web application, consolidate duplicate `StatCard` implementations, and improve accessibility with `aria-hidden`, `role="alert"`, and reduced motion preferences. This ensures consistent styling, better maintainability, and improved user compliance.

## Scope

### In Scope
- Define `--color-status-success`, `error`, `warning`, and `--color-warning-*` variants in `index.css` `@theme`.
- Replace hardcoded color classes in atoms and feature components with semantic tokens.
- Consolidate `StatCard` into a single canonical version in `atoms/`.
- Add `aria-hidden="true"` to decorative icons.
- Add `role="alert"` to alert components.
- Support `prefers-reduced-motion` in spinners and animated components.

### Out of Scope
- Major redesign or layout changes of existing components.
- Structural refactoring of feature components beyond color and aria updates.
- Theme switching implementation (Dark mode, etc.).

## Capabilities

### New Capabilities
None

### Modified Capabilities
- `design-tokens`: Add semantic status and warning tokens to the application theme.
- `component-styles`: Change component styling logic to use semantic tokens instead of absolute Tailwind colors.
- `accessibility-foundation`: Add `aria-hidden`, `role="alert"`, and motion preference support.

## Approach

Replace ~90 hardcoded Tailwind color instances with semantic variables mapped from the design tokens. The work is organized into three batches to reduce risk: (1) token infrastructure and atoms, (2) feature component updates including StatCard consolidation, and (3) accessibility enhancements.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/src/index.css` | Modified | Add semantic tokens to `@theme` |
| `apps/web/src/components/atoms/` | Modified | Update Alert, Spinner, StatCard, StatusBadge, EventIcon |
| `apps/web/src/features/dashboard/` | Modified | Update dashboard overview, vouchers, and settings features |
| `apps/web/src/components/errors/` | Modified | Apply status-error tokens |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Visual regressions in dashboard cards | Medium | Manual visual inspection of refactored components like VoucherStatsCards. |
| Incomplete token replacements | Medium | Verify with `rg` scans to ensure zero hardcoded color matches. |

## Rollback Plan

Revert the specific Pull Requests containing the changes via `git revert`. Since the changes are pure styling and markup without logic changes, reverting is safe and straightforward.

## Dependencies

- Tailwind v4 variable mapping features.

## Success Criteria

- [ ] `rg` scan returns 0 matches for hardcoded colors like `emerald`, `amber`, `rose`, `red` in `apps/web/src/`.
- [ ] Test suite passes with the new token classes.
- [ ] Decorative icons have `aria-hidden="true"`.
- [ ] Alert components use `role="alert"`.
- [ ] Spinners use `prefers-reduced-motion`.

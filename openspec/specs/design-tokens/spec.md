# Design Tokens Specification

## Purpose

Define the complete design token system — color, spacing, radius, shadow, and typography scales as CSS custom properties consumed by the web and site apps.

## Requirements

### Requirement: Color Token Completeness

All palette groups MUST include complete light/dark pairs. Missing dark values for `tertiary` and `text` groups MUST be added.

#### Scenario: Complete light/dark pairs
- GIVEN tokens.json
- WHEN the build pipeline processes it
- THEN every color group MUST have both light and dark variants where applicable
- AND existing `--color-*` names MUST be unchanged

#### Scenario: Tertiary dark value present
- GIVEN the color definition for tertiary
- WHEN checking tertiary.dark
- THEN it MUST exist with a valid hex value

### Requirement: Status Color Tokens

The system MUST define `--color-status-success`, `--color-status-error`, and `--color-status-warning` for semantic state representation.

#### Scenario: Status tokens generated
- GIVEN theme.css is loaded
- WHEN a consumer checks for status tokens
- THEN `--color-status-success`, `--color-status-error`, and `--color-status-warning` MUST be available with valid hex values

### Requirement: Spacing Scale

The system MUST define `--space-1` through `--space-20` on a 4px base (`--space-N` = N × 4px).

#### Scenario: Scale consistency
- GIVEN theme.css is inspected
- WHEN checking spacing token values
- THEN `--space-1` MUST be 4px, `--space-4` = 16px, `--space-8` = 32px, `--space-20` = 80px

#### Scenario: Zero excluded
- GIVEN the spacing definition
- WHEN checking `--space-0`
- THEN it MUST NOT be defined (zero spacing is handled by Tailwind utilities)

### Requirement: Border Radius Scale

The system MUST define `--radius-sm` (4px), `--radius-md` (8px), `--radius-lg` (12px), and `--radius-xl` (16px).

#### Scenario: All radius tokens generated
- GIVEN the build pipeline runs
- WHEN inspecting theme.css
- THEN `--radius-sm`, `--radius-md`, `--radius-lg`, and `--radius-xl` MUST be present with correct px values

### Requirement: Shadow Elevation Scale

The system MUST define `--shadow-sm`, `--shadow-md`, `--shadow-lg`, and `--shadow-xl` with valid box-shadow values at increasing elevation.

#### Scenario: Semantic elevation levels
- GIVEN theme.css is loaded
- WHEN checking shadow token values
- THEN `--shadow-sm` MUST be the lowest elevation and `--shadow-xl` the highest
- AND each MUST be a valid CSS box-shadow value

### Requirement: Typography Scale

The system MUST define `--text-xs` through `--text-5xl` font size tokens and `--font-normal` (400), `--font-medium` (500), `--font-semibold` (600), `--font-bold` (700) weight tokens.

#### Scenario: Font size range
- GIVEN the generated theme.css
- WHEN checking typography tokens
- THEN `--text-xs` through `--text-5xl` MUST be present including `--text-base`

#### Scenario: Font weight tokens
- GIVEN theme.css is loaded
- WHEN checking weight tokens
- THEN `--font-normal`, `--font-medium`, `--font-semibold`, and `--font-bold` MUST be available with correct numeric values

### Requirement: Build Pipeline Output

The build pipeline MUST generate ALL new token categories as CSS custom properties in `dist/theme.css`.

#### Scenario: Multi-category output
- GIVEN build.js runs
- WHEN dist/theme.css is generated
- THEN it MUST contain `--color-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--text-*`, and `--font-*` tokens under `:root`

### Requirement: Backward Compatibility

The system MUST preserve ALL existing `--color-*` token names and values from the previous theme.css.

#### Scenario: No breaking changes
- GIVEN an existing consumer using `--color-primary`
- WHEN the updated tokens are built
- THEN `--color-primary` MUST still resolve to #0F6B68
- AND no existing `--color-*` name MAY be removed

#### Scenario: Superset only
- GIVEN the old and new theme.css token sets
- WHEN comparing them
- THEN the new output MUST be a superset of the old, with zero removals

# Accessibility Foundation Specification

## Purpose

Define component-level accessibility rules ensuring screen reader support, semantic ARIA roles, motion preference respect, and focus-visible styling using theme tokens.

## Requirements

### Requirement: Decorative Icon Marking

All decorative Lucide icons MUST have `aria-hidden="true"` to hide them from assistive technology.

#### Scenario: Alert icons hidden
- GIVEN Alert renders with an AlertCircle or CheckCircle2 icon
- WHEN inspecting the icon's SVG element
- THEN it MUST have `aria-hidden="true"`
- AND semantic information MUST be conveyed via adjacent visible text

#### Scenario: Event icons hidden
- GIVEN EventIcon renders any Lucide icon
- WHEN inspecting the SVG
- THEN it MUST have `aria-hidden="true"`
- AND the event description MUST be conveyed through adjacent text

#### Scenario: StatCard decorative icon
- GIVEN atoms/StatCard renders a background decorative icon
- WHEN inspecting the SVG
- THEN it MUST have `aria-hidden="true"`

#### Scenario: Close button icon
- GIVEN Alert with `onClose` renders
- WHEN inspecting the X icon SVG
- THEN it MUST have `aria-hidden="true"`
- AND the button MUST have an accessible label via `aria-label`

### Requirement: Alert Role

The Alert component MUST use `role="alert"` to be announced by screen readers when it appears.

#### Scenario: Alert role present
- GIVEN Alert renders with a message
- WHEN checking the outer container element
- THEN it MUST have `role="alert"`

#### Scenario: Dynamic content announcement
- GIVEN Alert renders dynamically
- WHEN the component is mounted into the DOM
- THEN the screen reader MUST announce its content immediately via `role="alert"` semantics

### Requirement: Reduced Motion

Components with reveal, scroll, or entrance animations MUST respect `prefers-reduced-motion` by disabling animations.

#### Scenario: Animation disabled at OS level
- GIVEN a component using `animate-in` or `app-fade-in-up`
- WHEN the user has `prefers-reduced-motion: reduce` set
- THEN all animations MUST be disabled
- AND the content MUST be visible immediately without animation

#### Scenario: Spinner respects motion
- GIVEN Spinner renders
- WHEN the user has `prefers-reduced-motion: reduce` set
- THEN the spin animation SHOULD pause or slow significantly

### Requirement: Focus-Visible Rings

Focus-visible ring styles MUST use theme tokens instead of hardcoded colors.

#### Scenario: Focus ring uses tokens
- GIVEN a focusable element receives keyboard focus
- WHEN inspecting the `focus-visible` ring style
- THEN it MUST use `--color-app-primary` or another `--color-*` token
- AND it MUST NOT use a hardcoded color like `ring-blue-500`

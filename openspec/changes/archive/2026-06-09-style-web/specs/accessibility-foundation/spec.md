# Delta for accessibility-foundation

## ADDED Requirements

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

#### Scenario: Spinner respects motion
- GIVEN Spinner renders
- WHEN the user has `prefers-reduced-motion: reduce` set
- THEN the spin animation SHOULD pause or slow significantly

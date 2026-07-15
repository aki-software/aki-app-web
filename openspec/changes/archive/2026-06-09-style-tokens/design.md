# Design: Style Tokens Foundation

## Technical Approach

Extend `packages/design-tokens` with spacing/radius/shadow/typography scales, status colors, and missing dark values — all additive (zero breaking changes). The single source of truth remains `tokens.json`; `build.js` generalizes to emit multiple CSS custom property prefixes from one pass. Consumers import the generated `theme.css` unchanged.

## Architecture Decisions

### Token Structure Extension

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Flat `tokens.json` with computed scales | Loses single source of truth readability | **Section-per-category** keeps each scale explicit and auditable |
| Computed in build.js only (no JSON) | Hides values from consumers, hard to review | **tokens.json as SSOT** — build.js reads, never computes |

**Chosen**: Add `spacing`, `radius`, `shadow`, `typography` top-level sections to `tokens.json`. Each section is a flat or two-level object that maps directly to CSS custom properties.

### Prefix Mapping Strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Hardcode per-section if/else in build.js | Brittle, needs changes for every new section | **Declarative prefix map** — one object maps paths to prefixes |
| Single recursive walk with `--{section}-` inference | `typography.size` → `--text-*` breaks the pattern | **Map with sub-key overrides** handles the typography exception |

**Chosen**: Add a `PREFIX_MAP` constant in `build.js`: `{ colors: "--color-", spacing: "--space-", radius: "--radius-", shadow: "--shadow-", "typography.size": "--text-", "typography.weight": "--font-" }`. The flatten function accepts a prefix parameter instead of hardcoding `--color-`.

### Status Token Naming & Values

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Derive `--color-status-*` from existing `actions` | Couples two concepts, changing actions affects status | **Independent values in `colors.status`** — can diverge later |
| `--color-status-*` only, no dark variants | Breaks dark mode parity | **Add `success-dark`, `error-dark`, `warning-dark`** matching existing pattern |

**Chosen**: New `colors.status` section with `success`, `error`, `warning` sub-objects (each with `DEFAULT` and `dark`). Values initially mirror `actions.confirm`, `actions.destructive`, `actions.warning`.

### Dark Values for Text & Tertiary

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Restructure `text` into `text.light`/`text.dark` groups | Breaks `--color-text-primary` — backward incompatibility | **Add `primaryDark`/`secondaryDark` camelCase keys** — generates `--color-text-primary-dark` (new), preserves existing |
| Skip `tertiary.dark` until consumer needs it | Spec requires it | **Add `tertiary.dark`** (#2A4530) — matches analogous green-darkening from `primary` pattern |

**Chosen**: Additive keys only — no renames or removals. `tertiary.dark` follows existing nested pattern; `text.primaryDark`/`text.secondaryDark` follow camelCase→kebab convention.

## Data Flow

```
tokens.json ──→ build.js ──→ dist/theme.css
  (colors,       (prefix map      (:root with ALL
   spacing,       walker +          --color-*, --space-*,
   radius,        flatten)          --radius-*, --shadow-*,
   shadow,                          --text-*, --font-*)
   typography)
                     │
                     ├── apps/web/src/index.css  (@import)
                     └── apps/site/.../global.css (@import)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/design-tokens/src/tokens.json` | Modify | Add 6 new sections (spacing, radius, shadow, typography, status, dark values) |
| `packages/design-tokens/build.js` | Modify | Generalize flatten walker with dynamic prefix map, iterate all top-level keys |
| `packages/design-tokens/dist/theme.css` | Auto | Regenerated output — superset of current |

## Interfaces / Contracts

### tokens.json (new sections)

```json
{
  "colors": {
    "tertiary": { "DEFAULT": "#4E7F52", "light": "#CDEDCB", "dark": "#2A4530" },
    "text": {
      "primary": "#1d1914", "secondary": "#44403c",
      "primaryDark": "#f5f1ec", "secondaryDark": "#a8a29e"
    },
    "status": {
      "success": { "DEFAULT": "#43A047", "dark": "#2E7D32" },
      "error":   { "DEFAULT": "#E53935", "dark": "#C62828" },
      "warning": { "DEFAULT": "#F59E0B", "dark": "#D97706" }
    }
  },
  "spacing": { "1": "4px", "2": "8px", "3": "12px", "4": "16px", "5": "20px",
    "6": "24px", "8": "32px", "10": "40px", "12": "48px", "16": "64px", "20": "80px" },
  "radius": { "sm": "4px", "md": "8px", "lg": "12px", "xl": "16px" },
  "shadow": {
    "sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "md": "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    "lg": "0 10px 15px -3px rgb(0 0 0 / 0.1)",
    "xl": "0 20px 25px -5px rgb(0 0 0 / 0.1)"
  },
  "typography": {
    "size": { "xs": "0.75rem", "sm": "0.875rem", "base": "1rem", "lg": "1.125rem",
      "xl": "1.25rem", "2xl": "1.5rem", "3xl": "1.875rem", "4xl": "2.25rem", "5xl": "3rem" },
    "weight": { "normal": "400", "medium": "500", "semibold": "600", "bold": "700" }
  }
}
```

### Generated CSS (additions to current theme.css)

```css
:root {
  /* existing 30 --color-* preserved unchanged */
  --color-tertiary-dark: #2A4530;
  --color-text-primary-dark: #f5f1ec;
  --color-text-secondary-dark: #a8a29e;
  --color-status-success: #43A047;
  --color-status-success-dark: #2E7D32;
  --color-status-error: #E53935;
  --color-status-error-dark: #C62828;
  --color-status-warning: #F59E0B;
  --color-status-warning-dark: #D97706;
  --space-1: 4px;
  --space-2: 8px;
  /* ... through --space-20: 80px */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
  --text-5xl: 3rem;
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Build | All new sections generate correct CSS vars | Node script that runs `build.js` and asserts specific vars exist in output |
| Build | Old tokens preserved unchanged | Diff old vs new output — confirm superset (zero removals) |
| Build | `tertiary.dark`, `text.*Dark` present | Assert `--color-tertiary-dark`, `--color-text-primary-dark` exist |
| Build | Spacing scale from 1–20 | Assert `--space-1` through `--space-20` with correct `4px` base |
| Integration | Web app imports updated theme.css | `pnpm --filter web build` succeeds, no CSS resolution errors |

## Migration / Rollout

No migration required. This is a pure additive change — all existing `--color-*` tokens are preserved. Consumers that do not reference the new tokens are unaffected. The `build` script output changes automatically; consumers pick up new tokens on next `pnpm build`.

## Open Questions

- None — all design decisions are resolved by the spec and existing patterns.

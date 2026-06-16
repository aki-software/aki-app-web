## Exploration: Style Improvements — Web & Site

### Current State

The monorepo has two consumer packages (`apps/web`, `apps/site`) and one design token source (`packages/design-tokens`). The design tokens package is a simple JSON-to-CSS build script that flattens `src/tokens.json` into `dist/theme.css` with kebab-case CSS custom properties under `:root`.

**apps/web** (React + Vite + Tailwind v4):
- Imports the tokens: `@import "@akit/design-tokens/dist/theme.css"`
- Defines a second layer of semantic tokens (`--color-app-*`, `--color-sidebar-*`) via `@theme` in `index.css`
- Handles dark mode via a `.dark` class override block that manually redeclares all `--color-app-*` vars
- Uses a mix of the `--color-app-*` tokens AND hardcoded Tailwind color classes (emerald-500, amber-500, etc.)
- Has utility classes (`app-card`, `app-button-primary`, etc.) with arbitrary values and hardcoded shadows

**apps/site** (Astro 6 + Tailwind v4):
- Does NOT import `@akit/design-tokens`. No dependency on the package.
- Redeclares its own color palette in `src/styles/global.css` with different variable names (`--color-bg` vs `--color-background-light`)
- Uses `--color-dark-bg` / `--color-dark-surface` variables but has NO dark mode variant — these are used directly as bg colors for dark-themed sections, not as a theme toggle
- Only preconnects Sora font — Manrope is declared in `@theme` as `--font-body` but never loaded
- Has two competing reveal animation systems: global (transition-based) and local component scoped (animation-based)
- Two pages (politica.astro, borrar-cuenta.astro) are standalone HTML with inline `<style>` — completely outside the design system

### What Was Verified vs Corrected

| Claim | Status | Notes |
|-------|--------|-------|
| Site doesn't import tokens | ✅ **Confirmed** | No dependency in package.json, redeclares colors with different names |
| Dark mode tokens incomplete | ✅ **Confirmed** | tokens.json has no `text.dark`, `tertiary.dark`, `primary-50`, etc. |
| web/index.css has hardcoded dark overrides | ✅ **Confirmed** | Lines 51-80 manually redeclare 18 `--color-app-*` vars in `.dark` |
| Spinner uses border-t-blue-600 | ✅ **Confirmed** | Line 16 — should use `--color-app-primary` |
| Alert uses red-400/30, emerald-500/10 | ✅ **Confirmed** | Lines 19-25 — hardcoded Tailwind colors |
| StatusBadge uses emerald-500/amber-500/rose-500 | ✅ **Confirmed** | Lines 13-78 — 7 instances of hardcoded status colors |
| Two StatCard components | ✅ **Confirmed** | atoms/StatCard (LucideIcon props) + molecules/StatCard (ReactNode props) — different APIs |
| Button has variant props AND utility classes | ✅ **Confirmed** | Button component uses variant, but VoucherEmitForm line 132 uses `bg-app-primary rounded-2xl` directly |
| Select styling repeated | ✅ **Confirmed** | atoms/Select.tsx, PeriodSelector.tsx, VoucherEmitForm.tsx all duplicate select styles |
| Manrope font not loaded | ✅ **Confirmed** | BaseLayout only loads Sora — Manrope declared in `@theme` but never fetched |
| politica/borrar-cuenta use inline `<style>` | ✅ **Confirmed** | Standalone HTML pages, no layout, no CSS import |
| Features component uses emoji icons | ✅ **Confirmed** | Line 22: `['📴', '♿', '🌐', '📊', '🔒', '🎯']` |
| Lucide icons lack aria-hidden | ✅ **Confirmed** | Zero `aria-hidden` attributes found across 21 component files |
| Alert uses <div> instead of role="alert" | ✅ **Confirmed** | Lines 28 — `<div>` with no semantic role |
| No prefers-reduced-motion handling | ✅ **Confirmed** | Zero matches across all apps |

### Additional Issues Discovered

1. **90+ hardcoded Tailwind color classes** across web app components (grep search found 98 matches) — all using direct `text-{color}-{shade}` / `border-{color}-{shade}` / `bg-{color}-{shade}` patterns instead of semantic token variables
2. **No spacing/radius/shadow/typography design tokens** — arbitrary values used extensively: `rounded-[24px]`, `rounded-[2rem]`, `rounded-[40px]`, `shadow-[0_18px_36px_-20px_rgba(0,0,0,0.8)]`, `p-8`, `gap-10`, `py-16`, `text-[10px]`, `text-[11px]`
3. **Site has no dark mode variant defined** — `--color-dark-*` vars exist but are used directly as bg colors for sections (Hero, HowItWorks, Radar, Pricing, Footer) rather than via a `.dark` media/class variant
4. **Competing reveal systems** — global.css has transition-based `.reveal { opacity: 0; transition... }` but Hero, Problem, Maintenance have their own scoped `@keyframes reveal` with different durations (1s vs 0.8s)
5. **EventIcon** atom uses `text-emerald-500`, `text-amber-500` — hardcoded colors
6. **ActivityFeed** uses `text-emerald-500`, `text-amber-500` for icons
7. **VoucherStatsCards** uses `text-emerald-500`, `text-amber-400`, `text-rose-400` for rates
8. **SessionReportButton** uses `text-emerald-500`, `text-rose-500`
9. **InstitutionCard** uses `text-amber-400`, `text-emerald-400`, `text-rose-300`, `text-red-400`
10. **LowStockAlert** uses `text-amber-*`, `bg-amber-*`, `border-amber-*` — extensive hardcoded amber palette
11. **SecuritySettings** uses `border-emerald-500/20 bg-emerald-500/5 text-emerald-500`

### Site Package Inconsistencies

- **Features.astro**: The `reveal-delay-${idx + 1}` interpolation produces class names like `reveal-delay-2`, `reveal-delay-3` — but `.reveal-delay-2` and `.reveal-delay-3` are only defined in Hero.astro's scoped CSS, Features won't see them. The element class `reveal` is global CSS though, so the base animation works.
- **Hero.astro + Problem.astro**: Both define `@keyframes reveal` with different durations. Astro scoping prevents collision, but it's still confusing and inconsistent.
- **Maintenance.astro**: Has its own `animate-float` keyframe duplicating the one in global.css
- **Missing SEO/accessibility on legal pages**: politica.astro and borrar-cuenta.astro don't use BaseLayout

### Affected Areas

#### apps/web
- `src/index.css` — Theme definition, dark mode, utility classes
- `src/components/atoms/Spinner.tsx` — Hardcoded color
- `src/components/atoms/Alert.tsx` — Hardcoded colors + missing role
- `src/components/atoms/StatusBadge.tsx` — Hardcoded colors (7 instances)
- `src/components/atoms/EventIcon.tsx` — Hardcoded colors
- `src/components/atoms/StatCard.tsx` — Duplicate component
- `src/components/atoms/Button.tsx` — Variant system
- `src/components/atoms/Select.tsx` — Select styling
- `src/components/atoms/Input.tsx` — Hardcoded colors (error state)
- `src/components/molecules/StatCard.tsx` — Duplicate component
- `src/components/molecules/PeriodSelector.tsx` — Select styling duplication
- `src/components/molecules/DashboardWidget.tsx` — Icon color prop
- `src/features/dashboard/**/*.tsx` — 90+ hardcoded color instances
- ALL components with Lucide icons — Missing `aria-hidden`

#### apps/site
- `src/styles/global.css` — Token duplication, missing Manrope font, no dark variant
- `src/layouts/BaseLayout.astro` — Missing Manrope preconnect
- `src/components/Features.astro` — Emoji icons, reveal delay gap
- `src/components/Hero.astro` — Scoped reveal animation
- `src/components/Problem.astro` — Scoped reveal animation
- `src/components/Maintenance.astro` — Duplicate keyframe
- `src/pages/politica.astro` — Standalone HTML, no design system
- `src/pages/borrar-cuenta.astro` — Standalone HTML, no design system
- `package.json` — Missing @akit/design-tokens dependency

#### packages/design-tokens
- `src/tokens.json` — Incomplete dark values, no scale tokens
- `build.js` — Only handles colors, no spacing/radius/etc

### Approaches

1. **Incremental — Layer by layer** — Fix one category at a time: tokens first, then replace hardcoded colors, then add scales, then unify components
   - Pros: Safe, testable at each step, low risk of regressions
   - Cons: Takes longer, may cause intermediate inconsistency
   - Effort: High (4-6 phases)

2. **Site-first unification** — Fix site package first (import tokens, add Manrope, fix legal pages), then tackle web
   - Pros: Site is smaller, faster wins, builds momentum
   - Cons: Leaves web inconsistent longer, tokens may need iteration before web phase
   - Effort: Medium (3-4 phases)

3. **Token-driven overhaul** — Complete the token system first (add spacing, radius, shadow, typography scales; fix dark values), then consume in both apps simultaneously
   - Pros: Single source of truth established first, both apps benefit together, cleanest result
   - Cons: Requires coordination across both packages, bigger upfront effort
   - Effort: High (but fewer phases than approach 1)

4. **Parallel tracks** — Fix site and web independently with shared token foundation
   - Pros: Fastest time-to-completion, teams can work independently
   - Cons: Risk of diverging implementations, requires tight token contract
   - Effort: Medium (parallel work streams)

### Recommendation

**Approach 3 (Token-driven overhaul)** with phasing:

1. **Phase 0 — Token foundation**: Extend `packages/design-tokens` to include spacing, radius, shadow, and typography scales. Fix incomplete dark values. Add `tertiary.dark`, `text.dark` variants.

2. **Phase 1 — Site integration**: Add `@akit/design-tokens` dependency to site. Replace site's `global.css` `@theme` block to import from tokens instead of redeclaring. Add Manrope font preconnect. Fix legal pages to use BaseLayout.

3. **Phase 2 — Web token consumption**: Replace `index.css` hardcoded dark overrides with token dark values. Add missing spacing/radius/size tokens to `@theme`. Remove duplicate utility classes with overlapping arbitrary values.

4. **Phase 3 — Hardcoded color cleanup**: Replace all 90+ `text-{color}-{shade}` / `border-{color}-{shade}` / `bg-{color}-{shade}` patterns with semantic token variables. Add `--color-action-success`, `--color-action-danger`, `--color-action-warning` tokens. Standardize status colors.

5. **Phase 4 — Component unification**: Consolidate duplicate StatCard components. Standardize select styling. Fix `role="alert"` and `aria-hidden` on all icons. Add `prefers-reduced-motion`.

6. **Phase 5 — Site reveal system cleanup**: Unify reveal animations. Remove duplicate keyframes. Fix `reveal-delay` class gaps.

### Risks

- **Scope creep**: 90+ hardcoded color instances across many feature files — replacing them all is tedious and must be done systematically, not ad-hoc
- **Dark mode regression**: The site has NO dark mode variant currently — if we add one, we must ensure dark-themed sections (Hero, HowItWorks, etc.) don't break
- **Design decisions needed**: No design spec exists — decisions about which semantic token names to use for status colors (success/error/warning) need to be made
- **Build chain**: Adding `@akit/design-tokens` as a dependency for site requires ensuring the build runs tokens first (similar to web's `prebuild` script)
- **Accessibility is NOT cosmetic**: `role="alert"` and `aria-hidden` changes affect assistive technology behavior — must verify after changes
- **Legal page risk**: politica.astro and borrar-cuenta.astro are for Google Play compliance — any styling changes must not break their regulatory compliance appearance

### Ready for Proposal
Yes — the investigation is complete and the findings are verified against the actual codebase.

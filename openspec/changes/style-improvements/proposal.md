# Proposal: Style Improvements — Web & Site

## Intent

Unify the design system across the entire monorepo. Currently `apps/web` and `apps/site` each redeclare colors with different names, use 90+ hardcoded Tailwind color values, lack spacing/radius/typography tokens, and have accessibility gaps. This change establishes a single token foundation and applies it consistently.

## Scope

### In Scope
- Token foundation: spacing, radius, shadow, typography scales + missing dark values
- Site token integration: add `@akit/design-tokens` dependency, remove redeclared colors
- Web dark mode: replace hardcoded `.dark` CSS overrides with token values
- Hardcoded color cleanup: replace 90+ `text-{color}-{shade}` / `bg-{color}-{shade}` instances with semantic tokens
- Component unification: merge duplicate StatCard, standardize Select styling
- Accessibility: `aria-hidden` on all Lucide icons, `role="alert"` on Alert, `prefers-reduced-motion`
- Site animation unification: single reveal system, remove duplicate keyframes

### Out of Scope
- Legal page redesign (politica, borrar-cuenta — Google Play compliance, deferred)
- Design system documentation site
- Visual redesign of component layout/structure

### Delivery Strategy
Split into 3 separate SDD changes (chained):
1. **style-tokens**: Token foundation (spacing, radius, shadow, typography scales + dark values)
2. **style-web**: Web token consumption, hardcoded color cleanup, component unification, accessibility
3. **style-site**: Site token integration, dark mode, Manrope font, animation unification

## Capabilities

### New Capabilities
- `design-tokens`: Token system spec — color, spacing, radius, shadow, typography scale definitions and CSS custom property naming
- `component-styles`: Semantic token usage contract — which tokens each UI component MUST use, status color conventions (success/error/warning)
- `accessibility-foundation`: Component-level accessibility rules — `aria-hidden`, `role="alert"`, `prefers-reduced-motion`

### Modified Capabilities
None — no existing style-related specs.

## Approach

Token-driven overhaul (Approach 3 from exploration). Phase-gated execution:

1. **Phase 0 — Token foundation**: Extend `packages/design-tokens` with spacing, radius, shadow, typography scales. Fix incomplete dark values.
2. **Phase 1 — Site integration**: Add token dependency, replace `global.css` redeclared colors, add Manrope font, fix animation inconsistencies.
3. **Phase 2 — Web token consumption**: Replace hardcoded `.dark` overrides, add scale tokens to `@theme`.
4. **Phase 3 — Hardcoded color cleanup**: Replace all 90+ instances with `--color-status-*` / `--color-app-*` tokens.
5. **Phase 4 — Component unification**: Consolidate StatCard, Select, Alert, accessibility items.
6. **Phase 5 — Verification**: Cross-app consistency check, build validation.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/design-tokens/src/tokens.json` | Modified | Add scale tokens, fix dark values |
| `packages/design-tokens/build.js` | Modified | Handle spacing/radius/shadow/typography output |
| `apps/web/src/index.css` | Modified | Remove hardcoded dark overrides, add scales |
| `apps/web/src/components/**/*.tsx` | Modified | 90+ hardcoded colors → semantic tokens |
| `apps/site/package.json` | Modified | Add @akit/design-tokens dependency |
| `apps/site/src/styles/global.css` | Modified | Use imported tokens, add dark variant |
| `apps/site/src/layouts/BaseLayout.astro` | Modified | Add Manrope preconnect |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Scope creep (90+ color instances) | High | Split into 3 independent changes |
| Dark mode regression on existing themed sections | Medium | Site dark mode included — test themed sections after migration |
| Legal page compliance break | Low | Deferred — not touched |
| Accessibility regression from role/aria changes | Low | Verify with testing in web change |
| Token naming inconsistency across changes | Low | Convention decided: `--color-status-*` |

## Rollback Plan

Per-phase rollback: each phase is a separate PR. Phase 0 revert by restoring `tokens.json` + `build.js`. Phases 1-5 revert by reverting their respective PR. Prior phases remain stable.

## Dependencies

- Design decisions: status token naming convention (`--color-status-*` vs `--color-action-*`)
- Build order: `packages/design-tokens` must build before `apps/site` (add prebuild script)

## Success Criteria

- [ ] All token values available as CSS custom properties in both apps
- [ ] Zero hardcoded Tailwind color classes in web components
- [ ] All Lucide icons have `aria-hidden="true"`
- [ ] Alert component uses `role="alert"`
- [ ] Site imports design tokens (verifiable by removing global.css color declarations)
- [ ] Manrope font loads correctly on site
- [ ] Single reveal animation system across all site components
- [ ] Both apps build without errors

# Tasks: Style Tokens Foundation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 60–90 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Token data + build pipeline + tests | Single PR | Additive change, low risk, ~60-90 lines |

## Phase 1: Test Infrastructure (RED)

- [x] 1.1 Create `packages/design-tokens/verify-tokens.cjs` — assertion script covering all 12 spec scenarios: multi-category output, spacing scale (1–20, no zero), radius values, shadow values, typography size/weight, status tokens, dark variants (tertiary.dark, text.*Dark), backward compatibility (old tokens preserved), superset check. Run after `build.js` — expect RED initially.

## Phase 2: Token Data (GREEN)

- [x] 2.1 Add `spacing`, `radius`, `shadow`, `typography` sections to `tokens.json` per design spec values
- [x] 2.2 Add `colors.status` (success/error/warning each with DEFAULT + dark), `colors.tertiary.dark`, `colors.text.primaryDark/secondaryDark`

## Phase 3: Build Pipeline (GREEN)

- [x] 3.1 Add `PREFIX_MAP` constant to `build.js`: map keys to prefixes (colors→--color-, spacing→--space-, radius→--radius-, shadow→--shadow-, typography.size→--text-, typography.weight→--font-)
- [x] 3.2 Generalize `flattenObject`: accept prefix param, iterate all top-level keys, preserve DEFAULT→empty/camelCase→kebab logic; emit ALL sections not just colors
- [x] 3.3 Run `node verify-tokens.cjs` — all assertions pass (GREEN)

## Phase 4: Verification

- [x] 4.1 Run `pnpm build` in design-tokens — confirm `dist/theme.css` contains all expected tokens
- [x] 4.2 Run `pnpm --filter web build` — verify no CSS resolution errors from updated theme.css

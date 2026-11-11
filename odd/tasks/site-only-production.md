# Site-only production promotion
Objective: isolate the current Site delivery from API/Web work and propose it to main, qa and dev through PRs. Baseline: origin/main 1234240; branch: release/site-only-main.
Delivery: single-pr per target, size exception explicitly authorized. Runner: node --test apps/site/tests/*.test.mjs; production-baseline pnpm install --frozen-lockfile and Site build.

## Specs
- S1: "compara la rama main que esta en produccion con la actual." Compare remote main with the complete local Site state, including untracked Site files.
- S2: "Hace los commit necesariso y desplegemos solo los cambios de site." Preserve unrelated local state; isolate Site without API/Web, shared-token or dependency upgrades. Deployment must remain pending until provider triggers and production variables are verified.
- S3: "Actualizemos tambien la rama qa y dev, todo mediante prs al remoto?" Open target-specific Site-only PRs, preserving each target's unrelated history. PR creation does not imply merge authorization.
- S4: "si autorizo" Authorizes the proposed size exception: one Site PR per target branch, commits separated by functional unit.

## Tasks
- T1 [S1,S2,S4] inline; completed; main 19222b2, qa bf10a29, dev da3f689. Route: one dependent Site delivery, no writer trigger. Risk: item 5 (production delivery).
- T2 [S2] inline plus per-action verification worker; source checks completed; 11/11 tests, lint, build and bounded independent recheck passed. Provider-setting proof unavailable; deployment remains pending.
- T3 [S3] inline; PR creation completed: main #100, qa #101, dev #102; integration/deployment pending provider configuration evidence. No merge or auto-merge.

## Log
- L1: Original request: "ok como podemos resolver esto. compara la rama main que esta en produccion con la actual. Hace los commit necesariso y desplegemos solo los cambios de site. Actualizemos tambien la rama qa y dev, todo mediante prs al remoto?"
- L2: User authorized existing SSH and GitHub CLI sessions for repository aki-software/aki-app-web; authentication subsequently verified. No Cloudflare/Railway session access authorized yet.
- L3: Remote main 1234240, dev 468f82c, qa 1a40897. Current source HEAD 8ef536d plus local Site changes. Preserve dirty source checkout and index. Main Site uses Astro 6; retain main package.json, lockfile and design tokens instead of copying current Astro 7 changes.
- L4: Production main commit has Cloudflare Site and Web successful checks plus Railway API deployment. Provider path filters are unverified; do not merge or trigger deployment before proving Site-only effects. QA repository workflow uses path filters on qa; main's older workflow listens to dev.
- L5: User accepted one PR per target with size exception. Forecast exceeds 400 authored changed lines, including legal-page additions. No artificial code compression or unrelated upgrades.
- L6: RDD is explicitly clone-local off. Do not enable it. Branch PR skill was not found in project/user skill directories; use git and GitHub CLI with existing repository policy.
- L7: Observed RED on production source with the current 8-case journey suite (exit 1), then GREEN 8/8 after copying Site source. Production package manifests, lockfile, Astro config and shared tokens are unchanged. Development environment examples were deliberately not copied.
- L8: Per-action worker observed frozen filtered install, token build, Site build, Site lint (0 diagnostics), tests (8/8), and protected-path diff check all pass. Smoke build used explicit public URLs; these are not provider-setting evidence. No production requests or email submissions were made.
- L9: Landing, navigation, localized contact and legal pages share their navigation/translation dependencies and existing test suite; keep this coherent delivery together under the approved size exception. Deployment remains blocked, not implicitly authorized by passing source checks.
- L10: Independent frozen-tree inspection reproduced two candidate regressions: configured /login URL became /login/login and /politica linked to missing /en/politica. Added executable frontmatter/route regression tests, observed RED, corrected both in one bounded batch. Preserve the existing /politica page while linking its English alternate to /en/privacidad.
- L11: Final own checks: 11/11 tests; Site lint 0 errors/warnings/hints; Astro production-baseline build generated 9 routes; whitespace check passed. Independent recheck of both original blockers passed (3/3 committed regression tests plus separate frontmatter probes). No full browser, live API/email, provider-config or production smoke test was run. No public CLI/parser changes, so CLI differential is not applicable. Legacy public HTML files predate this delivery and remain unchanged.
- L12: Full delivery exceeds 2,000 authored changed lines including legal copy/tests/docs; approved single-PR exception applies. Keep PRs draft and do not merge or enable auto-merge without provider isolation evidence. All API/Web/package/lock/config paths are unchanged.
- L13: QA candidate bf10a29 independently passed its own frozen install, token build, Site build, lint and 11 tests. Dev candidate da3f689 has identical Site/dependency/shared-token bytes to QA and independently passed 11 tests. QA/dev's existing Navbar conflict was resolved to the already-verified Site version; each target's unrelated history and configuration remain intact.
- L14: Pushed release/site-only-main, release/site-only-qa and release/site-only-dev. Draft PRs: https://github.com/aki-software/aki-app-web/pull/100 (main), https://github.com/aki-software/aki-app-web/pull/101 (qa), https://github.com/aki-software/aki-app-web/pull/102 (dev). All retain the deployment block and documented size exception.
- L15: Original checkout remains at 8ef536d with 113 status entries; no checkout, source/index modification, commit or stash was performed there. CLI testing scratch is outside the repository. Remaining decision: authorize read-only access to the intended Cloudflare and Railway accounts/sessions, or supply provider filter/build-setting evidence, before any integration/deployment.

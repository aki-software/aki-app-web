# Observability-only integration
Objective: reconstruct only approved T01–T07 local observability work from dev, integrate locally, and remove merged local branches.
Branch: feat/observability-clean-foundations -> feat/observability-clean-metrics -> dev. Delivery: local feature-branch chain; no remote operations authorized. Runner: pnpm.cmd --filter api test --runInBand, build, check-only lint.

## Specs
- S1: User accepted "rearmar la cadena para integrar solo observabilidad" with "perfecto acepto tu recomendacion". Exclude unrelated auth, Swagger, Site, and documentation restructuring commits; preserve approved T01–T07 behavior and its tests/docs.
- S2: User requested "apilar las ramas y hacer mergue a dev". Integrate only the reconstructed local chain into local dev after verification; do not fetch, push, open PRs, or deploy without separate authorization.
- S3: User requested "luego de la reconstrocion eliminemos las ramas fusionadas para no dejar ramas fantasmas". Delete only local branches proven merged into dev; do not delete unmerged original branches or remote branches.
- S4: Preserve pre-existing user work. The formerly uncommitted setup edits were committed by the user as 4ef1705 on the original branch; do not silently include or discard them.

## Tasks
- T1 -> S1,S4 | inline reconstructed T01; focused tests 3 suites/4 tests, API build 407 files, scoped ESLint pass; independent verifier found no blocker | committed cdd77ff.
- T2 -> S1,S4 | inline reconstructed T02; focused tests 4 suites/18 tests, API build 410 files, scoped ESLint pass; independent verifier passed including concurrent ALS isolation | commit pending.
- T3 -> S1,S2 | inline verification of rebuilt candidate, independent check for high-risk items, local dev integration | pending.
- T4 -> S3,S4 | inline proof of merged ancestry and deletion of only merged local branches | pending.

## Log
- L1 2026-10-27: User: "perfecto acepto tu recomendacion, luego de la reconstrocion eliminemos las ramas fusionadas para no dejar ramas fantasmas". Prior request: "retoma nuevamente. Tenemso que que apilar las ramas y hacer mergue a dev<'".
- L2 2026-10-27: Source feature documents: odd/tasks/observability-foundations.md and odd/tasks/observability-local-metrics.md on the original branch. Both were reconciled with Engram mirrors. Original source commits are bd64d17, 8bd1d0e, d557a62, 3a8bb1d, a194715, e0cf23f, d7c4bea, and c383de0. Existing unrelated ancestry prevents wholesale replay.
- L3 2026-10-27: Clean worktree created from local dev 35a8de6. Original branch remains at 4ef1705 and clean; its setup edits are user-authored. The baseline predates documentation restructuring, so docs must be adapted without importing unrelated history. No remote operation performed.
- L4 2026-10-28: T01 privacy-safe logging reconstructed on the dev baseline. The partial api-guide path from the old branch was excluded; relevant logging guidance was adapted into docs/api.md. Focused tests passed 3 suites/4 tests, API build compiled 407 files, and scoped check-only ESLint passed. Independent review confirmed omission of supplied IDs is intentional: the original T01 tests assert no customer/report IDs in logs; T02 adds validated request_id separately. Commit cdd77ff; commit-hook lint passed with zero errors and 1,612 existing warnings.
- L5 2026-10-28: T02 adds validated `x-request-id` generation/echo via AsyncLocalStorage, distinct from authorization context, with CORS allow/expose headers. Four focused suites/18 tests, SWC build (410 files), check-only scoped ESLint, and independent verification passed, including concurrent request isolation. Relevant architecture guidance was adapted into docs/api.md because docs/01-architecture/overview.md does not exist on the dev baseline.

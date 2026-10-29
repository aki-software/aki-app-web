# Local observability MVP
Objective: complete a private, reproducible local observability workflow for API and workers, with no external telemetry export.
Branch: `feat/observability-local-mvp` from `dev`. Delivery: local feature-branch chain; PR/push/merge not authorized. Runner: `pnpm.cmd --filter api exec jest --runInBand`, `pnpm.cmd --filter api build`, and Docker Compose validation when available.

## Specs

- S1: The user replied `si` to the proposed local MVP scope: repair readiness routing and metrics startup, provide a disposable local dashboard, complete actionable alert/runbook guidance, and prove privacy and fail-open behavior end to end.
- S2: Keep telemetry local only; do not configure external collectors, accounts, exports, deployment changes, or production telemetry.
- S3: Preserve bounded metric labels and ensure the metrics listener/dashboard are not exposed beyond explicitly loopback-bound local UI ports or a private internal container network.
- S4: Preserve existing API behavior except to correct the observed readiness-route mismatch and prevent partial API startup when opt-in local metrics cannot bind.
- S5: Update the operational observability documentation and project status with reproducible local startup, checks, teardown, alert meaning, and rollback.

## Tasks

- T1 -> S3,S4 | inline | complete | RED reproduced: `/health/ready` returned 404; regression coverage also pins both documented aliases and rejects double-prefix routes. GREEN: readiness routing and listener startup are atomic; focused verification 3 suites/8 tests, API build 423 files, scoped ESLint 0 errors/10 warnings. Risk: items 3 and 5 (route contract and partial startup).
- T2 -> S2,S3 | inline | pending | Build an opt-in Docker Compose local dashboard/scrape stack with API metrics reachable only over a private container network; add dashboard and alert rules; Risk: item 5 (container networking and local operational configuration).
- T3 -> S1,S5 | inline | pending | Document runbook, local alert response, startup/teardown/rollback; update status; verify privacy labels and fail-open behavior through supported local interfaces; Risk: item 6 (privacy and failure behavior require explicit test coverage).

## Log

- L1 2026-10-29: User confirmed the local-only observability MVP scope with `si`; no external telemetry export is authorized.
- L2 2026-10-29: Current dev already includes T01-T07 instrumentation and local metrics. The prior tracker is complete; this feature tracks only the agreed MVP closure. Docker Compose currently has PostgreSQL, Redis, Jaeger, and SeaweedFS, but no API, Prometheus, or Grafana service. The metrics listener currently binds loopback, while API bootstrap starts its HTTP listener before the metrics listener; preserve loopback safety and make startup atomic.
- L3 2026-10-29: Current feature-branch chain strategy is reused. No push, PR, merge, QA/production credentials, or external telemetry destination is authorized.
- L4 2026-10-29: T1 repaired global-prefix exclusions so `/health`, `/health/ready`, `/api/v1/health`, and `/api/v1/health/ready` remain valid without duplicated prefixes. Local metrics now bind before the API listener; if either listener fails, startup does not leave the other partially available. Focused tests and API build passed; scoped ESLint has zero errors and ten warnings. The full suite and independent feature-end verification remain pending.

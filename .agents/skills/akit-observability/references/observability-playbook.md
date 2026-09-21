# A.kit Observability Playbook

## Objective

Make the platform diagnosable across API, workers, Web, Site, PostgreSQL, Redis, BullMQ, Puppeteer, R2, email, payments, and external providers.

Observability has three signals:

- Logs explain individual events.
- Metrics show aggregated behavior over time.
- Traces show the path and timing of a request or job.

OpenTelemetry is the instrumentation and transport boundary, not the storage UI. Use OTLP so the backend can change without rewriting application code.

## Repository Baseline

Verify these facts against the current tree before relying on them:

- `apps/api` uses `nestjs-pino`, Nest `Logger`, a request logger middleware, and a global exception filter.
- Request logs generate or accept `x-request-id`, but correlation must be checked across responses, downstream calls, and workers.
- `apps/api/src/common/adapters/bullmq-queue.adapter.ts` exposes failed-job counts and has an in-memory fallback that must not silently serve production.
- `apps/api/src/health.controller.ts` exposes `/health` and `/api/v1/health`; separate liveness and readiness if operationally justified.
- `infra/docker/docker-compose.yml` includes local Jaeger; inspect whether Collector, metrics, and log backends are present.
- `feat/observability-opentelemetry` is historical work. Audit its `tracing.ts`, Collector config, dependency versions, tests, startup order, shutdown, exporters, and privacy behavior before reuse.
- The project has confirmed operational risks around stale reports in `STORAGE_PENDING`, R2 diagnostics, payments, queues, and resilience.

## Target Stages

### Local Docker

Validate all signals locally. Use an OpenTelemetry Collector plus trace, metrics, logs, and dashboard backends. Jaeger is acceptable for local traces. Keep the local stack reproducible and document ports, startup, generated test traffic, and teardown.

### Grafana Cloud Free

Use OTLP for QA and production. Separate environments with `deployment.environment`, `service.name`, and `service.version`; use separate stacks when account capabilities and data isolation require it. Store endpoints and credentials outside Git. Verify current quotas and pricing before committing to limits.

### Paid Tier

Upgrade only after measuring ingestion, retention, alerting, and query needs. Control cost with sampling, short retention, low-cardinality labels, log levels, filtering, and volume alerts.

## Required Instrumentation

- Initialize Node OpenTelemetry before NestJS bootstraps.
- Prefer auto-instrumentation for HTTP, PostgreSQL, and Redis.
- Instrument BullMQ so trace context survives dispatch and processing.
- Configure structured Pino fields instead of JSON strings embedded in messages.
- Include `request_id`, `trace_id`, `span_id`, `service.name`, `service.version`, and `deployment.environment` where relevant.
- Add technical metrics for request rate, errors, latency, DB, Redis, queues, jobs, PDF, R2, email, and payment providers.
- Add domain metrics for report lifecycle, payment settlement, webhook outcomes, and job failures without PII labels.
- Add Web telemetry only through a safe public ingestion path; never ship private OTLP credentials in `VITE_*` or `PUBLIC_*`.

## Privacy and Reliability

Never emit JWTs, passwords, payment tokens, raw webhook payloads, credentials, clinical data, or unnecessary emails. Do not use user IDs, session IDs, or full URLs as metric labels. Telemetry export must be non-blocking: an unavailable backend must not make business requests fail. Add redaction and failure-mode tests.

## Initial Alerts

Cover API availability, 5xx rate, p95 latency, PostgreSQL, Redis, queue growth, failed jobs, `STORAGE_PENDING` age, R2 failures, PDF failures, webhook anomalies, payment fulfillment gaps, and missing telemetry. Every alert needs severity, owner, threshold, recovery condition, and a local runbook.

## Verification

Run the repository's frozen install, lint, tests, and build. Then prove locally that an HTTP request, database operation, Redis operation, BullMQ job, controlled exception, and R2/report failure produce correlated and redacted telemetry. Record dashboards, alerts, costs, limits, and rollback behavior.

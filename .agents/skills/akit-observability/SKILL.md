---
name: akit-observability
description: "Trigger: observabilidad, OpenTelemetry, OTel, trazas, métricas, logs, Jaeger, Grafana Cloud, BullMQ telemetry, alertas. Investiga e implementa observabilidad agnóstica en A.kit Platform."
license: Apache-2.0
metadata:
  author: "akit-platform-maintainers"
  version: "1.0"
---

## Activation Contract

Load this skill when investigating, designing, reviewing, or implementing observability for the API, workers, Web, Site, Docker, or operations.

## Hard Rules

- Read the repository continuity docs and this skill's reference before editing.
- Verify the current tree and audit `feat/observability-opentelemetry`; never merge it blindly.
- Use OpenTelemetry and OTLP as provider-neutral boundaries.
- Validate the complete stack locally in Docker before configuring Grafana Cloud Free for QA and production.
- Never emit secrets, tokens, raw webhook bodies, credentials, clinical data, or unnecessary PII.
- Correlate structured logs with `request_id`, `trace_id`, and `span_id`; instrument HTTP, PostgreSQL, Redis, and BullMQ where applicable.
- Keep telemetry failure non-blocking for business traffic and control sampling, retention, cardinality, and cost.
- Do not add dependencies or modify `pnpm-lock.yaml` manually without orchestrator coordination.
- Update operational documentation, runbooks, environment contracts, and project status with architectural changes.

## Decision Gates

| Need | Decision |
|---|---|
| Local validation | Docker stack with Collector plus trace, metric, log, and dashboard backends |
| QA/production backend | Grafana Cloud Free through OTLP; paid tier only after measured usage |
| Error tracking | Add Sentry only if its error/frontend value justifies a second backend |
| Collector placement | Local first; production direct OTLP unless filtering, retry, or routing requires a Collector |

## Execution Steps

1. Audit current logs, health, queues, workers, dependencies, Docker, docs, and historical OTel work.
2. Produce proposal, design, tasks, privacy policy, cost limits, dashboards, alerts, and runbooks.
3. Implement in small verifiable slices: structured logs, context propagation, traces, metrics, BullMQ, local Docker, Cloud QA, alerts, and frontend telemetry.
4. Verify with tests, local telemetry evidence, redaction checks, failure-mode tests, and documentation review.

## Output Contract

Return facts, gaps, decisions, files changed, dependencies, tests, telemetry evidence, costs, risks, rollback, and remaining approvals.

## References

- `references/observability-playbook.md`
- `docs/README.md`
- `docs/project-status.md`
- `docs/refactor/README.md`
- `docs/deployment-environment.md`
- `docs/operations/incidents.md`
- `.agents/skills/akit-git-worktree/SKILL.md`

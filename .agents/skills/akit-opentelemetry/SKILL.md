---
name: akit-opentelemetry
description: >
  Implementation patterns for OpenTelemetry (OTel) observability in the A.kit platform.
  Trigger: When implementing tracing, metrics, logging, or OpenTelemetry in NestJS or React.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Adding OpenTelemetry to the NestJS backend.
- Instrumenting BullMQ background jobs.
- Adding web tracing to the React/Vite frontend.
- Configuring Grafana Cloud OTLP exporters.

## Critical Patterns

- **No Self-Hosting:** Always target an OTLP-compatible SaaS (e.g., Grafana Cloud) via environment variables (`OTEL_EXPORTER_OTLP_ENDPOINT`).
- **Backend (NestJS):** Initialize the OTel SDK *before* NestJS boots. Do not use generic interceptors for tracing; rely on `@opentelemetry/auto-instrumentations-node` for native integration with `pg`, `ioredis`, and HTTP.
- **Log Correlation:** Inject `trace_id` and `span_id` into the existing `pino` logger configuration so logs and traces are linked automatically.
- **Background Jobs:** Always use `opentelemetry-instrumentation-bullmq` to prevent trace breakage between the HTTP request and the background worker.
- **Frontend (React):** Use `@opentelemetry/sdk-trace-web` and `@opentelemetry/instrumentation-fetch`. Ensure W3C `traceparent` headers are sent to the backend domain to connect frontend clicks with backend queries.

## Code Examples

### Backend OTel Initialization (`tracing.ts`)

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BullMQInstrumentation } from 'opentelemetry-instrumentation-bullmq';

// Grafana Cloud OTLP endpoint (or similar)
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  headers: {
    Authorization: `Basic ${process.env.OTEL_EXPORTER_OTLP_HEADERS_AUTH}`,
  },
});

export const otelSDK = new NodeSDK({
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations(),
    new BullMQInstrumentation(),
  ],
});

// IMPORTANT: This must be called before bootstrapping NestJS (e.g. before NestFactory.create)
// otelSDK.start();
```

## Commands

```bash
# Backend dependencies (run in apps/api)
pnpm add @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http opentelemetry-instrumentation-bullmq

# Frontend dependencies (run in apps/web)
pnpm add @opentelemetry/sdk-trace-web @opentelemetry/instrumentation-fetch @opentelemetry/instrumentation-document-load @opentelemetry/context-zone
```

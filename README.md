# A.KI Platform Monorepo

Monorepo that hosts the backend APIs, web admin portal, and worker for generating/sending session reports.

## Layout

- `apps/api`: pnpm + TypeScript + Express + Prisma backend exposing the endpoints Android already uses.
- `apps/web`: (placeholder) future admin UX (to be added).
- `apps/worker`: background job runner for report generation and sending via SMTP/SendGrid.
- `packages/contracts`: shared OpenAPI/Zod contracts for the mobile app and web.
- `infra/docker`: PostgreSQL, Redis, MailHog to run everything locally.

## Job processing

- Retries: email/report/pdf jobs enqueue with defaults of 3 attempts and exponential backoff starting at 60s.
- Recommended worker concurrency: PDF generation 2-4, mail sending 5-10.
- Puppeteer load: PDF concurrency above 4 can spike CPU/RAM and destabilize workers.

## Observability

- Structured logs: job dispatch includes jobId/sessionId/voucherId when available.
- TODO: add a metrics service (counter/gauge) and wire job dispatch duration counters.

## Manual testing checklist

- Enqueue voucher email and confirm logs show jobId/voucherId and job-duration for email.
- Trigger account activation email and confirm job-dispatch + job-duration logs.
- Send report (queued and inline paths) and verify job-dispatch + job-duration logs include sessionId.
- Generate a report PDF and confirm job-duration logged for pdf.

## Suggested automated tests

- JobDispatcherService logs job-dispatch and job-duration with identifiers for email/report.
- JobDispatcherService tracks duration for pdf/mail/report paths.
- Queue enqueue payloads include jobId and identifiers where available.

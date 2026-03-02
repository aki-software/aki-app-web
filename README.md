# A.KI Platform Monorepo

Monorepo that hosts the backend APIs, web admin portal, and worker for generating/sending session reports.

## Layout

- `apps/api`: pnpm + TypeScript + Express + Prisma backend exposing the endpoints Android already uses.
- `apps/web`: (placeholder) future admin UX (to be added).
- `apps/worker`: background job runner for report generation and sending via SMTP/SendGrid.
- `packages/contracts`: shared OpenAPI/Zod contracts for the mobile app and web.
- `infra/docker`: PostgreSQL, Redis, MailHog to run everything locally.

# Site-only release

This delivery updates the professional landing, access-request form, bilingual navigation and legal pages. It does not update API, Web, shared design tokens, package manifests or the lockfile.

## Validation

Run from the repository root:

```sh
pnpm --filter @akit/site... install --frozen-lockfile --ignore-scripts
pnpm --filter @akit/design-tokens build
node --test apps/site/tests/*.test.mjs
pnpm --filter @akit/site lint
pnpm --filter @akit/site build
```

Set `PUBLIC_WEB_URL`, `PUBLIC_API_URL` (or `PUBLIC_FORM_ENDPOINT`) and `PUBLIC_MAINTENANCE_MODE` for the intended environment **before building**. Public URLs are compiled into the static output. Do not copy development `.env` values into a production build. The existing production dependency versions are deliberately retained.

The form supplies a nonempty institution value for independent practice and sends `name`, `email`, `institution` and `selected_plan`. The controller and DTO at production baseline `1234240` accept these fields. This source-level check does not prove production CORS, email delivery or live configuration; verify those separately without submitting real requests unexpectedly.

## Promotion boundaries

- Open isolated PRs against `main`, `qa` and `dev`; do not merge unrelated branch history.
- Source changes belong only to Site, with the task log as delivery documentation.
- A Site-only Git diff does not prove a Site-only deployment. Confirm Cloudflare Site/Web build filters and Railway API deployment filters before merging or enabling auto-merge. Production baseline checks show all three integrations attached to `main`.
- Keep the production PR in draft until those filters and Site build variables are confirmed.
- The QA workflow at the QA/dev baseline detects `apps/site/**` independently, but each provider's own Git integration must also be checked.

## Rollback

Revert the Site delivery commit on the affected target through a PR and redeploy only Site after checking provider triggers. No database migration or API/Web rollback is part of this delivery. Reverting source does not restore provider configuration or environment variables.

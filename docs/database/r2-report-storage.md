# R2 report storage namespaces

The API stores generated reports in the configured private R2 bucket.

Set `REPORT_STORAGE_PREFIX` per environment when QA and production share a bucket:

```env
# QA
REPORT_STORAGE_PREFIX=qa

# Production
REPORT_STORAGE_PREFIX=prod
```

New objects use:

```text
<REPORT_STORAGE_PREFIX>/reports/<sessionId>/v<version>.pdf
```

When the variable is empty or unset, the legacy key format remains:

```text
reports/<sessionId>/v<version>.pdf
```

Existing reports keep working because email delivery and authenticated downloads use the persisted `reports.object_key` first. Do not make the bucket public; access remains API-authenticated.
